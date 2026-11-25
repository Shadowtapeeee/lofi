#!/usr/bin/env node
'use strict';

// Lo-fi 2.0.0 — Telegram-бот и сервер Mini App в одном файле. Запуск: node bot.js
//
// Файл собран командой «node scripts/build.js» из исходников:
//   src/     — сервер, каталог SoundCloud, «Моя волна», караоке, кеш треков, бот и админ-панель;
//   public/  — Mini App (HTML, CSS, ES-модули, иконки, шрифт Manrope под SIL OFL 1.1, обложка).
// Правки вносите в исходники и пересобирайте: этот файл перезаписывается при сборке.

const __path = require('node:path');

// ── встроенные файлы Mini App ──
const __text = {
  "/app.css": "/* Lo-fi — дизайн-система и интерфейс Mini App.\n   Сетка 4 px, шкала шрифта 1.2, большие скругления, стекло и мягкие тени. */\n\n@font-face { font-family: Manrope; src: url(/fonts/manrope-cyrillic.woff2) format(\"woff2\"); font-weight: 400 800; font-display: swap; unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116; }\n@font-face { font-family: Manrope; src: url(/fonts/manrope-latin.woff2) format(\"woff2\"); font-weight: 400 800; font-display: swap; unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }\n\n/* ── токены ── */\n:root {\n  --font: Manrope, ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif;\n  --scale: 1;\n  --fs-xs: calc(11px * var(--scale)); --fs-s: calc(12.5px * var(--scale)); --fs-m: calc(14px * var(--scale));\n  --fs-l: calc(15.5px * var(--scale)); --fs-xl: calc(19px * var(--scale)); --fs-2xl: calc(23px * var(--scale));\n  --fs-3xl: calc(clamp(28px, 3.4vw, 40px) * var(--scale)); --fs-hero: calc(clamp(46px, 7vw, 104px) * var(--scale));\n  --r-s: 10px; --r-m: 14px; --r-l: 20px; --r-xl: 26px; --r-2xl: 32px;\n  --gutter: clamp(16px, 3vw, 40px);\n  --rail-w: 0px; --tab-h: 60px; --dock-h: 64px;\n  --ease-out: cubic-bezier(.16, 1, .3, 1); --ease-in: cubic-bezier(.55, 0, .75, .2); --ease: cubic-bezier(.4, 0, .2, 1);\n  --spring: cubic-bezier(.34, 1.45, .64, 1);\n  --blur: 26px;\n  --safe-t: max(env(safe-area-inset-top), var(--tg-t, 0px)); --safe-b: max(env(safe-area-inset-bottom), var(--tg-b, 0px));\n  --safe-l: max(env(safe-area-inset-left), var(--tg-l, 0px)); --safe-r: max(env(safe-area-inset-right), var(--tg-r, 0px));\n  --tint: 160 160 170;\n}\n[data-scale=\"s\"] { --scale: .93; } [data-scale=\"l\"] { --scale: 1.08; }\n\n[data-theme=\"dark\"] {\n  color-scheme: dark;\n  --bg: #050506; --bg-rgb: 5 5 6; --bg-2: #09090b;\n  --surface: #0f0f12; --surface-2: #17171b; --surface-3: #222228; --seg-on: #2a2a31;\n  --line: rgb(255 255 255 / .065); --line-2: rgb(255 255 255 / .12);\n  --fg: #f5f5f7; --fg-rgb: 245 245 247; --fg-2: #b6b6bf; --fg-3: #80808a; --fg-4: #4f4f58;\n  --accent: #f5f5f7; --on-accent: #050506;\n  --glass: rgb(16 16 20 / .62); --glass-strong: rgb(14 14 18 / .84); --glass-border: rgb(255 255 255 / .075);\n  --hover: rgb(255 255 255 / .05); --press: rgb(255 255 255 / .09);\n  --track: rgb(255 255 255 / .13); --track-2: rgb(255 255 255 / .2);\n  --sk: #121215; --sk-hi: #1b1b20;\n  --shadow-1: 0 1px 2px rgb(0 0 0 / .4), 0 10px 30px -14px rgb(0 0 0 / .7);\n  --shadow-2: 0 24px 64px -22px rgb(0 0 0 / .85), 0 2px 6px rgb(0 0 0 / .35);\n  --danger: #ff6b6b;\n}\n[data-theme=\"light\"] {\n  color-scheme: light;\n  --bg: #f4f4f2; --bg-rgb: 244 244 242; --bg-2: #efefec;\n  --surface: #ffffff; --surface-2: #ebebe8; --surface-3: #e0e0dc; --seg-on: #ffffff;\n  --line: rgb(0 0 0 / .07); --line-2: rgb(0 0 0 / .13);\n  --fg: #0b0b0d; --fg-rgb: 11 11 13; --fg-2: #4b4b53; --fg-3: #7a7a82; --fg-4: #b3b3b9;\n  --accent: #0b0b0d; --on-accent: #ffffff;\n  --glass: rgb(255 255 255 / .66); --glass-strong: rgb(250 250 248 / .88); --glass-border: rgb(0 0 0 / .06);\n  --hover: rgb(0 0 0 / .045); --press: rgb(0 0 0 / .08);\n  --track: rgb(0 0 0 / .12); --track-2: rgb(0 0 0 / .2);\n  --sk: #e8e8e5; --sk-hi: #f3f3f1;\n  --shadow-1: 0 1px 2px rgb(0 0 0 / .05), 0 12px 32px -16px rgb(0 0 0 / .2);\n  --shadow-2: 0 30px 70px -26px rgb(0 0 0 / .3), 0 2px 8px rgb(0 0 0 / .06);\n  --danger: #d93c3c;\n}\n\n/* ── основа ── */\n*, *::before, *::after { box-sizing: border-box; }\nhtml { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; background: var(--bg); scrollbar-gutter: stable; }\nbody {\n  margin: 0; min-height: 100dvh; font-family: var(--font); font-size: var(--fs-m); line-height: 1.45; font-weight: 500;\n  background: var(--bg); color: var(--fg); -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;\n  font-feature-settings: \"ss01\", \"cv11\"; overflow-x: hidden;\n}\nh1, h2, h3, p { margin: 0; }\nh1, h2, h3 { font-weight: 800; letter-spacing: -.035em; line-height: 1.1; }\na { color: inherit; text-decoration: none; }\nbutton, input { font: inherit; color: inherit; }\nbutton { background: none; border: 0; padding: 0; cursor: pointer; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }\nbutton:disabled { cursor: default; opacity: .4; }\nimg { display: block; }\n:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }\n::selection { background: rgb(var(--fg-rgb) / .2); }\n.i { width: 22px; height: 22px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }\n.muted { color: var(--fg-3); }\n.spacer { flex: 1; }\n.noscript { padding: 40px; text-align: center; }\n.widget-slot { position: fixed; width: 1px; height: 1px; overflow: hidden; opacity: 0; pointer-events: none; left: -10px; bottom: 0; }\n.widget-slot iframe { width: 300px; height: 160px; border: 0; }\n[hidden] { display: none !important; }\n\n.glass { background: var(--glass); border: 1px solid var(--glass-border); -webkit-backdrop-filter: blur(var(--blur)) saturate(1.7); backdrop-filter: blur(var(--blur)) saturate(1.7); }\n[data-glass=\"off\"] .glass { background: var(--surface); -webkit-backdrop-filter: none; backdrop-filter: none; }\n.theme-fade, .theme-fade * { transition: background-color .45s var(--ease), color .45s var(--ease), border-color .45s var(--ease) !important; }\n\n/* ── каркас ── */\n.app { min-height: 100dvh; }\n.stage { min-width: 0; padding-bottom: calc(var(--tab-h) + var(--dock-h) + var(--safe-b) + 36px); }\n.view { width: 100%; max-width: 1480px; margin: 0 auto; padding: 4px calc(var(--gutter) + var(--safe-r)) 0 calc(var(--gutter) + var(--safe-l)); min-height: 60vh; outline: none; }\n.rail { display: none; }\n\n.topbar {\n  position: sticky; top: 0; z-index: 30; display: flex; align-items: center; gap: 12px;\n  padding: calc(var(--safe-t) + 10px) calc(var(--gutter) + var(--safe-r)) 10px calc(var(--gutter) + var(--safe-l));\n  transition: background-color .3s, border-color .3s, -webkit-backdrop-filter .3s, backdrop-filter .3s; border-bottom: 1px solid transparent;\n}\n[data-scrolled=\"true\"] .topbar { background: var(--glass); border-bottom-color: var(--line); -webkit-backdrop-filter: blur(var(--blur)) saturate(1.7); backdrop-filter: blur(var(--blur)) saturate(1.7); }\n[data-glass=\"off\"][data-scrolled=\"true\"] .topbar { background: var(--bg); }\n.topbar-nav { display: flex; align-items: center; gap: 4px; min-width: 0; }\n.topbar-nav [data-action=\"history-back\"] { display: none; }\n[data-can-back=\"true\"][data-page=\"detail\"] .topbar-nav [data-action=\"history-back\"] { display: grid; }\n[data-telegram=\"true\"] .topbar-nav [data-action=\"history-back\"] { display: none; }\n.topbar-actions { margin-left: auto; display: flex; gap: 4px; }\n\n.brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 19px; letter-spacing: -.045em; }\n.brand-mark { width: 34px; height: 34px; border-radius: 11px; background: var(--fg); color: var(--bg); display: grid; place-items: center; flex: none; transition: transform .4s var(--spring); }\n.brand-mark .i { width: 24px; height: 24px; stroke-width: 1.8; }\n.brand:hover .brand-mark { transform: rotate(-8deg); }\n\n.searchbar {\n  display: none; flex: 1; align-items: center; gap: 10px; height: 46px; padding: 0 6px 0 16px; border-radius: 999px;\n  background: var(--surface-2); border: 1px solid transparent; transition: background-color .25s, border-color .25s, box-shadow .25s; max-width: 560px;\n}\n.searchbar:focus-within { background: var(--surface); border-color: var(--line-2); box-shadow: var(--shadow-1); }\n.searchbar .i { color: var(--fg-3); width: 20px; height: 20px; }\n.searchbar input { flex: 1; min-width: 0; height: 100%; border: 0; outline: 0; background: none; font-size: var(--fs-m); font-weight: 600; }\n.searchbar input::placeholder { color: var(--fg-3); font-weight: 500; }\n.searchbar input::-webkit-search-cancel-button { display: none; }\n.searchbar kbd { font: 600 11px var(--font); color: var(--fg-3); border: 1px solid var(--line-2); border-radius: 6px; padding: 1px 7px; margin-right: 8px; }\n.searchbar input:not(:placeholder-shown) ~ kbd { display: none; }\n[data-page=\"search\"] .searchbar { display: flex; }\n[data-page=\"search\"] .topbar .brand.compact { display: none; }\n\n/* ── нижняя навигация (телефон) ── */\n.tabbar {\n  position: fixed; z-index: 50; left: 0; right: 0; bottom: 0; height: calc(var(--tab-h) + var(--safe-b));\n  padding: 0 var(--safe-r) var(--safe-b) var(--safe-l); display: grid; grid-template-columns: repeat(4, 1fr);\n  border-width: 1px 0 0; border-radius: 0;\n}\n.tab { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; color: var(--fg-3); font-size: 10.5px; font-weight: 700; letter-spacing: .01em; transition: color .25s; -webkit-tap-highlight-color: transparent; }\n.tab::before { content: \"\"; position: absolute; top: 7px; width: 54px; height: 30px; border-radius: 999px; background: var(--surface-3); transform: scale(.5); opacity: 0; transition: transform .35s var(--spring), opacity .2s; }\n.tab .i { position: relative; width: 23px; height: 23px; }\n.tab span { position: relative; }\n.tab.is-active { color: var(--fg); }\n.tab.is-active::before { transform: none; opacity: 1; }\n.tab:active .i { transform: scale(.9); }\n\n/* ── мини-плеер ── */\n.dock {\n  position: fixed; z-index: 48; left: calc(8px + var(--safe-l)); right: calc(8px + var(--safe-r)); bottom: calc(var(--tab-h) + var(--safe-b) + 8px);\n  height: var(--dock-h); border-radius: 20px; display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: \"now controls\";\n  align-items: center; gap: 6px; padding: 7px 8px 7px 7px; box-shadow: var(--shadow-2); background: var(--glass-strong);\n  transition: transform .45s var(--ease-out), opacity .3s; overflow: hidden;\n}\n[data-tinted=\"true\"][data-theme=\"dark\"] .dock { background: color-mix(in srgb, rgb(var(--tint-avg, var(--tint))) 14%, var(--glass-strong)); }\n.dock[data-empty=\"true\"] { transform: translateY(24px); opacity: 0; pointer-events: none; }\n.dock-now { grid-area: now; display: flex; align-items: center; gap: 12px; min-width: 0; text-align: left; height: 100%; border-radius: 14px; }\n.dock-cover { width: 48px; height: 48px; border-radius: 12px; flex: none; }\n.dock-meta { display: grid; min-width: 0; }\n.dock-meta strong, .dock-meta small { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.dock-meta strong { font-size: var(--fs-m); font-weight: 700; letter-spacing: -.01em; }\n.dock-meta small { font-size: var(--fs-s); color: var(--fg-3); font-weight: 600; }\n.dock.track-in .dock-meta, .dock.track-in .dock-cover { animation: track-in .5s var(--ease-out); }\n.dock-controls { grid-area: controls; display: flex; align-items: center; gap: 2px; }\n.dock-progress { position: absolute; left: 16px; right: 16px; bottom: 0; height: 2px; border-radius: 2px; background: var(--track); overflow: hidden; }\n.dock-progress i { position: absolute; inset: 0; background: var(--fg); transform-origin: left; transform: scaleX(var(--progress, 0)); }\n.dock-timeline, .dock-extra { display: none; }\n.wide-only { display: none; }\n\n/* ── кнопки ── */\n.btn {\n  position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 44px; padding: 0 18px;\n  border-radius: 999px; font-weight: 700; font-size: var(--fs-m); letter-spacing: -.005em; white-space: nowrap;\n  transition: transform .3s var(--spring), background-color .2s, color .2s, opacity .2s; user-select: none;\n}\n.btn .i { width: 20px; height: 20px; }\n.btn:active:not(:disabled) { transform: scale(.95); }\n.btn.primary { background: var(--accent); color: var(--on-accent); }\n.btn.primary:hover { background: color-mix(in srgb, var(--accent) 88%, var(--bg)); }\n.btn.glass:hover { background: var(--surface-3); }\n.btn.ghost { background: transparent; }\n.btn.ghost:hover { background: var(--hover); }\n.btn.lg { height: 54px; padding: 0 26px; font-size: var(--fs-l); }\n.btn.round { width: 44px; padding: 0; }\n.btn.round.lg { width: 54px; }\n.btn.sm { height: 34px; padding: 0 12px; font-size: var(--fs-s); gap: 6px; }\n.btn.sm .i { width: 18px; height: 18px; }\n.btn.danger { color: var(--danger); }\n.btn .spinner { position: absolute; left: 16px; opacity: 0; }\n.btn.is-loading > .i { opacity: 0; }\n.btn.is-loading .spinner { opacity: 1; }\n\n.icon-btn { position: relative; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; color: var(--fg-2); transition: color .2s, background-color .2s, transform .3s var(--spring); flex: none; }\n.icon-btn:hover:not(:disabled) { color: var(--fg); background: var(--hover); }\n.icon-btn:active:not(:disabled) { transform: scale(.88); }\n.icon-btn.sm { width: 32px; height: 32px; }\n.icon-btn.sm .i { width: 18px; height: 18px; }\n.icon-btn.lg { width: 52px; height: 52px; }\n.icon-btn.lg .i { width: 30px; height: 30px; }\n.icon-btn.glass { color: var(--fg); }\n.icon-btn[aria-pressed=\"true\"] { color: var(--fg); }\n.icon-btn[aria-pressed=\"true\"]::after { content: \"\"; position: absolute; bottom: 3px; width: 4px; height: 4px; border-radius: 50%; background: currentColor; }\n.icon-btn.is-on { color: var(--fg); }\n.icon-btn.pop .i { animation: pop .45s var(--spring); }\n.dock-like.is-on, .pl-like.is-on, .row-like.is-on { color: var(--fg); }\n\n.play-btn { position: relative; width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; background: var(--accent); color: var(--on-accent); flex: none; transition: transform .3s var(--spring), box-shadow .3s; }\n.play-btn .i { width: 22px; height: 22px; }\n.play-btn:hover { box-shadow: 0 0 0 6px rgb(var(--fg-rgb) / .08); }\n.play-btn:active { transform: scale(.9); }\n.play-btn.xl { width: 72px; height: 72px; }\n.play-btn.xl .i { width: 32px; height: 32px; }\n.play-btn .spinner { position: absolute; inset: -4px; width: auto; height: auto; border-width: 2px; border-color: rgb(var(--fg-rgb) / .9) transparent transparent; opacity: 0; transition: opacity .2s; }\n.play-btn.is-loading .spinner { opacity: 1; }\n\n.spinner { display: inline-block; width: 18px; height: 18px; border-radius: 50%; border: 2px solid currentColor; border-right-color: transparent; animation: spin .8s linear infinite; }\n.spinner.inline { width: 16px; height: 16px; }\n\n.chip-btn { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 15px; border-radius: 999px; border: 1px solid var(--line-2); font-weight: 650; font-size: var(--fs-s); color: var(--fg-2); transition: background-color .2s, color .2s, border-color .2s, transform .3s var(--spring); white-space: nowrap; }\n.chip-btn:hover { color: var(--fg); border-color: var(--fg-4); }\n.chip-btn:active { transform: scale(.95); }\n.chip-btn[aria-pressed=\"true\"] { background: var(--fg); color: var(--bg); border-color: transparent; }\n.chip-btn .i { width: 16px; height: 16px; }\n.chip-btn.toggle .i { display: none; }\n.chip-btn.toggle[aria-pressed=\"true\"] .i { display: block; }\n.chip { display: inline-flex; align-items: center; height: 28px; padding: 0 12px; border-radius: 999px; font-size: var(--fs-xs); font-weight: 700; letter-spacing: .02em; background: rgb(var(--fg-rgb) / .08); border: 1px solid var(--line); }\n.text-link { display: inline-flex; align-items: center; gap: 2px; color: var(--fg-3); font-weight: 700; font-size: var(--fs-s); transition: color .2s; }\n.text-link:hover { color: var(--fg); }\n.text-link .i { width: 16px; height: 16px; }\n.link:hover { text-decoration: underline; text-underline-offset: 3px; }\n.badge { display: inline-flex; align-items: center; gap: 4px; height: 20px; padding: 0 8px; border-radius: 999px; font-size: 10.5px; font-weight: 700; color: var(--fg-2); background: rgb(var(--fg-rgb) / .08); letter-spacing: .02em; }\n.badge .i { width: 12px; height: 12px; }\n.badge-e { display: inline-grid; place-items: center; width: 15px; height: 15px; margin-left: 6px; border-radius: 4px; background: rgb(var(--fg-rgb) / .14); color: var(--fg-2); font: 800 9px/1 var(--font); font-style: normal; vertical-align: 2px; }\n\n.segmented { display: inline-flex; padding: 4px; gap: 2px; border-radius: 999px; background: var(--surface-2); max-width: 100%; overflow-x: auto; scrollbar-width: none; }\n.seg { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 38px; padding: 0 16px; border-radius: 999px; color: var(--fg-3); font-weight: 700; font-size: var(--fs-s); white-space: nowrap; transition: color .25s, background-color .25s, box-shadow .25s; }\n.seg .i { width: 18px; height: 18px; }\n.seg small { font-size: 11px; color: var(--fg-3); font-weight: 700; }\n.seg:hover { color: var(--fg); }\n.seg[aria-current=\"page\"], .seg[aria-checked=\"true\"] { background: var(--seg-on); color: var(--fg); box-shadow: var(--shadow-1); }\n.segmented.small .seg { height: 34px; padding: 0 14px; }\n.segmented.tiny .seg { height: 28px; padding: 0 10px; font-size: 11.5px; }\n\n.switch { appearance: none; -webkit-appearance: none; position: relative; width: 48px; height: 28px; border-radius: 999px; background: var(--track-2); cursor: pointer; flex: none; transition: background-color .3s; margin: 0; }\n.switch::before { content: \"\"; position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%; background: #fff; box-shadow: 0 2px 6px rgb(0 0 0 / .3); transition: transform .4s var(--spring); }\n.switch:checked { background: var(--fg); }\n.switch:checked::before { transform: translateX(20px); background: var(--bg); }\n.switch:active::before { width: 26px; }\n.switch:checked:active::before { transform: translateX(16px); }\n\n/* ── слайдер ── */\n.slider { --v: 0; position: relative; height: 22px; display: flex; align-items: center; cursor: pointer; touch-action: none; user-select: none; outline: none; }\n.slider-track { position: relative; width: 100%; height: 4px; border-radius: 4px; background: var(--track); overflow: hidden; transition: height .2s var(--ease); }\n.slider-fill { position: absolute; inset: 0; background: var(--fg); transform-origin: left; transform: scaleX(var(--v)); border-radius: inherit; }\n.slider-buffer { position: absolute; left: 0; top: 0; bottom: 0; width: 0; background: var(--track-2); transition: width .4s; }\n.slider-thumb { position: absolute; left: calc(var(--v) * 100%); width: 14px; height: 14px; border-radius: 50%; background: var(--fg); box-shadow: 0 2px 8px rgb(0 0 0 / .35); transform: translateX(-50%) scale(0); transition: transform .25s var(--spring); }\n.slider:hover .slider-track, .slider.is-dragging .slider-track, .slider:focus-visible .slider-track { height: 6px; }\n.slider:hover .slider-thumb, .slider.is-dragging .slider-thumb, .slider:focus-visible .slider-thumb { transform: translateX(-50%) scale(1); }\n.slider[aria-disabled=\"true\"] { opacity: .4; pointer-events: none; }\n[data-tinted=\"true\"] .pl-seek .slider-fill, [data-tinted=\"true\"] .pl-seek .slider-thumb { background: color-mix(in srgb, rgb(var(--tint)) 35%, var(--fg)); }\n\n/* ── обложки, строки, карточки ── */\n.cover { position: relative; display: grid; place-items: center; overflow: hidden; background: var(--surface-2); border-radius: var(--r-s); isolation: isolate; }\n.cover .ph { width: 42%; height: 42%; color: var(--fg-4); stroke-width: 1.3; }\n.cover img, .cover video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity .5s var(--ease); }\n.cover img.is-loaded, .cover video.is-loaded { opacity: 1; }\n.cover.round { border-radius: 50%; }\n\n.rows { display: grid; gap: 2px; }\n.row {\n  position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto auto auto; align-items: center; gap: 2px;\n  min-height: 62px; padding: 6px 4px 6px 6px; border-radius: var(--r-m); transition: background-color .2s;\n}\n.row:hover { background: var(--hover); }\n.row-main { display: flex; align-items: center; gap: 13px; min-width: 0; text-align: left; height: 100%; border-radius: 10px; }\n.row-lead { position: relative; width: 50px; height: 50px; flex: none; display: grid; place-items: center; }\n.row-lead .cover { width: 100%; height: 100%; }\n.row-num { font-weight: 700; color: var(--fg-3); font-variant-numeric: tabular-nums; font-size: var(--fs-m); }\n.row-play { position: absolute; inset: 0; display: grid; place-items: center; border-radius: var(--r-s); background: rgb(0 0 0 / .42); color: #fff; opacity: 0; transition: opacity .2s; }\n.row-play .i { width: 22px; height: 22px; }\n.row:hover .row-play, .row.is-current .row-play { opacity: 1; }\n.row.is-current .row-play .i { display: none; }\n.row.is-current .eq { display: flex; }\n.row-text { display: grid; min-width: 0; gap: 1px; }\n.row-text strong, .row-text small { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.row-text strong { font-size: var(--fs-m); font-weight: 650; letter-spacing: -.01em; }\n.row-text small { font-size: var(--fs-s); color: var(--fg-3); font-weight: 600; }\n.row.is-current .row-text strong { color: var(--fg); }\n[data-tinted=\"true\"][data-theme=\"dark\"] .row.is-current .row-text strong { color: color-mix(in srgb, rgb(var(--tint)) 45%, #fff); }\n.row-time { color: var(--fg-3); font-size: var(--fs-s); font-variant-numeric: tabular-nums; padding: 0 8px; font-weight: 600; }\n.row-like { opacity: 0; transition: opacity .2s, color .2s, transform .3s var(--spring); }\n.row:hover .row-like, .row-like.is-on, .row-like:focus-visible { opacity: 1; }\n.row.compact { grid-template-columns: minmax(0, 1fr) auto auto; min-height: 58px; }\n.row.compact .row-lead { width: 44px; height: 44px; }\n.row.is-unavailable { grid-template-columns: minmax(0, 1fr); opacity: .45; display: flex; gap: 13px; }\n.row.skeleton { display: flex; gap: 13px; }\n.row.skeleton .row-text { flex: 1; }\n\n.eq { display: none; align-items: flex-end; gap: 2px; height: 15px; }\n.eq i { width: 3px; height: 100%; border-radius: 2px; background: currentColor; transform-origin: bottom; animation: eq 1.1s var(--ease) infinite alternate; animation-play-state: paused; transform: scaleY(.3); }\n.eq i:nth-child(2) { animation-delay: -.35s; animation-duration: .9s; }\n.eq i:nth-child(3) { animation-delay: -.7s; animation-duration: 1.25s; }\n.row.is-playing .eq i { animation-play-state: running; }\n\n.card { display: grid; gap: 4px; align-content: start; min-width: 0; }\n.card .card-cover { aspect-ratio: 1; width: 100%; border-radius: var(--r-l); margin-bottom: 6px; box-shadow: var(--shadow-1); transition: transform .45s var(--spring), box-shadow .3s; }\n.card:hover .card-cover { transform: translateY(-4px); box-shadow: var(--shadow-2); }\n.card:active .card-cover { transform: scale(.97); }\n.card strong { font-weight: 700; font-size: var(--fs-m); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -.01em; }\n.card small { color: var(--fg-3); font-size: var(--fs-s); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.card.artist { text-align: center; justify-items: center; }\n.card.artist .card-cover { border-radius: 50%; }\n.card.skeleton .sk-card { margin-bottom: 8px; }\n.verified { width: 15px; height: 15px; stroke-width: 2.4; vertical-align: -2px; color: var(--fg-2); }\n\n.shelf { display: grid; grid-auto-flow: column; grid-auto-columns: clamp(140px, 42vw, 196px); gap: clamp(12px, 1.6vw, 22px); overflow-x: auto; scroll-snap-type: x mandatory; scroll-padding: 0 var(--gutter); margin: 0 calc(-1 * var(--gutter)); padding: 4px var(--gutter) 12px; scrollbar-width: none; }\n.shelf::-webkit-scrollbar { display: none; }\n.shelf > * { scroll-snap-align: start; }\n.grid-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(150px, 42vw), 1fr)); gap: 22px 16px; }\n\n.section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 14px; }\n.section-head h2 { font-size: var(--fs-2xl); }\n.block { margin-top: clamp(30px, 4vw, 52px); }\n.page-head { padding: 8px 0 18px; }\n.page-head h1 { font-size: var(--fs-3xl); letter-spacing: -.05em; }\n\n.empty { display: grid; justify-items: center; text-align: center; gap: 8px; padding: 48px 20px; color: var(--fg-2); }\n.empty > .i { width: 44px; height: 44px; color: var(--fg-4); stroke-width: 1.3; margin-bottom: 6px; }\n.empty strong { font-size: var(--fs-l); color: var(--fg); font-weight: 750; }\n.empty p { max-width: 42ch; color: var(--fg-3); }\n.empty .btn { margin-top: 10px; }\n.more { display: flex; justify-content: center; padding: 22px 0 6px; }\n.hint { display: flex; align-items: center; gap: 8px; color: var(--fg-3); font-size: var(--fs-s); margin-top: 28px; }\n.hint .i { width: 18px; height: 18px; }\n\n/* ── скелетоны ── */\n.sk { display: block; border-radius: 8px; background: linear-gradient(100deg, var(--sk) 30%, var(--sk-hi) 50%, var(--sk) 70%); background-size: 300% 100%; animation: shimmer 1.5s linear infinite; }\n.sk-cover { width: 50px; height: 50px; border-radius: var(--r-s); }\n.sk-line { height: 12px; width: 62%; margin: 4px 0; }\n.sk-line.short { width: 36%; }\n.sk-card { aspect-ratio: 1; width: 100%; border-radius: var(--r-l); }\n.sk-card.round { border-radius: 50%; }\n.sk-title { height: .82em; width: min(60%, 420px); border-radius: 14px; }\n\n/* ── главная: «Моя волна» ── */\n.hero {\n  position: relative; isolation: isolate; overflow: hidden; display: flex; align-items: flex-end; margin-top: 4px;\n  min-height: clamp(380px, 52vh, 560px); padding: clamp(22px, 4.2vw, 60px); border-radius: var(--r-2xl);\n  background: radial-gradient(120% 90% at 78% 30%, rgb(var(--fg-rgb) / .05), transparent 60%), var(--surface); border: 1px solid var(--line);\n}\n[data-tinted=\"true\"] .hero { background: radial-gradient(120% 90% at 78% 30%, rgb(var(--tint) / .14), transparent 62%), var(--surface); }\n.hero-canvas { position: absolute; inset: 0; width: 100%; height: 100%; z-index: -1; }\n.hero::after { content: \"\"; position: absolute; inset: 0; z-index: -1; background: linear-gradient(90deg, var(--surface) 0%, rgb(var(--bg-rgb) / .0) 70%), linear-gradient(0deg, rgb(var(--bg-rgb) / .35), transparent 55%); pointer-events: none; }\n.hero-content { position: relative; display: grid; gap: 14px; max-width: 640px; }\n.eyebrow { font-size: var(--fs-xs); font-weight: 750; letter-spacing: .16em; text-transform: uppercase; color: var(--fg-3); }\n.hero-title { font-size: var(--fs-hero); letter-spacing: -.06em; line-height: .88; margin-left: -.04em; }\n.hero-sub { color: var(--fg-2); font-size: var(--fs-l); max-width: 44ch; min-height: 1.45em; animation: fade .5s both; }\n.hero-sub b { color: var(--fg); font-weight: 750; }\n.hero-actions { display: flex; align-items: center; gap: 10px; margin-top: 8px; }\n.hero-actions .btn.primary { min-width: 160px; }\n.hero-chips { display: flex; flex-wrap: wrap; gap: 6px; }\n.hero-controls { display: grid; gap: 14px; }\n\n.moods { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(220px, 44vw), 1fr)); gap: 12px; }\n.mood {\n  --h: 220; position: relative; isolation: isolate; overflow: hidden; display: flex; align-items: flex-end; min-height: 128px; padding: 16px;\n  border-radius: var(--r-xl); border: 1px solid var(--line); color: var(--fg);\n  background: linear-gradient(140deg, hsl(var(--h) 16% 15%), hsl(var(--h) 10% 7%));\n  transition: transform .45s var(--spring), border-color .3s; animation: rise .55s var(--ease-out) both; animation-delay: calc(var(--i) * 50ms + 120ms);\n}\n[data-theme=\"light\"] .mood { background: linear-gradient(140deg, hsl(var(--h) 22% 92%), hsl(var(--h) 14% 84%)); }\n.mood:hover { transform: translateY(-3px); border-color: var(--line-2); }\n.mood:active { transform: scale(.97); }\n.mood-art { position: absolute; inset: 0; width: 100%; height: 100%; z-index: -1; fill: none; stroke: hsl(var(--h) 30% 72% / .35); stroke-width: 1.2; transition: transform 1.2s var(--ease-out); }\n[data-theme=\"light\"] .mood-art { stroke: hsl(var(--h) 25% 30% / .3); }\n.mood-art .dot { fill: hsl(var(--h) 30% 80% / .6); stroke: none; }\n.mood:hover .mood-art { transform: scale(1.06) translateX(-2%); }\n.mood-text { display: grid; gap: 2px; }\n.mood-text strong { font-size: var(--fs-l); font-weight: 800; letter-spacing: -.02em; }\n.mood-text small { color: var(--fg-2); font-weight: 600; font-size: var(--fs-s); }\n.mood-go { position: absolute; right: 14px; top: 14px; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; background: rgb(var(--fg-rgb) / .08); transition: transform .4s var(--spring), background-color .3s; }\n.mood-go .i { width: 18px; height: 18px; }\n.mood:hover .mood-go { transform: rotate(-35deg); background: var(--fg); color: var(--bg); }\n[data-mood=\"focus\"] { --h: 222; } [data-mood=\"rain\"] { --h: 200; } [data-mood=\"night\"] { --h: 255; }\n[data-mood=\"drive\"] { --h: 330; } [data-mood=\"energy\"] { --h: 20; } [data-mood=\"sleep\"] { --h: 170; }\n\n.row-grid { display: grid; grid-auto-flow: column; grid-template-rows: repeat(3, auto); grid-auto-columns: minmax(280px, 1fr); gap: 2px 16px; overflow-x: auto; scroll-snap-type: x mandatory; margin: 0 calc(-1 * var(--gutter)); padding: 0 var(--gutter) 6px; scrollbar-width: none; }\n.row-grid::-webkit-scrollbar { display: none; }\n.row-grid .row { scroll-snap-align: start; }\n\n/* ── поиск ── */\n.filters { display: flex; align-items: center; gap: 8px; overflow-x: auto; scrollbar-width: none; margin: 0 calc(-1 * var(--gutter)) 18px; padding: 2px var(--gutter); }\n.filters::-webkit-scrollbar { display: none; }\n.filters-sep { width: 1px; height: 22px; background: var(--line-2); flex: none; margin: 0 4px; }\n.recent-searches { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }\n.recent-searches .chip-btn .i { width: 15px; height: 15px; color: var(--fg-3); }\n.genres { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(180px, 42vw), 1fr)); gap: 10px; }\n.genre {\n  display: flex; align-items: center; justify-content: space-between; height: 64px; padding: 0 18px; border-radius: var(--r-l);\n  background: var(--surface); border: 1px solid var(--line); font-weight: 800; font-size: var(--fs-l); letter-spacing: -.02em; text-align: left;\n  transition: transform .4s var(--spring), background-color .25s; animation: rise .5s var(--ease-out) both; animation-delay: calc(var(--i) * 35ms);\n}\n.genre .i { color: var(--fg-3); width: 20px; height: 20px; transition: transform .35s var(--spring); }\n.genre:hover { background: var(--surface-2); }\n.genre:hover .i { transform: translateX(4px); color: var(--fg); }\n.genre:active { transform: scale(.97); }\n.result-banner { display: flex; align-items: center; gap: 12px; height: 56px; padding: 0 18px; margin-bottom: 14px; border-radius: var(--r-l); background: var(--surface); border: 1px solid var(--line); font-weight: 700; }\n.result-banner span { flex: 1; }\n\n/* ── медиатека ── */\n.list-actions { display: flex; align-items: center; gap: 8px; margin: 18px 0 12px; flex-wrap: wrap; }\n.list-actions .muted { font-size: var(--fs-s); font-weight: 600; }\n.static .row { animation: none !important; }\n\n/* ── страницы альбома, артиста, подборки ── */\n.detail-head {\n  position: relative; isolation: isolate; overflow: hidden; display: flex; align-items: flex-end; gap: clamp(18px, 3vw, 40px);\n  padding: clamp(20px, 3.4vw, 44px); margin: 4px 0 18px; border-radius: var(--r-2xl); background: var(--surface); border: 1px solid var(--line);\n}\n.detail-backdrop { position: absolute; inset: -30%; z-index: -2; background-size: cover; background-position: center; filter: blur(64px) saturate(1.5); opacity: .55; animation: fade .8s both; }\n.detail-head::after { content: \"\"; position: absolute; inset: 0; z-index: -1; background: linear-gradient(180deg, rgb(var(--bg-rgb) / .15), rgb(var(--bg-rgb) / .55)); }\n.detail-art { width: clamp(136px, 22vw, 240px); flex: none; }\n.detail-art .cover { aspect-ratio: 1; width: 100%; border-radius: var(--r-l); box-shadow: var(--shadow-2); animation: jacket .7s var(--ease-out) both; }\n.detail-head.is-artist .detail-art .cover { border-radius: 50%; }\n.mood-cover { --h: 220; background: linear-gradient(140deg, hsl(var(--h) 16% 18%), hsl(var(--h) 10% 8%)); }\n.mood-cover .mood-art { z-index: 0; }\n.detail-copy { min-width: 0; display: grid; gap: 4px; }\n.detail-copy h1 { font-size: calc(clamp(30px, 4.8vw, 68px) * var(--scale)); letter-spacing: -.05em; line-height: .98; margin: 4px 0 6px; overflow-wrap: anywhere; }\n.detail-meta { color: var(--fg-2); font-weight: 600; display: flex; flex-wrap: wrap; align-items: center; gap: 2px 0; }\n.dot-sep { margin: 0 8px; color: var(--fg-4); }\n.detail-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }\n.bio { margin: 0 0 18px; padding: 14px 18px; border-radius: var(--r-l); background: var(--surface); border: 1px solid var(--line); }\n.bio summary { cursor: pointer; font-weight: 700; list-style: none; }\n.bio summary::-webkit-details-marker { display: none; }\n.bio p { margin-top: 10px; color: var(--fg-2); white-space: pre-line; max-height: 240px; overflow: auto; }\n\n/* ── настройки ── */\n.settings { display: grid; gap: 26px; max-width: 780px; padding-bottom: 20px; }\n.settings-group h2 { display: flex; align-items: center; gap: 10px; margin: 0 0 10px 4px; font-size: var(--fs-xs); font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: var(--fg-3); }\n.settings-group h2 .i { width: 18px; height: 18px; }\n.settings-card { padding: 2px 18px; border-radius: var(--r-xl); background: var(--surface); border: 1px solid var(--line); }\n.setting { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 15px 0; border-bottom: 1px solid var(--line); cursor: default; }\nlabel.setting { cursor: pointer; }\n.setting:last-child { border-bottom: 0; }\n.setting.stacked { flex-direction: column; align-items: stretch; gap: 12px; }\n.setting-text { display: grid; gap: 2px; min-width: 0; }\n.setting-text strong { font-weight: 700; font-size: var(--fs-m); }\n.setting-text small, .setting-note { color: var(--fg-3); font-size: var(--fs-s); font-weight: 550; }\n.setting-slider { display: flex; align-items: center; gap: 16px; }\n.setting-slider .slider { flex: 1; }\n.setting-slider output { min-width: 64px; text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--fg-2); }\n.taste { display: grid; gap: 4px; }\n.taste-row { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 6px 0; }\n.taste-row .cover { width: 40px; height: 40px; }\n.taste-name { display: grid; min-width: 0; }\n.taste-name strong, .taste-name small { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.taste-name small { color: var(--fg-3); font-size: var(--fs-xs); font-weight: 600; }\n.profile-card { display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-radius: var(--r-xl); background: var(--surface); border: 1px solid var(--line); }\n.profile-card .avatar { width: 52px; height: 52px; border-radius: 50%; object-fit: cover; background: var(--surface-2); display: grid; place-items: center; flex: none; }\n.profile-card strong { display: block; font-size: var(--fs-l); font-weight: 800; }\n.profile-card small { color: var(--fg-3); font-size: var(--fs-s); }\n.about { display: grid; gap: 6px; color: var(--fg-3); font-size: var(--fs-s); padding: 0 4px; }\n.about p:first-child { display: flex; align-items: center; gap: 8px; color: var(--fg-2); font-weight: 750; }\n.about .i { width: 18px; height: 18px; }\n.tuner-chips { display: flex; flex-wrap: wrap; gap: 8px; }\n.tuner-chip { display: inline-flex; align-items: center; gap: 8px; height: 42px; padding: 0 16px 0 12px; border-radius: var(--r-m); background: var(--surface-2); font-weight: 700; font-size: var(--fs-s); color: var(--fg-2); transition: background-color .25s, color .25s, transform .3s var(--spring); }\n.tuner-chip .i { width: 19px; height: 19px; }\n.tuner-chip:hover { color: var(--fg); }\n.tuner-chip:active { transform: scale(.95); }\n.tuner-chip[aria-pressed=\"true\"], .tuner-chip[aria-checked=\"true\"] { background: var(--fg); color: var(--bg); }\n.tuner-group { border: 0; padding: 0; margin: 0 0 18px; min-width: 0; }\n.tuner-group legend { font-size: var(--fs-xs); font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: var(--fg-3); margin-bottom: 10px; padding: 0; }\n\n/* ── листы ── */\ndialog { color: var(--fg); }\n.sheet { position: fixed; inset: 0; width: 100%; height: 100%; max-width: none; max-height: none; margin: 0; padding: 0; border: 0; background: transparent; overflow: hidden; }\n.sheet::backdrop { background: transparent; }\n.sheet-scrim { position: absolute; inset: 0; background: rgb(0 0 0 / .5); opacity: 0; transition: opacity .35s var(--ease); }\n.sheet.is-open .sheet-scrim { opacity: 1; }\n.sheet-panel {\n  position: absolute; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; max-height: min(88dvh, 860px);\n  border-radius: 28px 28px 0 0; background: var(--glass-strong); padding-bottom: var(--safe-b); border-width: 1px 0 0;\n  box-shadow: var(--shadow-2); transform: translateY(105%); transition: transform .5s var(--ease-out);\n}\n.sheet.is-open .sheet-panel { transform: none; }\n.sheet.is-closing .sheet-panel { transform: translateY(105%); transition: transform .3s var(--ease-in); }\n.sheet-panel.is-swapping .sheet-body, .sheet-panel.is-swapping .sheet-head { opacity: 0; transition: opacity .1s; }\n.sheet-grabber { width: 40px; height: 5px; border-radius: 3px; background: var(--fg-4); margin: 9px auto 0; flex: none; cursor: grab; touch-action: none; }\n.sheet-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 12px 6px 22px; touch-action: none; animation: fade .3s both; }\n.sheet-head h2 { font-size: var(--fs-xl); }\n.sheet-body { overflow-y: auto; padding: 6px 18px 22px; overscroll-behavior: contain; animation: fade .3s both; }\n.sheet-note { color: var(--fg-3); font-size: var(--fs-s); margin: 4px 0 18px; }\n.sheet-actions { display: flex; flex-wrap: wrap; gap: 8px; }\n.sheet-actions .btn { flex: 1; }\n\n.menu-list { display: grid; gap: 1px; }\n.menu-item { display: flex; align-items: center; gap: 14px; width: 100%; min-height: 48px; padding: 0 14px; border-radius: var(--r-m); font-weight: 650; text-align: left; transition: background-color .15s; }\n.menu-item:hover, .menu-item:focus-visible { background: var(--hover); outline: none; }\n.menu-item .i { width: 21px; height: 21px; color: var(--fg-2); }\n.menu-item span { flex: 1; }\n.menu-item small { color: var(--fg-2); font-weight: 800; }\n.menu-item.danger, .menu-item.danger .i { color: var(--danger); }\n.menu-list hr { border: 0; height: 1px; background: var(--line); margin: 5px 10px; }\n.menu-track { display: flex; align-items: center; gap: 12px; padding: 4px 6px 12px; }\n.menu-track .cover { width: 48px; height: 48px; }\n.menu-track span { display: grid; min-width: 0; }\n.menu-track strong, .menu-track small { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.menu-track small { color: var(--fg-3); font-size: var(--fs-s); }\n.menu-note { color: var(--fg-3); padding: 2px 8px 10px; font-size: var(--fs-s); }\n\n.popover {\n  position: fixed; inset: auto; margin: 0; z-index: 200; width: 290px; max-height: 70vh; overflow: auto; padding: 6px;\n  border-radius: 20px; background: var(--glass-strong); border: 1px solid var(--glass-border); box-shadow: var(--shadow-2); color: var(--fg);\n  -webkit-backdrop-filter: blur(var(--blur)) saturate(1.7); backdrop-filter: blur(var(--blur)) saturate(1.7);\n  opacity: 0; transform: scale(.94); transition: opacity .16s var(--ease), transform .26s var(--ease-out);\n}\n.popover.is-open { opacity: 1; transform: none; }\n.popover .menu-item { min-height: 42px; font-size: var(--fs-m); }\n.popover .menu-header { padding: 4px 2px 0; }\n.shared-track { display: grid; justify-items: center; text-align: center; gap: 6px; padding: 6px 0 4px; }\n.shared-track .shared-cover, .shared-track .sk-card { width: min(240px, 62vw); aspect-ratio: 1; border-radius: var(--r-xl); box-shadow: var(--shadow-2); margin-bottom: 10px; }\n.shared-track strong { font-size: var(--fs-xl); font-weight: 800; }\n.shared-track small { color: var(--fg-3); margin-bottom: 14px; }\n.shared-track .sheet-actions { width: 100%; }\n\n/* ── тосты ── */\n.toasts {\n  position: fixed; inset: auto; margin: 0; left: 50%; bottom: calc(var(--tab-h) + var(--dock-h) + var(--safe-b) + 22px); transform: translateX(-50%);\n  display: flex; flex-direction: column; align-items: center; gap: 8px; width: min(92vw, 440px); padding: 0; border: 0; background: none; overflow: visible; pointer-events: none; z-index: 300;\n}\n.toast {\n  display: flex; align-items: center; gap: 10px; max-width: 100%; padding: 11px 14px 11px 14px; border-radius: 18px; box-shadow: var(--shadow-2);\n  font-weight: 650; font-size: var(--fs-s); background: var(--glass-strong); pointer-events: auto;\n  opacity: 0; transform: translateY(14px) scale(.97); transition: opacity .25s var(--ease), transform .45s var(--spring);\n}\n.toast .i { width: 19px; height: 19px; color: var(--fg-2); }\n.toast button { margin-left: 6px; padding: 6px 10px; border-radius: 10px; font-weight: 800; background: rgb(var(--fg-rgb) / .1); }\n.toast.is-in { opacity: 1; transform: none; }\n.toast.is-out { opacity: 0; transform: translateY(8px) scale(.97); transition-duration: .2s, .3s; }\n\n/* ── полноэкранный плеер ── */\n.player {\n  position: fixed; inset: 0; width: 100%; height: 100%; max-width: none; max-height: none; margin: 0; padding: 0; border: 0;\n  background: var(--bg); overflow: hidden; transform: translateY(100%); transition: transform .55s var(--ease-out);\n}\n.player::backdrop { background: transparent; }\n.player.is-open { transform: none; }\n.player.is-closing { transform: translateY(100%); transition: transform .4s var(--ease-in); }\n.pl-bg { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }\n.pl-bg-art { position: absolute; inset: -25%; }\n.pl-bg-art img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: blur(80px) saturate(1.6); opacity: 0; transition: opacity 1.2s var(--ease); animation: drift 38s var(--ease) infinite alternate; }\n.pl-bg-art img.is-loaded { opacity: .62; }\n[data-theme=\"light\"] .pl-bg-art img.is-loaded { opacity: .5; }\n.player[data-bg=\"wave\"] .pl-bg-art img.is-loaded { opacity: .28; }\n.player[data-bg=\"plain\"] .pl-bg-art { display: none; }\n.pl-wave { position: absolute; left: 0; right: 0; bottom: 0; width: 100%; height: 62%; opacity: .32; }\n.player[data-bg=\"wave\"] .pl-wave { opacity: .8; height: 75%; }\n.player[data-bg=\"plain\"] .pl-wave { display: none; }\n.pl-bg-shade { position: absolute; inset: 0; background: radial-gradient(120% 80% at 50% 0%, rgb(var(--bg-rgb) / .15), rgb(var(--bg-rgb) / .62)); }\n\n.pl-shell { --pad: clamp(16px, 3vw, 44px); position: relative; height: 100%; display: flex; flex-direction: column; padding: calc(var(--safe-t) + 6px) calc(var(--pad) + var(--safe-r)) calc(var(--safe-b) + 14px) calc(var(--pad) + var(--safe-l)); }\n.pl-top { display: grid; grid-template-columns: 44px minmax(0, 1fr) 44px; align-items: center; height: 54px; flex: none; touch-action: none; }\n.pl-top .icon-btn { color: var(--fg); }\n.pl-context { display: grid; justify-items: center; text-align: center; min-width: 0; }\n.pl-context small { font-size: 10.5px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: var(--fg-3); }\n.pl-context strong { font-size: var(--fs-s); font-weight: 750; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n\n.pl-body {\n  flex: 1; min-height: 0; width: 100%; max-width: 1320px; margin: 0 auto; display: grid;\n  grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto; grid-template-areas: \"stage\" \"controls\";\n}\n.pl-art-wrap { grid-area: stage; container-type: size; display: grid; place-items: center; min-height: 0; padding: 8px 0 4px; transition: opacity .4s var(--ease), transform .5s var(--ease-out); touch-action: none; }\n.pl-art { width: min(100cqw, 100cqh, 560px); aspect-ratio: 1; border-radius: var(--r-xl); box-shadow: 0 40px 90px -30px rgb(0 0 0 / .75); transition: transform .7s var(--spring), border-radius .4s; }\n.pl-art .ph { color: var(--fg-4); }\n[data-playing=\"false\"] .pl-art { transform: scale(.93); }\n.pl-main { display: contents; }\n.pl-info, .pl-seek, .pl-transport, .pl-tools { grid-area: controls; }\n.pl-main > :not(.pl-art-wrap) { width: min(100%, 560px); justify-self: center; }\n.pl-body { grid-template-rows: minmax(0, 1fr) auto auto auto auto; grid-template-areas: \"stage\" \"info\" \"seek\" \"transport\" \"tools\"; }\n.pl-info { grid-area: info; display: flex; align-items: center; gap: 12px; padding-top: 18px; }\n.pl-seek { grid-area: seek; padding-top: 12px; }\n.pl-transport { grid-area: transport; display: flex; align-items: center; justify-content: space-between; padding: 6px 0 4px; max-width: 420px; }\n.pl-tools { grid-area: tools; display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; padding-top: 10px; }\n.pl-titles { flex: 1; min-width: 0; transition: opacity .16s var(--ease), transform .2s var(--ease); }\n.pl-titles.is-swapping { opacity: 0; transform: translateY(6px); }\n.pl-title { font-size: calc(clamp(22px, 2.3vw, 30px) * var(--scale)); letter-spacing: -.035em; line-height: 1.12; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.pl-artist { display: inline-flex; align-items: center; gap: 6px; max-width: 100%; margin-top: 3px; color: var(--fg-2); font-weight: 650; font-size: var(--fs-l); transition: color .2s; }\n.pl-artist span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.pl-artist img { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; }\n.pl-artist .i { width: 16px; height: 16px; opacity: 0; transform: translateX(-4px); transition: opacity .2s, transform .3s var(--spring); }\n.pl-artist:hover { color: var(--fg); }\n.pl-artist:hover .i { opacity: 1; transform: none; }\n.pl-like { width: 46px; height: 46px; color: var(--fg-2); }\n.pl-like .i { width: 26px; height: 26px; }\n.pl-times { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: var(--fs-xs); font-weight: 700; color: var(--fg-3); font-variant-numeric: tabular-nums; margin-top: 2px; }\n.pl-badges { display: flex; gap: 4px; }\n.pl-transport .icon-btn { color: var(--fg); }\n.pl-transport .icon-btn[aria-pressed=\"false\"] { color: var(--fg-3); }\n.tool { display: inline-flex; align-items: center; gap: 7px; height: 38px; padding: 0 14px 0 11px; border-radius: 999px; font-weight: 700; font-size: var(--fs-s); color: var(--fg-2); background: rgb(var(--fg-rgb) / .07); transition: background-color .25s, color .25s, transform .3s var(--spring); }\n.tool .i { width: 19px; height: 19px; }\n.tool:hover { color: var(--fg); background: rgb(var(--fg-rgb) / .12); }\n.tool:active { transform: scale(.94); }\n.tool[aria-pressed=\"true\"], .tool.is-on { background: var(--fg); color: var(--bg); }\n.wave-only { display: none !important; }\n.is-wave .wave-only { display: inline-flex !important; }\n\n.pl-side { grid-area: stage; position: relative; min-width: 0; min-height: 0; opacity: 0; pointer-events: none; transform: translateY(18px); transition: opacity .35s var(--ease), transform .5s var(--ease-out); }\n.pl-shell:not([data-panel=\"none\"]) .pl-side { opacity: 1; pointer-events: auto; transform: none; }\n.pl-shell:not([data-panel=\"none\"]) .pl-art-wrap { opacity: 0; transform: scale(.9); pointer-events: none; }\n.pl-pane { position: absolute; inset: 0; opacity: 0; visibility: hidden; transition: opacity .3s var(--ease), visibility 0s .3s; }\n.pl-shell[data-panel=\"lyrics\"] [data-pane=\"lyrics\"], .pl-shell[data-panel=\"queue\"] [data-pane=\"queue\"] { opacity: 1; visibility: visible; transition-delay: 0s; }\n\n/* караоке */\n[data-lyric-size=\"s\"] { --ly-size: calc(clamp(20px, 2vw, 27px) * var(--scale)); }\n[data-lyric-size=\"m\"] { --ly-size: calc(clamp(24px, 2.6vw, 35px) * var(--scale)); }\n[data-lyric-size=\"l\"] { --ly-size: calc(clamp(28px, 3.2vw, 44px) * var(--scale)); }\n[data-lyric-size=\"xl\"] { --ly-size: calc(clamp(32px, 3.9vw, 54px) * var(--scale)); }\n.pl-lyrics { position: absolute; inset: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: none; padding: 0 8px; outline: none;\n  -webkit-mask-image: linear-gradient(transparent, #000 14%, #000 78%, transparent); mask-image: linear-gradient(transparent, #000 14%, #000 78%, transparent); }\n.pl-lyrics::-webkit-scrollbar { display: none; }\n.ly { --on: var(--fg); --off: rgb(var(--fg-rgb) / .42); }\n.ly-pad { height: 34%; }\n.ly-pad.end { height: 58%; }\n.ly-line {\n  font-size: var(--ly-size); font-weight: 800; letter-spacing: -.028em; line-height: 1.24; margin: 0 0 .55em; cursor: pointer; transform-origin: left center;\n  opacity: .55; transition: opacity .55s var(--ease), filter .55s var(--ease), transform .6s var(--ease-out); overflow-wrap: anywhere;\n}\n.ly-line:hover { opacity: .85; }\n.ly-line .w { --p: 0; background-image: linear-gradient(90deg, var(--on) calc(var(--p) * 100%), var(--off) calc(var(--p) * 100% + .4em)); background-size: 100% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-box-decoration-break: clone; box-decoration-break: clone; }\n.ly-line[data-s=\"active\"] { opacity: 1; transform: scale(1.02); }\n.ly-line[data-s=\"past\"] { opacity: .42; }\n[data-lyric-blur=\"true\"] .ly-line[data-d=\"2\"] { filter: blur(.7px); }\n[data-lyric-blur=\"true\"] .ly-line[data-d=\"3\"] { filter: blur(1.3px); }\n[data-lyric-blur=\"true\"] .ly-line[data-d=\"4\"] { filter: blur(2px); }\n.ly-gap { --p: 0; display: flex; align-items: center; gap: .28em; height: 1.3em; margin: 0 0 .55em; font-size: var(--ly-size); opacity: 0; transform: scale(.7); transform-origin: left center; transition: opacity .45s, transform .5s var(--spring), height .5s var(--ease-out), margin .5s; }\n.ly-gap:not([data-s=\"active\"]) { height: 0; margin: 0; }\n.ly-gap[data-s=\"active\"] { opacity: 1; transform: none; animation: breathe 2.4s var(--ease) infinite; }\n.ly-gap i { width: .3em; height: .3em; border-radius: 50%; background: var(--fg); }\n.ly-gap i:nth-child(1) { opacity: calc(.25 + .75 * clamp(0, var(--p) * 3, 1)); }\n.ly-gap i:nth-child(2) { opacity: calc(.25 + .75 * clamp(0, var(--p) * 3 - 1, 1)); }\n.ly-gap i:nth-child(3) { opacity: calc(.25 + .75 * clamp(0, var(--p) * 3 - 2, 1)); }\n.ly-plain { padding: 22% 0 30%; }\n.ly-stanza { font-size: calc(var(--ly-size) * .72); font-weight: 750; line-height: 1.45; margin-bottom: 1.1em; color: var(--fg); letter-spacing: -.015em; }\n.ly-note { display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-s); color: var(--fg-3); font-weight: 700; margin-bottom: 22px; }\n.ly-note .i { width: 16px; height: 16px; }\n.ly-credit { font-size: var(--fs-xs); color: var(--fg-3); font-weight: 650; padding: 10px 0 30px; }\n.ly-credit a { text-decoration: underline; text-underline-offset: 3px; }\n.ly-status { height: 100%; display: grid; place-content: center; justify-items: center; text-align: center; gap: 8px; color: var(--fg-2); padding: 20px; }\n.ly-status .i { width: 46px; height: 46px; color: var(--fg-3); stroke-width: 1.3; margin-bottom: 6px; }\n.ly-status strong { font-size: var(--fs-xl); color: var(--fg); }\n.ly-status p { color: var(--fg-3); max-width: 34ch; }\n.ly-loading { padding: 30% 0 0; display: grid; gap: 22px; }\n.ly-loading .sk { height: calc(var(--ly-size) * .75); border-radius: 12px; opacity: .6; }\n.ly-follow { position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%); display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 16px 0 12px; border-radius: 999px; font-weight: 750; font-size: var(--fs-s); box-shadow: var(--shadow-2); animation: rise .35s var(--ease-out) both; }\n.ly-follow .i { width: 18px; height: 18px; }\n.ly-tools { position: absolute; right: 0; top: 0; display: flex; align-items: center; gap: 2px; padding: 3px; border-radius: 999px; font-size: var(--fs-xs); font-weight: 750; font-variant-numeric: tabular-nums; color: var(--fg-2); }\n.ly-tools span:not(.ly-sep) { min-width: 46px; text-align: center; }\n.ly-sep { width: 1px; height: 18px; background: var(--line-2); margin: 0 2px; }\n\n/* очередь */\n.pl-queue { position: absolute; inset: 0; overflow-y: auto; overscroll-behavior: contain; padding: 4px 2px 40px; scrollbar-width: thin; }\n.q-head { display: flex; align-items: baseline; gap: 8px; font-size: var(--fs-xs); font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: var(--fg-3); margin: 16px 6px 8px; }\n.q-head small { letter-spacing: 0; font-size: var(--fs-xs); }\n.q-head:first-child { margin-top: 0; }\n.q-item { position: relative; display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; align-items: center; border-radius: var(--r-m); transition: transform .25s var(--ease-out), background-color .2s; }\n.q-item .row { animation: none; }\n.q-grip { display: grid; place-items: center; height: 100%; color: var(--fg-4); cursor: grab; touch-action: none; }\n.q-grip .i { width: 18px; height: 18px; }\n.q-item.is-dragging { z-index: 2; background: var(--surface-3); box-shadow: var(--shadow-2); transition: none; cursor: grabbing; }\n.q-empty { color: var(--fg-3); padding: 12px 8px; }\n\n/* ── анимации ── */\n.page { animation: page-in .5s var(--ease-out) both; }\n.page[data-dir=\"back\"] { animation-name: page-back; }\n.page[data-dir=\"none\"] { animation-name: fade; animation-duration: .35s; }\n#view[data-leaving] .page { opacity: 0; transform: translateY(-6px); transition: opacity .13s var(--ease), transform .13s var(--ease); }\n.reveal { animation: rise .6s var(--ease-out) both; animation-delay: calc(var(--i, 0) * 60ms + 60ms); }\n.page .rows .row { animation: rise .45s var(--ease-out) both; animation-delay: calc(var(--i, 0) * 26ms + 40ms); }\n.page .shelf > .card, .page .grid-cards > .card { animation: rise .5s var(--ease-out) both; animation-delay: calc(var(--i, 0) * 40ms + 60ms); }\n.fade-in { animation: fade .4s var(--ease) both; }\n\n@keyframes page-in { from { opacity: 0; transform: translateY(16px); } }\n@keyframes page-back { from { opacity: 0; transform: translateY(-12px); } }\n@keyframes rise { from { opacity: 0; transform: translateY(12px); } }\n@keyframes fade { from { opacity: 0; } }\n@keyframes shimmer { from { background-position: 100% 0; } to { background-position: -50% 0; } }\n@keyframes spin { to { transform: rotate(1turn); } }\n@keyframes eq { 0% { transform: scaleY(.25); } 100% { transform: scaleY(1); } }\n@keyframes pop { 0% { transform: scale(1); } 40% { transform: scale(1.35); } 100% { transform: scale(1); } }\n@keyframes track-in { from { opacity: 0; transform: translateX(10px); } }\n@keyframes jacket { from { opacity: 0; transform: translateY(10px) scale(.96); } }\n@keyframes drift { from { transform: scale(1.1) rotate(0deg) translate(0, 0); } to { transform: scale(1.25) rotate(8deg) translate(3%, -2%); } }\n@keyframes breathe { 50% { transform: scale(1.08); } }\n\n[data-motion=\"reduced\"] *, [data-motion=\"reduced\"] *::before, [data-motion=\"reduced\"] *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; animation-delay: 0s !important; transition-duration: .001ms !important; scroll-behavior: auto !important; }\n@media (prefers-reduced-motion: reduce) {\n  *, *::before, *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; animation-delay: 0s !important; transition-duration: .001ms !important; scroll-behavior: auto !important; }\n}\n\n/* ── компьютер ── */\n@media (min-width: 900px) {\n  :root { --rail-w: 92px; --dock-h: 88px; }\n  .app { display: grid; grid-template-columns: var(--rail-w) minmax(0, 1fr); }\n  .stage { padding-bottom: calc(var(--dock-h) + 48px); }\n  .tabbar { display: none; }\n  .topbar { padding-top: calc(var(--safe-t) + 16px); padding-bottom: 14px; }\n  .topbar .brand.compact { display: none; }\n  .searchbar { display: flex; }\n  .topbar-nav [data-action=\"history-back\"] { width: 40px; height: 40px; }\n\n  .rail {\n    position: sticky; top: 0; height: 100dvh; display: flex; flex-direction: column; align-items: stretch; gap: 6px;\n    padding: calc(var(--safe-t) + 20px) 14px calc(var(--dock-h) + 30px); border-right: 1px solid var(--line); background: var(--bg-2);\n  }\n  .rail .brand { padding: 4px 8px 22px; justify-content: center; }\n  .rail .brand-word { display: none; }\n  .nav-link { position: relative; display: flex; align-items: center; justify-content: center; gap: 14px; height: 48px; padding: 0 14px; border-radius: var(--r-m); color: var(--fg-3); font-weight: 700; font-size: var(--fs-m); transition: color .2s, background-color .2s; width: 100%; }\n  .nav-link span { display: none; }\n  .nav-link:hover { color: var(--fg); background: var(--hover); }\n  .nav-link.is-active { color: var(--fg); background: var(--surface-2); }\n  .nav-link.is-active::before { content: \"\"; position: absolute; left: -14px; top: 12px; bottom: 12px; width: 3px; border-radius: 0 3px 3px 0; background: var(--fg); animation: fade .3s; }\n  .rail-nav { display: grid; gap: 4px; }\n  .rail-wave { margin-top: 18px; display: grid; justify-items: center; gap: 8px; padding: 10px 6px; border-radius: var(--r-l); text-align: center; transition: background-color .25s, transform .35s var(--spring); }\n  .rail-wave:hover { background: var(--hover); }\n  .rail-wave:active { transform: scale(.96); }\n  .rail-wave-orb { width: 48px; height: 48px; border-radius: 50%; background: var(--surface-2); overflow: hidden; display: block; }\n  .rail-wave-orb canvas { width: 100%; height: 100%; display: block; }\n  .rail-wave-text { display: none; }\n  .rail-foot { margin-top: auto; display: grid; gap: 4px; }\n  .profile { display: flex; justify-content: center; padding: 10px 0 0; }\n  .profile img, .profile .avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; background: var(--surface-2); display: grid; place-items: center; }\n  .profile span:not(.avatar) { display: none; }\n\n  .dock {\n    left: calc(var(--rail-w) + 16px); right: 16px; bottom: 16px; height: var(--dock-h); border-radius: 26px; padding: 10px 18px 10px 10px; gap: 4px 20px;\n    grid-template-columns: minmax(0, 1fr) minmax(320px, 560px) minmax(0, 1fr); grid-template-rows: 1fr auto; grid-template-areas: \"now controls extra\" \"now timeline extra\";\n  }\n  .dock[data-empty=\"true\"] { transform: none; opacity: 1; pointer-events: auto; }\n  .dock[data-empty=\"true\"] .dock-timeline, .dock[data-empty=\"true\"] .dock-extra, .dock[data-empty=\"true\"] .dock-like { visibility: hidden; }\n  .dock-cover { width: 64px; height: 64px; border-radius: 15px; }\n  .dock-controls { justify-self: center; gap: 6px; }\n  .dock-progress { display: none; }\n  .wide-only { display: grid; }\n  .dock-timeline { grid-area: timeline; display: grid; grid-template-columns: 44px minmax(0, 1fr) 44px; align-items: center; gap: 10px; font-size: var(--fs-xs); font-weight: 700; color: var(--fg-3); font-variant-numeric: tabular-nums; }\n  .dock-timeline time:first-child { text-align: right; }\n  .dock-extra { grid-area: extra; display: flex; align-items: center; justify-self: end; gap: 2px; }\n  .dock-extra .volume { width: 110px; margin-left: 4px; }\n  .toasts { bottom: calc(var(--dock-h) + 34px); left: calc(50% + var(--rail-w) / 2); }\n\n  .sheet-panel { left: 50%; top: 50%; right: auto; bottom: auto; width: min(540px, calc(100vw - 48px)); max-height: min(82vh, 820px); border-radius: 28px; border-width: 1px; padding-bottom: 0;\n    transform: translate(-50%, -46%) scale(.96); opacity: 0; transition: transform .45s var(--ease-out), opacity .25s var(--ease); }\n  .sheet.is-open .sheet-panel { transform: translate(-50%, -50%); opacity: 1; }\n  .sheet.is-closing .sheet-panel { transform: translate(-50%, -48%) scale(.97); opacity: 0; transition: transform .25s var(--ease-in), opacity .2s; }\n  .sheet-grabber { display: none; }\n  .sheet-head { padding: 16px 14px 6px 24px; }\n  .sheet-body { padding: 6px 22px 24px; }\n\n  .player { transform: scale(.985); opacity: 0; transition: opacity .35s var(--ease), transform .5s var(--ease-out); }\n  .player.is-open { transform: none; opacity: 1; }\n  .player.is-closing { transform: scale(.985); opacity: 0; transition: opacity .3s var(--ease), transform .35s var(--ease-in); }\n  .pl-body {\n    grid-template-columns: minmax(0, 1fr) 0fr; column-gap: 0;\n    grid-template-rows: minmax(0, 1fr) auto auto auto auto; grid-template-areas: \"stage side\" \"info side\" \"seek side\" \"transport side\" \"tools side\";\n    transition: grid-template-columns .6s var(--ease-out), column-gap .6s var(--ease-out);\n  }\n  .pl-shell:not([data-panel=\"none\"]) .pl-body { grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); column-gap: clamp(36px, 5vw, 96px); }\n  .pl-side { grid-area: side; transform: translateX(24px); }\n  .pl-shell:not([data-panel=\"none\"]) .pl-art-wrap { opacity: 1; transform: none; pointer-events: auto; }\n  .pl-art { width: min(100cqw, 100cqh, 600px); }\n  .pl-shell { padding-bottom: calc(var(--safe-b) + 28px); }\n  .ly-pad { height: 38%; }\n}\n\n@media (min-width: 1240px) {\n  :root { --rail-w: 252px; }\n  .rail { padding-left: 16px; padding-right: 16px; }\n  .rail .brand { justify-content: flex-start; }\n  .rail .brand-word { display: inline; }\n  .nav-link { justify-content: flex-start; }\n  .nav-link span { display: inline; }\n  .nav-link.is-active::before { left: -16px; }\n  .rail-wave { display: flex; justify-items: start; text-align: left; gap: 12px; padding: 10px; background: var(--surface); border: 1px solid var(--line); }\n  .rail-wave:hover { background: var(--surface-2); }\n  .rail-wave-text { display: grid; }\n  .rail-wave-text strong { font-weight: 800; font-size: var(--fs-m); }\n  .rail-wave-text small { color: var(--fg-3); font-weight: 650; font-size: var(--fs-s); }\n  .profile { justify-content: flex-start; gap: 10px; padding: 12px 8px 0; align-items: center; }\n  .profile span:not(.avatar) { display: grid; min-width: 0; }\n  .profile strong { font-weight: 750; font-size: var(--fs-s); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n  .profile small { color: var(--fg-3); font-size: var(--fs-xs); }\n  .row-grid { grid-auto-columns: minmax(300px, 1fr); }\n}\n\n/* ── телефон ── */\n@media (max-width: 899px) {\n  .row-time { display: none; }\n  .row { grid-template-columns: minmax(0, 1fr) auto auto; }\n  .row-like { opacity: 1; }\n  .row-like:not(.is-on) { display: none; }\n  .row-grid { grid-auto-columns: 86%; grid-template-rows: repeat(3, auto); }\n  .hero { min-height: min(68vh, 460px); padding: 22px 20px; border-radius: var(--r-xl); align-items: flex-end; }\n  .hero::after { background: linear-gradient(0deg, var(--surface) 8%, rgb(var(--bg-rgb) / 0) 72%); }\n  .hero-sub { font-size: var(--fs-m); }\n  .hero-actions .btn.primary { flex: 1; }\n  .moods { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }\n  .mood { min-height: 112px; padding: 14px; border-radius: var(--r-l); }\n  .mood-go { width: 30px; height: 30px; right: 10px; top: 10px; }\n  .detail-head { flex-direction: column; align-items: center; text-align: center; padding: 26px 18px 22px; }\n  .detail-copy { justify-items: center; }\n  .detail-meta, .detail-actions { justify-content: center; }\n  .taste-row { grid-template-columns: 40px minmax(0, 1fr); }\n  .taste-row .segmented { grid-column: 1 / -1; }\n  .topbar { padding-top: calc(var(--safe-t) + 8px); }\n  [data-telegram=\"true\"][data-tg-fullscreen=\"true\"] .topbar { padding-top: calc(var(--safe-t) + 4px); }\n  [data-has-track=\"false\"] .stage { padding-bottom: calc(var(--tab-h) + var(--safe-b) + 28px); }\n  [data-has-track=\"false\"] .toasts { bottom: calc(var(--tab-h) + var(--safe-b) + 16px); }\n  .pl-art-wrap { padding-top: 4px; }\n  .pl-art { width: min(100cqw, 100cqh); border-radius: var(--r-l); }\n  .pl-tools { gap: 4px; }\n  .tool { height: 36px; padding: 0 12px 0 10px; }\n  .ly-pad { height: 22%; }\n  .ly-pad.end { height: 40%; }\n  .ly-tools { top: 0; right: 0; }\n}\n\n@media (max-width: 380px) {\n  .tool span { display: none; }\n  .tool { padding: 0 11px; }\n  .hero-title { font-size: calc(48px * var(--scale)); }\n  .play-btn.xl { width: 64px; height: 64px; }\n  .pl-transport { padding: 2px 0; }\n}\n\n@media (max-height: 640px) and (max-width: 899px) {\n  .pl-tools { padding-top: 4px; }\n  .pl-info { padding-top: 10px; }\n  .pl-title { font-size: 20px; }\n}\n\n@media (hover: none) {\n  .row:hover { background: none; }\n  .row:active { background: var(--hover); }\n  .row:hover .row-play { opacity: 0; }\n  .row.is-current .row-play { opacity: 1; }\n  .card:hover .card-cover { transform: none; box-shadow: var(--shadow-1); }\n  .mood:hover { transform: none; }\n  .mood:hover .mood-art { transform: none; }\n  .mood:hover .mood-go { transform: none; background: rgb(var(--fg-rgb) / .08); color: inherit; }\n}\n",
  "/fonts/OFL.txt": "Manrope, SIL Open Font License 1.1\nCopyright 2018 The Manrope Project Authors (https://github.com/googlefonts/manrope)\n\nThis Font Software is licensed under the SIL Open Font License, Version 1.1.\nThis license is copied below, and is also available with a FAQ at:\nhttp://scripts.sil.org/OFL\n\n\n-----------------------------------------------------------\nSIL OPEN FONT LICENSE Version 1.1 - 26 February 2007\n-----------------------------------------------------------\n\nPREAMBLE\nThe goals of the Open Font License (OFL) are to stimulate worldwide\ndevelopment of collaborative font projects, to support the font creation\nefforts of academic and linguistic communities, and to provide a free and\nopen framework in which fonts may be shared and improved in partnership\nwith others.\n\nThe OFL allows the licensed fonts to be used, studied, modified and\nredistributed freely as long as they are not sold by themselves. The\nfonts, including any derivative works, can be bundled, embedded, \nredistributed and/or sold with any software provided that any reserved\nnames are not used by derivative works. The fonts and derivatives,\nhowever, cannot be released under any other type of license. The\nrequirement for fonts to remain under this license does not apply\nto any document created using the fonts or their derivatives.\n\nDEFINITIONS\n\"Font Software\" refers to the set of files released by the Copyright\nHolder(s) under this license and clearly marked as such. This may\ninclude source files, build scripts and documentation.\n\n\"Reserved Font Name\" refers to any names specified as such after the\ncopyright statement(s).\n\n\"Original Version\" refers to the collection of Font Software components as\ndistributed by the Copyright Holder(s).\n\n\"Modified Version\" refers to any derivative made by adding to, deleting,\nor substituting -- in part or in whole -- any of the components of the\nOriginal Version, by changing formats or by porting the Font Software to a\nnew environment.\n\n\"Author\" refers to any designer, engineer, programmer, technical\nwriter or other person who contributed to the Font Software.\n\nPERMISSION & CONDITIONS\nPermission is hereby granted, free of charge, to any person obtaining\na copy of the Font Software, to use, study, copy, merge, embed, modify,\nredistribute, and sell modified and unmodified copies of the Font\nSoftware, subject to the following conditions:\n\n1) Neither the Font Software nor any of its individual components,\nin Original or Modified Versions, may be sold by itself.\n\n2) Original or Modified Versions of the Font Software may be bundled,\nredistributed and/or sold with any software, provided that each copy\ncontains the above copyright notice and this license. These can be\nincluded either as stand-alone text files, human-readable headers or\nin the appropriate machine-readable metadata fields within text or\nbinary files as long as those fields can be easily viewed by the user.\n\n3) No Modified Version of the Font Software may use the Reserved Font\nName(s) unless explicit written permission is granted by the corresponding\nCopyright Holder. This restriction only applies to the primary font name as\npresented to the users.\n\n4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font\nSoftware shall not be used to promote, endorse or advertise any\nModified Version, except to acknowledge the contribution(s) of the\nCopyright Holder(s) and the Author(s) or with their explicit written\npermission.\n\n5) The Font Software, modified or unmodified, in part or in whole,\nmust be distributed entirely under this license, and must not be\ndistributed under any other license. The requirement for fonts to\nremain under this license does not apply to any document created\nusing the Font Software.\n\nTERMINATION\nThis license becomes null and void if any of the above conditions are\nnot met.\n\nDISCLAIMER\nTHE FONT SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND,\nEXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF\nMERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT\nOF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE\nCOPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,\nINCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL\nDAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING\nFROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM\nOTHER DEALINGS IN THE FONT SOFTWARE.\n",
  "/index.html": "<!doctype html>\n<html lang=\"ru\" data-theme=\"dark\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content\">\n  <meta name=\"theme-color\" content=\"#050506\">\n  <meta name=\"color-scheme\" content=\"dark light\">\n  <meta name=\"description\" content=\"Lo-fi — «Моя волна», подборки под настроение и плеер с караоке.\">\n  <title>Lo-fi</title>\n  <link rel=\"icon\" href=\"/media/logo.svg\" type=\"image/svg+xml\">\n  <link rel=\"manifest\" href=\"/manifest.webmanifest\">\n  <link rel=\"preload\" href=\"/fonts/manrope-cyrillic.woff2\" as=\"font\" type=\"font/woff2\" crossorigin>\n  <link rel=\"preload\" href=\"/fonts/manrope-latin.woff2\" as=\"font\" type=\"font/woff2\" crossorigin>\n  <script src=\"/js/boot.js\"></script>\n  <link rel=\"stylesheet\" href=\"/app.css\">\n  <script src=\"https://telegram.org/js/telegram-web-app.js\"></script>\n  <script type=\"module\" src=\"/js/main.js\"></script>\n</head>\n<body>\n  <div class=\"app\" id=\"app\">\n    <aside class=\"rail\" aria-label=\"Навигация\">\n      <a class=\"brand\" href=\"/\" data-link aria-label=\"Lo-fi — на главную\">\n        <span class=\"brand-mark\"><svg class=\"i\"><use href=\"#i-logo\"/></svg></span>\n        <span class=\"brand-word\">Lo-fi</span>\n      </a>\n      <nav class=\"rail-nav\">\n        <a class=\"nav-link\" href=\"/\" data-link data-nav=\"home\"><svg class=\"i\"><use href=\"#i-home\"/></svg><span>Главная</span></a>\n        <a class=\"nav-link\" href=\"/search\" data-link data-nav=\"search\"><svg class=\"i\"><use href=\"#i-search\"/></svg><span>Поиск</span></a>\n        <a class=\"nav-link\" href=\"/library\" data-link data-nav=\"library\"><svg class=\"i\"><use href=\"#i-library\"/></svg><span>Медиатека</span></a>\n      </nav>\n      <button class=\"rail-wave\" type=\"button\" data-action=\"wave-toggle\">\n        <span class=\"rail-wave-orb\" aria-hidden=\"true\"><canvas width=\"88\" height=\"88\"></canvas></span>\n        <span class=\"rail-wave-text\"><strong>Моя волна</strong><small data-wave-status>Включить</small></span>\n      </button>\n      <div class=\"rail-foot\">\n        <a class=\"nav-link\" href=\"/settings\" data-link data-nav=\"settings\"><svg class=\"i\"><use href=\"#i-settings\"/></svg><span>Настройки</span></a>\n        <button class=\"nav-link theme-switch\" type=\"button\" data-action=\"theme-cycle\"><svg class=\"i\"><use href=\"#i-system\"/></svg><span>Тема</span></button>\n        <div class=\"profile\" id=\"profile\" hidden></div>\n      </div>\n    </aside>\n\n    <div class=\"stage\">\n      <header class=\"topbar\" id=\"topbar\">\n        <div class=\"topbar-nav\">\n          <button class=\"icon-btn ghost\" type=\"button\" data-action=\"history-back\" aria-label=\"Назад\" title=\"Назад\"><svg class=\"i\"><use href=\"#i-back\"/></svg></button>\n          <a class=\"brand compact\" href=\"/\" data-link aria-label=\"Lo-fi — на главную\">\n            <span class=\"brand-mark\"><svg class=\"i\"><use href=\"#i-logo\"/></svg></span>\n            <span class=\"brand-word\">Lo-fi</span>\n          </a>\n        </div>\n        <form class=\"searchbar\" id=\"searchbar\" role=\"search\" autocomplete=\"off\">\n          <svg class=\"i\"><use href=\"#i-search\"/></svg>\n          <input id=\"search-input\" type=\"search\" enterkeyhint=\"search\" placeholder=\"Трек, артист или ссылка\" maxlength=\"220\" aria-label=\"Поиск\">\n          <kbd aria-hidden=\"true\">/</kbd>\n          <button class=\"icon-btn ghost sm\" type=\"button\" data-action=\"search-clear\" aria-label=\"Очистить\" hidden><svg class=\"i\"><use href=\"#i-close\"/></svg></button>\n        </form>\n        <div class=\"topbar-actions\">\n          <button class=\"icon-btn ghost\" type=\"button\" data-action=\"theme-cycle\" aria-label=\"Тема\"><svg class=\"i\"><use href=\"#i-system\"/></svg></button>\n          <button class=\"icon-btn ghost\" type=\"button\" id=\"fullscreen-btn\" data-action=\"fullscreen\" aria-label=\"На весь экран\" hidden><svg class=\"i\"><use href=\"#i-expand\"/></svg></button>\n        </div>\n      </header>\n      <main class=\"view\" id=\"view\" tabindex=\"-1\"></main>\n    </div>\n  </div>\n\n  <section class=\"dock glass\" id=\"dock\" aria-label=\"Мини-плеер\" data-empty=\"true\">\n    <div class=\"dock-progress\" aria-hidden=\"true\"><i></i></div>\n    <button class=\"dock-now\" type=\"button\" data-action=\"player-open\" aria-label=\"Открыть плеер\">\n      <span class=\"cover dock-cover\" id=\"dock-cover\"></span>\n      <span class=\"dock-meta\">\n        <strong id=\"dock-title\">Ничего не играет</strong>\n        <small id=\"dock-artist\">Включите «Мою волну»</small>\n      </span>\n    </button>\n    <div class=\"dock-controls\">\n      <button class=\"icon-btn ghost dock-like\" type=\"button\" data-action=\"like-current\" aria-label=\"В избранное\" disabled><svg class=\"i\"><use href=\"#i-heart\"/></svg></button>\n      <button class=\"icon-btn ghost wide-only\" type=\"button\" data-action=\"shuffle\" aria-label=\"Перемешать\" aria-pressed=\"false\"><svg class=\"i\"><use href=\"#i-shuffle\"/></svg></button>\n      <button class=\"icon-btn ghost wide-only\" type=\"button\" data-action=\"prev\" aria-label=\"Предыдущий\"><svg class=\"i\"><use href=\"#i-prev\"/></svg></button>\n      <button class=\"play-btn\" type=\"button\" data-action=\"toggle\" aria-label=\"Играть\"><svg class=\"i\"><use href=\"#i-play\"/></svg><span class=\"spinner\" aria-hidden=\"true\"></span></button>\n      <button class=\"icon-btn ghost\" type=\"button\" data-action=\"next\" aria-label=\"Следующий\"><svg class=\"i\"><use href=\"#i-next\"/></svg></button>\n      <button class=\"icon-btn ghost wide-only\" type=\"button\" data-action=\"repeat\" aria-label=\"Повтор\" aria-pressed=\"false\"><svg class=\"i\"><use href=\"#i-repeat\"/></svg></button>\n    </div>\n    <div class=\"dock-timeline wide-only\">\n      <time data-time=\"pos\">0:00</time>\n      <div class=\"slider seek\" data-slider=\"seek\" role=\"slider\" aria-label=\"Позиция\" tabindex=\"0\" aria-valuemin=\"0\" aria-valuemax=\"100\" aria-valuenow=\"0\"><span class=\"slider-track\"><i class=\"slider-fill\"></i></span><span class=\"slider-thumb\"></span></div>\n      <time data-time=\"dur\">0:00</time>\n    </div>\n    <div class=\"dock-extra wide-only\">\n      <button class=\"icon-btn ghost\" type=\"button\" data-action=\"player-lyrics\" aria-label=\"Текст песни\" title=\"Текст песни\"><svg class=\"i\"><use href=\"#i-lyrics\"/></svg></button>\n      <button class=\"icon-btn ghost\" type=\"button\" data-action=\"player-queue\" aria-label=\"Очередь\" title=\"Очередь\"><svg class=\"i\"><use href=\"#i-queue\"/></svg></button>\n      <button class=\"icon-btn ghost\" type=\"button\" data-action=\"mute\" aria-label=\"Звук\"><svg class=\"i\"><use href=\"#i-volume\"/></svg></button>\n      <div class=\"slider volume\" data-slider=\"volume\" role=\"slider\" aria-label=\"Громкость\" tabindex=\"0\" aria-valuemin=\"0\" aria-valuemax=\"100\"><span class=\"slider-track\"><i class=\"slider-fill\"></i></span><span class=\"slider-thumb\"></span></div>\n    </div>\n  </section>\n\n  <nav class=\"tabbar glass\" aria-label=\"Разделы\">\n    <a class=\"tab\" href=\"/\" data-link data-nav=\"home\"><svg class=\"i\"><use href=\"#i-home\"/></svg><span>Главная</span></a>\n    <a class=\"tab\" href=\"/search\" data-link data-nav=\"search\"><svg class=\"i\"><use href=\"#i-search\"/></svg><span>Поиск</span></a>\n    <a class=\"tab\" href=\"/library\" data-link data-nav=\"library\"><svg class=\"i\"><use href=\"#i-library\"/></svg><span>Медиатека</span></a>\n    <a class=\"tab\" href=\"/settings\" data-link data-nav=\"settings\"><svg class=\"i\"><use href=\"#i-settings\"/></svg><span>Настройки</span></a>\n  </nav>\n\n  <dialog class=\"player\" id=\"player\" aria-label=\"Плеер\"></dialog>\n  <dialog class=\"sheet\" id=\"sheet\" aria-labelledby=\"sheet-title\"></dialog>\n  <div class=\"popover\" id=\"popover\" role=\"menu\" popover=\"manual\"></div>\n  <div class=\"toasts\" id=\"toasts\" aria-live=\"polite\" popover=\"manual\"></div>\n  <div class=\"widget-slot\" id=\"widget-slot\" aria-hidden=\"true\"></div>\n  <noscript><p class=\"noscript\">Для работы Lo-fi нужен JavaScript.</p></noscript>\n</body>\n</html>\n",
  "/js/actions.js": "// Общие действия: реестр списков для воспроизведения, меню трека, настройка волны, таймер сна.\n\nimport { esc, icon, safeUrl, tg, inTelegram, haptic, api } from './core.js';\nimport { prefs, setPref, isDisliked, catalogue, remember } from './store.js';\nimport { openMenu, openSheet, closeSheet, toast, cover, updateSheetBody } from './ui.js';\nimport * as player from './player/player.js';\n\n// ── реестр списков: строка в любом списке знает, откуда запускать очередь ──\nconst lists = new Map();\nexport function registerList(source, tracks, context = {}) {\n  remember(tracks);\n  lists.set(source, { tracks, context });\n}\nexport const getList = source => lists.get(source);\n\nexport function playFrom(source, id) {\n  if (source === 'queue') {\n    const index = player.P.queue.findIndex(t => t.id === id);\n    if (index === player.P.index) return player.toggle();\n    if (index >= 0) return player.jump(index);\n    return;\n  }\n  const list = lists.get(source);\n  const tracks = list?.tracks || [catalogue.get(id)].filter(Boolean);\n  const index = tracks.findIndex(t => t.id === id);\n  if (index < 0) return;\n  if (player.P.track?.id === id && player.P.context.type === (list?.context.type || source)) return player.toggle();\n  return player.playList(tracks, index, list?.context || { type: source });\n}\n\n// ── «Моя волна» ──\nexport const WAVE_OPTIONS = {\n  waveActivity: { title: 'Занятие', items: [['any', 'Любое', 'infinity'], ['wake', 'Просыпаюсь', 'sunrise'], ['work', 'Работаю', 'laptop'], ['workout', 'Тренируюсь', 'dumbbell'], ['sleep', 'Засыпаю', 'bed'], ['drive', 'В дороге', 'car']] },\n  waveMood: { title: 'Настроение', items: [['any', 'Любое', 'infinity'], ['calm', 'Спокойное', 'calm'], ['energetic', 'Бодрое', 'bolt'], ['happy', 'Весёлое', 'smile'], ['sad', 'Грустное', 'rain']] },\n  waveCharacter: { title: 'Характер', items: [['default', 'Сбалансированный', 'logo'], ['favorite', 'Любимое', 'heart'], ['discover', 'Незнакомое', 'compass'], ['popular', 'Популярное', 'star']] },\n};\n\nexport function waveSummary() {\n  const parts = [];\n  for (const [key, { items }] of Object.entries(WAVE_OPTIONS)) {\n    const value = prefs[key];\n    if (value !== 'any' && value !== 'default') parts.push(items.find(i => i[0] === value)?.[1]);\n  }\n  return parts.filter(Boolean);\n}\n\nfunction tunerBody() {\n  return Object.entries(WAVE_OPTIONS).map(([key, { title, items }]) => `\n    <fieldset class=\"tuner-group\"><legend>${title}</legend><div class=\"tuner-chips\">${items.map(([value, label, glyph]) =>\n      `<button type=\"button\" class=\"tuner-chip\" data-action=\"wave-option\" data-key=\"${key}\" data-value=\"${value}\" aria-pressed=\"${prefs[key] === value}\">${icon(glyph)}<span>${label}</span></button>`).join('')}</div></fieldset>`).join('')\n    + `<p class=\"sheet-note\">Волна учитывает лайки, пропуски и историю. Чем больше слушаете, тем точнее подбор.</p>\n    <div class=\"sheet-actions\"><button class=\"btn primary\" type=\"button\" data-action=\"wave-apply\">${icon('play')}<span>${player.isWave() ? 'Применить' : 'Запустить волну'}</span></button></div>`;\n}\nexport function openWaveTuner() {\n  openSheet({ title: 'Настроить волну', body: tunerBody(), kind: 'wave' });\n}\nlet tuneDirty = false;\nexport function setWaveOption(button) {\n  setPref(button.dataset.key, button.dataset.value);\n  tuneDirty = true;\n  for (const b of button.parentElement.children) b.setAttribute('aria-pressed', String(b === button));\n  haptic('select');\n}\nexport function applyWave() {\n  closeSheet();\n  if (player.isWave()) { if (tuneDirty) player.retuneWave(); }\n  else player.startWave();\n  tuneDirty = false;\n}\n\nexport function toggleWave() {\n  if (player.isWave()) return player.toggle();\n  if (player.P.wave?.loading) return;\n  return player.startWave();\n}\n\n// ── меню трека ──\nexport function shareLink(track) {\n  const bot = window.__lofiConfig?.bot;\n  if (bot) return `https://t.me/${bot}?start=t_${track.id}`;\n  return safeUrl(track.url, 'sc') || location.origin + '/?track=' + track.id;\n}\nexport async function share(track) {\n  const url = shareLink(track);\n  const text = `${track.artist} — ${track.title}`;\n  if (inTelegram && tg.openTelegramLink) {\n    tg.openTelegramLink('https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text));\n    return;\n  }\n  if (navigator.share) { try { await navigator.share({ title: text, url }); return; } catch (error) { if (error.name === 'AbortError') return; } }\n  try { await navigator.clipboard.writeText(url); toast('Ссылка скопирована', { glyph: 'link' }); }\n  catch { toast(url, { glyph: 'link', duration: 6000 }); }\n}\n\nexport function openTrackMenu(track, anchor, { inQueue = -1 } = {}) {\n  if (!track) return;\n  const sc = safeUrl(track.url, 'sc');\n  const hidden = isDisliked(track.id);\n  const header = `<div class=\"menu-track\">${cover(track.artwork, { size: 't120x120' })}<span><strong>${esc(track.title)}</strong><small>${esc(track.artist)}</small></span></div>`;\n  openMenu(anchor, {\n    title: 'Трек',\n    header,\n    items: [\n      { icon: 'queue', label: 'Сыграть следующим', run: () => player.playNext(track) },\n      { icon: 'plus', label: 'Добавить в очередь', run: () => player.enqueue(track) },\n      { icon: 'logo', label: 'Моя волна по треку', run: () => player.startWave({ seed: track.id, label: 'Волна по треку' }) },\n      inQueue > player.P.index ? { icon: 'close', label: 'Убрать из очереди', run: () => player.removeAt(inQueue) } : null,\n      { divider: true },\n      { icon: 'user', label: 'Перейти к артисту', run: () => window.__lofiNavigate?.(track.artistId ? `/artist/${track.artistId}` : `/artist?name=${encodeURIComponent(track.artist)}`) },\n      { icon: 'share', label: 'Поделиться', run: () => share(track) },\n      sc ? { icon: 'external', label: 'Открыть в SoundCloud', run: () => (inTelegram ? tg.openLink(sc) : window.open(sc, '_blank', 'noopener')) } : null,\n      { divider: true },\n      { icon: hidden ? 'refresh' : 'dislike', label: hidden ? 'Вернуть в рекомендации' : 'Не нравится', danger: !hidden, run: () => player.dislikeTrack(track) },\n    ],\n  });\n}\n\nexport function openPlayerMenu(anchor) {\n  const track = player.P.track;\n  if (!track) return;\n  openTrackMenu(track, anchor);\n}\n\n// ── таймер сна ──\nexport function openSleepMenu(anchor) {\n  const left = player.sleepLeft();\n  const options = [[0, 'Выключен'], [-1, 'До конца трека'], [10, '10 минут'], [20, '20 минут'], [30, '30 минут'], [45, '45 минут'], [60, '1 час']];\n  openMenu(anchor, {\n    title: 'Таймер сна',\n    header: left ? `<p class=\"menu-note\">${left === -1 ? 'Остановится в конце трека' : 'Осталось ' + Math.ceil(left / 60000) + ' мин'}</p>` : '',\n    items: options.map(([minutes, label]) => ({\n      icon: minutes === 0 ? 'close' : 'timer', label, hint: (minutes === 0 && !left) || (minutes === -1 && left === -1) ? '✓' : '',\n      run: () => { player.setSleep(minutes); if (minutes) toast(minutes === -1 ? 'Остановлю после этого трека' : `Остановлю через ${label}`, { glyph: 'timer' }); },\n    })),\n  });\n}\n\n// ── карточка трека из ссылки ──\nexport async function openSharedTrack(id) {\n  openSheet({ title: 'Трек', body: '<div class=\"shared-track skeleton\"><span class=\"sk sk-card\"></span><i class=\"sk sk-line\"></i><i class=\"sk sk-line short\"></i></div>', kind: 'shared' });\n  try {\n    const { track } = await api('track', { params: { id } });\n    remember([track]);\n    registerList('shared', [track], { type: 'shared', label: 'Ссылка' });\n    updateSheetBody(`<div class=\"shared-track\">${cover(track.artwork, { size: 't500x500', cls: 'shared-cover', eager: true })}\n      <strong>${esc(track.title)}</strong><small>${esc(track.artist)}</small>\n      <div class=\"sheet-actions\">\n        <button class=\"btn primary\" type=\"button\" data-action=\"play-track\" data-source=\"shared\" data-id=\"${esc(track.id)}\">${icon('play')}<span>Слушать</span></button>\n        <button class=\"btn glass\" type=\"button\" data-action=\"shared-wave\" data-id=\"${esc(track.id)}\">${icon('logo')}<span>Волна по треку</span></button>\n      </div></div>`);\n  } catch (error) {\n    updateSheetBody(`<div class=\"empty\">${icon('cloud')}<strong>${esc(error.message)}</strong></div>`);\n  }\n}\n",
  "/js/boot.js": "// Выбор темы до первой отрисовки, чтобы не было вспышки светлого или тёмного фона.\n(function () {\n  var root = document.documentElement;\n  var prefs = {};\n  try { prefs = JSON.parse(localStorage.getItem('lofi2:prefs:last')) || {}; } catch (e) {}\n  var theme = prefs.theme || 'system';\n  if (theme === 'system') {\n    var tgDark = null;\n    try {\n      var params = new URLSearchParams(location.hash.slice(1)).get('tgWebAppThemeParams');\n      var bg = params && JSON.parse(params).bg_color;\n      if (bg && /^#[\\da-f]{6}$/i.test(bg)) {\n        var n = parseInt(bg.slice(1), 16);\n        tgDark = ((n >> 16) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) < 140;\n      }\n    } catch (e) {}\n    theme = tgDark !== null ? (tgDark ? 'dark' : 'light') : (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');\n  }\n  root.dataset.theme = theme;\n  root.dataset.motion = prefs.motion === 'reduced' ? 'reduced' : 'full';\n  root.dataset.glass = prefs.glass === false ? 'off' : 'on';\n  root.dataset.scale = prefs.textScale || 'm';\n  if (/tgWebAppData=/.test(location.hash)) root.dataset.telegram = 'true';\n  var meta = document.querySelector('meta[name=\"theme-color\"]');\n  if (meta) meta.content = theme === 'light' ? '#f4f4f2' : '#050506';\n})();\n",
  "/js/core.js": "// Базовые утилиты клиента: DOM, форматирование, API, Telegram, шина событий.\n\nexport const $ = (selector, root = document) => root.querySelector(selector);\nexport const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];\nexport const root = document.documentElement;\n\nexport const esc = value => String(value ?? '').replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' })[c]);\nexport const icon = (name, cls = '') => `<svg class=\"i${cls ? ' ' + cls : ''}\" aria-hidden=\"true\"><use href=\"#i-${name}\"/></svg>`;\nexport const clock = sec => {\n  const t = Math.max(0, Math.round(Number(sec) || 0));\n  const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = String(t % 60).padStart(2, '0');\n  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;\n};\nexport const plural = (n, one, few, many) => {\n  const a = Math.abs(n) % 100, b = a % 10;\n  return a > 10 && a < 20 ? many : b > 1 && b < 5 ? few : b === 1 ? one : many;\n};\nexport const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));\nexport const clamp = (v, min, max) => Math.min(max, Math.max(min, v));\nexport const debounce = (fn, ms) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; };\nexport const raf = () => new Promise(resolve => requestAnimationFrame(resolve));\n\n// ── окружение ──\nexport const tg = window.Telegram?.WebApp;\nexport const inTelegram = !!tg?.initData;\nexport const tgUser = inTelegram ? tg.initDataUnsafe?.user || null : null;\nexport const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);\nexport const coarse = matchMedia('(pointer: coarse)');\nexport const wide = matchMedia('(min-width: 900px)');\nconst reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');\nexport const motionReduced = () => reducedQuery.matches || root.dataset.motion === 'reduced';\nexport const onMotionChange = fn => reducedQuery.addEventListener('change', fn);\n\n// ── безопасные внешние адреса ──\nexport function safeUrl(value, kind = 'art') {\n  try {\n    const url = new URL(value);\n    if (url.protocol !== 'https:') return '';\n    const ok = kind === 'art' ? /\\.sndcdn\\.com$/.test(url.hostname)\n      : kind === 'sc' ? ['soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com'].includes(url.hostname)\n      : kind === 'canvas' ? /(?:^|\\.)(?:sndcdn\\.com|soundcloud\\.cloud)$/.test(url.hostname)\n      : kind === 'tg' ? /(?:^|\\.)(?:t\\.me|telegram\\.org)$/.test(url.hostname) : false;\n    return ok ? url.href : '';\n  } catch { return ''; }\n}\n/** Обложка нужного размера: t500x500 → t300x300 и т. п. */\nexport const artSize = (url, size) => url ? url.replace(/-t\\d+x\\d+\\.jpg$/, `-${size}.jpg`) : '';\n\n// ── шина событий ──\nconst listeners = new Map();\nexport const bus = {\n  on(event, fn) { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(fn); return () => listeners.get(event)?.delete(fn); },\n  emit(event, data) { for (const fn of listeners.get(event) || []) { try { fn(data); } catch (error) { console.error(event, error); } } },\n};\n\n// ── API ──\nexport class ApiError extends Error {\n  constructor(message, status) { super(message); this.status = status; }\n}\nexport async function api(path, { params, body, signal, method } = {}) {\n  const url = new URL('/api/' + path, location.origin);\n  for (const [key, value] of Object.entries(params || {})) if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);\n  const headers = inTelegram ? { authorization: 'tma ' + tg.initData } : {};\n  if (body) headers['content-type'] = 'application/json';\n  let response;\n  try {\n    response = await fetch(url, { headers, signal, method: method || (body ? 'POST' : 'GET'), body: body ? JSON.stringify(body) : undefined });\n  } catch (error) {\n    if (error.name === 'AbortError') throw error;\n    throw new ApiError('Нет соединения. Проверьте интернет.', 0);\n  }\n  let data = null;\n  try { data = await response.json(); } catch { /* не JSON: например, ошибка прокси */ }\n  if (!response.ok) throw new ApiError(data?.error || (response.status >= 500 ? 'Сервер временно недоступен' : 'Запрос не удался'), response.status);\n  return data;\n}\n\n// ── хранилище ──\nexport const account = tgUser?.id ? String(tgUser.id) : 'guest';\nexport function load(key, fallback) {\n  try { const raw = localStorage.getItem(`lofi2:${account}:${key}`); return raw === null ? fallback : JSON.parse(raw); } catch { return fallback; }\n}\nexport function save(key, value) {\n  try { localStorage.setItem(`lofi2:${account}:${key}`, JSON.stringify(value)); } catch { /* хранилище недоступно или заполнено */ }\n}\n\n// ── тактильный отклик Telegram ──\nlet hapticsOn = true;\nexport const setHaptics = value => { hapticsOn = value; };\nexport function haptic(kind = 'light') {\n  if (!hapticsOn || !inTelegram || !tg?.HapticFeedback || !tg.isVersionAtLeast?.('6.1')) return;\n  try {\n    if (kind === 'select') tg.HapticFeedback.selectionChanged();\n    else if (['success', 'error', 'warning'].includes(kind)) tg.HapticFeedback.notificationOccurred(kind);\n    else tg.HapticFeedback.impactOccurred(kind);\n  } catch { /* старый клиент */ }\n}\n\n/** Средний и акцентный цвет обложки (для подсветки интерфейса и волны). */\nconst colorCache = new Map();\nexport function coverColors(url) {\n  if (!url) return Promise.resolve(null);\n  if (colorCache.has(url)) return colorCache.get(url);\n  const task = new Promise(resolve => {\n    const img = new Image();\n    img.crossOrigin = 'anonymous';\n    img.decoding = 'async';\n    img.onload = () => {\n      try {\n        const size = 12, canvas = document.createElement('canvas');\n        canvas.width = canvas.height = size;\n        const ctx = canvas.getContext('2d', { willReadFrequently: true });\n        ctx.drawImage(img, 0, 0, size, size);\n        const data = ctx.getImageData(0, 0, size, size).data;\n        let r = 0, g = 0, b = 0, best = null, bestScore = -1;\n        for (let i = 0; i < data.length; i += 4) {\n          r += data[i]; g += data[i + 1]; b += data[i + 2];\n          const max = Math.max(data[i], data[i + 1], data[i + 2]), min = Math.min(data[i], data[i + 1], data[i + 2]);\n          const sat = max ? (max - min) / max : 0, light = (max + min) / 510;\n          const score = sat * (1 - Math.abs(light - .55) * 1.4);\n          if (score > bestScore) { bestScore = score; best = [data[i], data[i + 1], data[i + 2]]; }\n        }\n        const n = data.length / 4;\n        resolve({ average: [r / n, g / n, b / n].map(Math.round), accent: bestScore > .12 ? best : null });\n      } catch { resolve(null); }\n    };\n    img.onerror = () => resolve(null);\n    img.src = artSize(url, 't67x67');\n  });\n  colorCache.set(url, task);\n  if (colorCache.size > 200) colorCache.delete(colorCache.keys().next().value);\n  return task;\n}\n",
  "/js/icons.js": "// Собственный набор тонких линейных иконок на сетке 24×24 (обводка 1.6, скруглённые концы).\n// Залитые фигуры задаются атрибутами: они надёжно работают внутри <use>.\n\nconst F = 'fill=\"currentColor\" stroke=\"none\"';\n\nexport const ICONS = {\n  logo: '<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M3.5 12c1.4-2.6 2.85-2.6 4.25 0s2.85 2.6 4.25 0 2.85-2.6 4.25 0 2.85 2.6 4.25 0\"/>',\n  home: '<path d=\"M4 10.4 12 4l8 6.4V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.2a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5.2H5.5A1.5 1.5 0 0 1 4 19z\"/>',\n  search: '<circle cx=\"11\" cy=\"11\" r=\"6.5\"/><path d=\"m20 20-4.3-4.3\"/>',\n  library: '<path d=\"M5 4v16M9 4v16\"/><path d=\"m13.2 4.6 4.4-1 3 14.9-4.4 1z\"/>',\n  settings: '<path d=\"M4 7h9M17 7h3M4 17h3M11 17h9\"/><circle cx=\"15\" cy=\"7\" r=\"2\"/><circle cx=\"9\" cy=\"17\" r=\"2\"/>',\n  play: `<path ${F} d=\"M8 5.8v12.4a1 1 0 0 0 1.5.86l10.2-6.2a1 1 0 0 0 0-1.72L9.5 4.94A1 1 0 0 0 8 5.8z\"/>`,\n  pause: `<rect ${F} x=\"6.5\" y=\"5\" width=\"4\" height=\"14\" rx=\"1.3\"/><rect ${F} x=\"13.5\" y=\"5\" width=\"4\" height=\"14\" rx=\"1.3\"/>`,\n  next: `<path ${F} d=\"M5.5 6.6v10.8a.9.9 0 0 0 1.4.74l7.9-5.4a.9.9 0 0 0 0-1.48l-7.9-5.4a.9.9 0 0 0-1.4.74z\"/><path d=\"M18.5 5.5v13\"/>`,\n  prev: `<path ${F} d=\"M18.5 6.6v10.8a.9.9 0 0 1-1.4.74l-7.9-5.4a.9.9 0 0 1 0-1.48l7.9-5.4a.9.9 0 0 1 1.4.74z\"/><path d=\"M5.5 5.5v13\"/>`,\n  shuffle: '<path d=\"M4 7h2.5c4.5 0 6.5 10 11 10H20M4 17h2.5c1.6 0 2.8-1.2 3.9-2.8M13.6 9.8C14.7 8.2 15.9 7 17.5 7H20M17.5 4.5 20 7l-2.5 2.5M17.5 14.5 20 17l-2.5 2.5\"/>',\n  repeat: '<path d=\"M4.5 11V9.5A2.5 2.5 0 0 1 7 7h12.5M17 4.5 19.5 7 17 9.5M19.5 13v1.5A2.5 2.5 0 0 1 17 17H4.5M7 19.5 4.5 17 7 14.5\"/>',\n  'repeat-one': '<path d=\"M4.5 11V9.5A2.5 2.5 0 0 1 7 7h12.5M17 4.5 19.5 7 17 9.5M19.5 13v1.5A2.5 2.5 0 0 1 17 17H4.5M7 19.5 4.5 17 7 14.5\"/><path d=\"m11 11.2 1.5-.9v4\"/>',\n  heart: '<path d=\"M12 19.6s-7.6-4.5-7.6-10.1A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.6 2.5c0 5.6-7.6 10.1-7.6 10.1z\"/>',\n  'heart-fill': `<path ${F} d=\"M12 19.6s-7.6-4.5-7.6-10.1A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.6 2.5c0 5.6-7.6 10.1-7.6 10.1z\"/>`,\n  more: `<circle ${F} cx=\"5.5\" cy=\"12\" r=\"1.4\"/><circle ${F} cx=\"12\" cy=\"12\" r=\"1.4\"/><circle ${F} cx=\"18.5\" cy=\"12\" r=\"1.4\"/>`,\n  close: '<path d=\"m6.5 6.5 11 11M17.5 6.5l-11 11\"/>',\n  back: '<path d=\"M14.5 5.5 8 12l6.5 6.5\"/>',\n  forward: '<path d=\"M9.5 5.5 16 12l-6.5 6.5\"/>',\n  down: '<path d=\"m5.5 9 6.5 6.5L18.5 9\"/>',\n  up: '<path d=\"m5.5 15 6.5-6.5 6.5 6.5\"/>',\n  plus: '<path d=\"M12 5v14M5 12h14\"/>',\n  check: '<path d=\"m5 12.5 4.5 4.5L19 7.5\"/>',\n  queue: `<path d=\"M4 6.5h12M4 11.5h12M4 16.5h7\"/><path ${F} d=\"M15 14.2v5.6a.4.4 0 0 0 .6.34l4.3-2.8a.4.4 0 0 0 0-.68l-4.3-2.8a.4.4 0 0 0-.6.34z\"/>`,\n  lyrics: '<path d=\"M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 17h-7l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5z\"/><path d=\"M7.5 9.5h9M7.5 13h6\"/>',\n  mic: '<rect x=\"9\" y=\"3.5\" width=\"6\" height=\"11\" rx=\"3\"/><path d=\"M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5\"/>',\n  volume: '<path d=\"M4 9.5h3.2L12 5.5v13l-4.8-4H4z\"/><path d=\"M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11\"/>',\n  'volume-low': '<path d=\"M4 9.5h3.2L12 5.5v13l-4.8-4H4z\"/><path d=\"M15.5 9a4 4 0 0 1 0 6\"/>',\n  mute: '<path d=\"M4 9.5h3.2L12 5.5v13l-4.8-4H4z\"/><path d=\"m16 9.5 5 5m0-5-5 5\"/>',\n  share: '<path d=\"M12 14.5V3.8M8 7.5 12 3.5l4 4\"/><path d=\"M8 11H6.5A1.5 1.5 0 0 0 5 12.5v6A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-6a1.5 1.5 0 0 0-1.5-1.5H16\"/>',\n  external: '<path d=\"M14 4.5h5.5V10M19.5 4.5 11 13M17 13.5v4.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 5 18V9a1.5 1.5 0 0 1 1.5-1.5H11\"/>',\n  link: '<path d=\"M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1\"/><path d=\"M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1\"/>',\n  trash: '<path d=\"M4.5 7h15M9.5 7V5.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V7M6.5 7l.8 11.2a1.5 1.5 0 0 0 1.5 1.3h6.4a1.5 1.5 0 0 0 1.5-1.3L17.5 7\"/>',\n  dislike: '<circle cx=\"12\" cy=\"12\" r=\"8\"/><path d=\"m6.5 17.5 11-11\"/>',\n  sun: '<circle cx=\"12\" cy=\"12\" r=\"3.8\"/><path d=\"M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4\"/>',\n  moon: '<path d=\"M19.5 14.6A7.8 7.8 0 0 1 9.4 4.5a7.8 7.8 0 1 0 10.1 10.1z\"/>',\n  system: `<circle cx=\"12\" cy=\"12\" r=\"8\"/><path ${F} d=\"M12 4a8 8 0 0 1 0 16z\"/>`,\n  tune: '<path d=\"M7 4v5M7 13v7M17 4v9M17 17v3M12 4v1.5M12 9.5V20\"/><circle cx=\"7\" cy=\"11\" r=\"2\"/><circle cx=\"17\" cy=\"15\" r=\"2\"/><circle cx=\"12\" cy=\"7.5\" r=\"2\"/>',\n  sparkle: '<path d=\"M11 4c.6 4.4 2.1 5.9 6.5 6.5-4.4.6-5.9 2.1-6.5 6.5-.6-4.4-2.1-5.9-6.5-6.5C8.9 9.9 10.4 8.4 11 4z\"/><path d=\"M18.5 15.5c.2 1.6.9 2.3 2.5 2.5-1.6.2-2.3.9-2.5 2.5-.2-1.6-.9-2.3-2.5-2.5 1.6-.2 2.3-.9 2.5-2.5z\"/>',\n  clock: '<circle cx=\"12\" cy=\"12\" r=\"8\"/><path d=\"M12 7.5V12l3 2\"/>',\n  user: '<circle cx=\"12\" cy=\"8.5\" r=\"3.5\"/><path d=\"M5 19.5a7 7 0 0 1 14 0\"/>',\n  disc: '<circle cx=\"12\" cy=\"12\" r=\"8\"/><circle cx=\"12\" cy=\"12\" r=\"2.4\"/><path d=\"M12 6.5A5.5 5.5 0 0 1 17.5 12\"/>',\n  cloud: '<path d=\"M7 18.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 6.9 9.2 4.7 4.7 0 0 0 7 18.5z\"/><path d=\"M12 10.5v3.5M12 16.3v.1\"/>',\n  refresh: '<path d=\"M19 12a7 7 0 1 1-2.05-4.95M19 4.5V8h-3.5\"/>',\n  timer: '<circle cx=\"12\" cy=\"13\" r=\"7\"/><path d=\"M12 9.5V13l2.2 1.6M9.5 3.5h5\"/>',\n  download: '<path d=\"M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14\"/>',\n  expand: '<path d=\"M14.5 4.5h5v5M19.5 4.5l-6 6M9.5 19.5h-5v-5M4.5 19.5l6-6\"/>',\n  'eye-off': '<path d=\"M3.5 12S6.5 6 12 6c1.6 0 3 .5 4.2 1.2M20.5 12s-3 6-8.5 6c-1.6 0-3-.5-4.2-1.2M4.5 19.5l15-15M9.9 14.1a3 3 0 0 1 4.2-4.2\"/>',\n  info: '<circle cx=\"12\" cy=\"12\" r=\"8\"/><path d=\"M12 11v5M12 8v.1\"/>',\n  note: '<path d=\"M9 17.5V6l10-2v11.5\"/><circle cx=\"6.5\" cy=\"17.5\" r=\"2.5\"/><circle cx=\"16.5\" cy=\"15.5\" r=\"2.5\"/>',\n  bolt: '<path d=\"M13 3.5 6 13.5h5.5l-1 7 7.5-10h-5.5z\"/>',\n  leaf: '<path d=\"M5 19c0-8 5-13.5 14.5-14 .5 9.5-5 14.5-13 14.5M5 19c3-4 6-6.5 9.5-8.5\"/>',\n  sunrise: '<path d=\"M4 18h16M7 18a5 5 0 0 1 10 0M12 5.5v3M5.6 9.6l1.8 1.8M18.4 9.6l-1.8 1.8\"/>',\n  laptop: '<rect x=\"5\" y=\"5.5\" width=\"14\" height=\"10\" rx=\"1.5\"/><path d=\"M3 19h18\"/>',\n  dumbbell: '<path d=\"M8 7.5v9M16 7.5v9M8 12h8M5 9.5v5M19 9.5v5\"/>',\n  bed: '<path d=\"M3.5 18.5v-11M3.5 15h17v3.5M20.5 15v-2.5a3 3 0 0 0-3-3H11V15\"/><circle cx=\"7.3\" cy=\"11.8\" r=\"1.8\"/>',\n  car: '<path d=\"m5 15 1.6-4.9A2 2 0 0 1 8.5 8.7h7a2 2 0 0 1 1.9 1.4L19 15\"/><rect x=\"3.5\" y=\"15\" width=\"17\" height=\"3.8\" rx=\"1.6\"/><path d=\"M7 18.8v1.2M17 18.8v1.2\"/>',\n  smile: '<circle cx=\"12\" cy=\"12\" r=\"8\"/><path d=\"M8.8 14a4 4 0 0 0 6.4 0M9.5 10v.1M14.5 10v.1\"/>',\n  rain: '<path d=\"M7 14.5h10a3.5 3.5 0 0 0 .5-7A5 5 0 0 0 7.8 6.8 3.9 3.9 0 0 0 7 14.5z\"/><path d=\"m9 17.5-1 2M13 17.5l-1 2M17 17.5l-1 2\"/>',\n  star: '<path d=\"m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z\"/>',\n  compass: '<circle cx=\"12\" cy=\"12\" r=\"8\"/><path d=\"m14.8 9.2-1.6 4-4 1.6 1.6-4z\"/>',\n  calm: '<path d=\"M4 10c2-1.6 4-1.6 6 0s4 1.6 6 0 3-1.2 4-.6M4 15c2-1.6 4-1.6 6 0s4 1.6 6 0 3-1.2 4-.6\"/>',\n  infinity: '<path d=\"M8.5 15.5a3.5 3.5 0 1 1 0-7c3.5 0 3.5 7 7 7a3.5 3.5 0 1 0 0-7c-3.5 0-3.5 7-7 7z\"/>',\n  database: '<ellipse cx=\"12\" cy=\"6.5\" rx=\"7\" ry=\"2.5\"/><path d=\"M5 6.5v11c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-11M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5\"/>',\n  grip: `<circle ${F} cx=\"9\" cy=\"7\" r=\"1.2\"/><circle ${F} cx=\"15\" cy=\"7\" r=\"1.2\"/><circle ${F} cx=\"9\" cy=\"12\" r=\"1.2\"/><circle ${F} cx=\"15\" cy=\"12\" r=\"1.2\"/><circle ${F} cx=\"9\" cy=\"17\" r=\"1.2\"/><circle ${F} cx=\"15\" cy=\"17\" r=\"1.2\"/>`,\n  'arrow-right': '<path d=\"M5 12h14M13.5 6.5 19 12l-5.5 5.5\"/>',\n  minus: '<path d=\"M5 12h14\"/>',\n  text: '<path d=\"M5 6.5V5h14v1.5M12 5v14M9 19h6\"/>',\n  palette: '<path d=\"M12 20a8 8 0 1 1 8-8c0 2.2-1.8 3-3.3 3h-1.9a1.8 1.8 0 0 0-1.3 3.1c.5.5.3 1.9-1.5 1.9z\"/><circle cx=\"8\" cy=\"11\" r=\"1\"/><circle cx=\"11\" cy=\"7.8\" r=\"1\"/><circle cx=\"15.2\" cy=\"8.6\" r=\"1\"/>',\n  speaker: '<rect x=\"6\" y=\"3.5\" width=\"12\" height=\"17\" rx=\"2.5\"/><circle cx=\"12\" cy=\"14\" r=\"3\"/><path d=\"M12 7.5v.1\"/>',\n  layers: '<path d=\"m12 4 8.5 4.5L12 13 3.5 8.5z\"/><path d=\"m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5\"/>',\n};\n\nexport function installIcons() {\n  if (document.getElementById('icon-sprite')) return;\n  const ns = 'http://www.w3.org/2000/svg';\n  const svg = document.createElementNS(ns, 'svg');\n  svg.id = 'icon-sprite';\n  svg.setAttribute('aria-hidden', 'true');\n  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';\n  svg.innerHTML = Object.entries(ICONS).map(([name, body]) => `<symbol id=\"i-${name}\" viewBox=\"0 0 24 24\">${body}</symbol>`).join('');\n  document.body.prepend(svg);\n}\n",
  "/js/main.js": "// Точка входа Mini App: маршрутизация, мини-плеер, Telegram, тема и горячие клавиши.\n\nimport { installIcons } from './icons.js';\nimport { $, $$, esc, icon, clock, api, bus, root, tg, inTelegram, tgUser, wide, safeUrl, artSize, haptic, motionReduced, onMotionChange } from './core.js';\nimport { prefs, setPref, state, hydrate, catalogue, isLiked, toggleLike } from './store.js';\nimport { swapView, Slider, closeSheet, sheetKind, refreshLikes, cover, toast } from './ui.js';\nimport * as actionsModule from './actions.js';\nimport * as player from './player/player.js';\nimport * as full from './player/fullscreen.js';\nimport * as home from './pages/home.js';\nimport * as search from './pages/search.js';\nimport * as library from './pages/library.js';\nimport * as detail from './pages/detail.js';\nimport * as settings from './pages/settings.js';\nimport { WaveVisual } from './wave-visual.js';\n\ninstallIcons();\n\nconst FALLBACK_CONFIG = {\n  moods: [\n    { id: 'focus', name: 'В потоке', note: 'Для концентрации' }, { id: 'rain', name: 'За окном дождь', note: 'Спокойный фон' },\n    { id: 'night', name: 'Поздняя ночь', note: 'Тихий вечер' }, { id: 'drive', name: 'В дороге', note: 'Ровный темп' },\n    { id: 'energy', name: 'Заряд', note: 'Для движения' }, { id: 'sleep', name: 'Перед сном', note: 'Медленно и мягко' },\n  ],\n  genres: [{ name: 'Lo-fi', query: 'lofi hip hop' }, { name: 'Рэп', query: 'русский рэп' }, { name: 'Фонк', query: 'phonk' }, { name: 'Инди', query: 'indie' },\n    { name: 'Джаз', query: 'jazz' }, { name: 'Эмбиент', query: 'ambient' }, { name: 'Хаус', query: 'deep house' }, { name: 'Поп', query: 'pop' }],\n  bot: '', version: '', cache: false,\n};\nwindow.__lofiConfig = FALLBACK_CONFIG;\n\n// ── тема и внешний вид ──\nconst systemDark = matchMedia('(prefers-color-scheme: dark)');\nfunction resolvedTheme() {\n  if (prefs.theme !== 'system') return prefs.theme;\n  if (inTelegram && tg.colorScheme) return tg.colorScheme;\n  return systemDark.matches ? 'dark' : 'light';\n}\nfunction applyPrefs(key = '*') {\n  const theme = resolvedTheme();\n  const changedTheme = root.dataset.theme !== theme;\n  if (changedTheme && root.dataset.ready && !motionReduced()) {\n    root.classList.add('theme-fade');\n    setTimeout(() => root.classList.remove('theme-fade'), 450);\n  }\n  root.dataset.theme = theme;\n  root.dataset.motion = prefs.motion;\n  root.dataset.glass = prefs.glass ? 'on' : 'off';\n  root.dataset.scale = prefs.textScale;\n  root.dataset.lyricSize = prefs.lyricSize;\n  root.dataset.lyricBlur = String(prefs.lyricBlur);\n  const bg = theme === 'light' ? '#f4f4f2' : '#050506';\n  $('meta[name=\"theme-color\"]').content = bg;\n  if (inTelegram) {\n    try { tg.setHeaderColor(bg); tg.setBackgroundColor(bg); tg.setBottomBarColor?.(bg); } catch {}\n  }\n  const glyph = { system: 'system', dark: 'moon', light: 'sun' }[prefs.theme];\n  const label = { system: 'Тема: как в системе', dark: 'Тема: тёмная', light: 'Тема: светлая' }[prefs.theme];\n  for (const b of $$('[data-action=\"theme-cycle\"]')) {\n    b.querySelector('use').setAttribute('href', '#i-' + glyph);\n    b.setAttribute('aria-label', label);\n    b.title = label;\n    const text = b.querySelector('span');\n    if (text) text.textContent = { system: 'Системная тема', dark: 'Тёмная тема', light: 'Светлая тема' }[prefs.theme];\n  }\n  if (['volume', '*'].includes(key)) { player.setVolume(prefs.volume); volumeSlider?.set(prefs.volume / 100); updateMute(); }\n  if (['normalize', '*'].includes(key)) player.engine.setNormalize(prefs.normalize);\n  for (const b of $$('[data-action=\"set-pref\"]')) {\n    const on = prefs[b.dataset.key] === b.dataset.value;\n    b.setAttribute('aria-checked', String(on));\n  }\n  for (const input of $$('input[data-pref]')) input.checked = !!prefs[input.dataset.pref];\n}\nsystemDark.addEventListener('change', () => { if (prefs.theme === 'system') applyPrefs('theme'); });\nonMotionChange(() => applyPrefs('motion'));\n\n// ── маршрутизация ──\nlet page = null;\nlet depth = 0;\nconst MODULES = { home, search, library, detail, settings };\n\nfunction parse(path = location.pathname) {\n  let m;\n  if (path === '/' || path === '') return { page: 'home', nav: 'home' };\n  if (path === '/search') return { page: 'search', nav: 'search' };\n  if ((m = path.match(/^\\/library(?:\\/(history|hidden))?$/))) return { page: 'library', nav: 'library', tab: m[1] || 'favorites' };\n  if (path === '/settings') return { page: 'settings', nav: 'settings' };\n  if ((m = path.match(/^\\/album\\/(\\d{1,15})$/))) return { page: 'detail', nav: '', kind: 'album', id: m[1] };\n  if ((m = path.match(/^\\/artist\\/(\\d{1,15})$/))) return { page: 'detail', nav: '', kind: 'artist', id: m[1] };\n  if (path === '/artist') return { page: 'detail', nav: '', kind: 'artist', id: '', name: new URLSearchParams(location.search).get('name') || '' };\n  if ((m = path.match(/^\\/mood\\/([\\w-]{1,24})$/))) return { page: 'detail', nav: 'home', kind: 'mood', id: m[1], name: window.__lofiConfig.moods.find(x => x.id === m[1])?.name || '' };\n  return { page: 'home', nav: 'home' };\n}\n\nexport async function navigate(path, { replace = false } = {}) {\n  closeSheet();\n  if (full.isOpen()) full.close();\n  const url = new URL(path, location.origin);\n  if (url.pathname + url.search === location.pathname + location.search && !replace) { window.scrollTo({ top: 0, behavior: motionReduced() ? 'instant' : 'smooth' }); return; }\n  history.replaceState({ ...(history.state || {}), scroll: scrollY, depth }, '');\n  if (replace) history.replaceState({ depth }, '', url.pathname + url.search);\n  else { depth++; history.pushState({ depth }, '', url.pathname + url.search); }\n  await render('forward');\n}\nwindow.__lofiNavigate = path => navigate(path);\n\nasync function render(direction = 'forward', scroll = 0) {\n  const route = parse();\n  const module = MODULES[route.page];\n  MODULES[page?.page]?.unmount?.();\n  page = route;\n  root.dataset.page = route.page;\n  for (const link of $$('[data-nav]')) {\n    const active = link.dataset.nav === route.nav;\n    link.classList.toggle('is-active', active);\n    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');\n  }\n  const html = route.page === 'library' ? module.render(route.tab) : route.page === 'detail' ? module.render(route.kind, route.id, route.name) : module.render();\n  updateBack();\n  await swapView(html, {\n    direction, scroll,\n    mount: el => {\n      module.mount?.(el);\n      if (route.page === 'detail') detail.load();\n      markRows();\n      if (route.page === 'search' && !coarseInput()) $('#search-input').focus({ preventScroll: true });\n    },\n  });\n}\nconst coarseInput = () => matchMedia('(pointer: coarse)').matches;\n\naddEventListener('popstate', event => {\n  depth = event.state?.depth || 0;\n  closeSheet();\n  if (full.isOpen()) full.close();\n  render('back', event.state?.scroll || 0);\n});\n\nfunction goBack() {\n  if (sheetKind()) return closeSheet();\n  if (full.isOpen()) return full.close();\n  if (depth > 0) return history.back();\n  if (page?.page !== 'home') return navigate('/', { replace: true });\n}\n\nfunction updateBack() {\n  const canGoBack = depth > 0 || page?.page !== 'home' || full.isOpen() || !!sheetKind();\n  root.dataset.canBack = String(depth > 0);\n  if (!inTelegram) return;\n  if (canGoBack) tg.BackButton?.show(); else tg.BackButton?.hide();\n}\nbus.on('player:open', updateBack);\nnew MutationObserver(updateBack).observe($('#sheet'), { attributes: true, attributeFilter: ['open'] });\n\n// ── мини-плеер ──\nlet seekSlider, volumeSlider, dockFrame = 0, dockSecond = -1, lastVolume = 80, railOrb = null;\nconst dock = $('#dock');\n\nfunction updateDockTrack() {\n  const t = player.P.track;\n  dock.dataset.empty = String(!t);\n  root.dataset.hasTrack = String(!!t);\n  const box = $('#dock-cover');\n  const url = safeUrl(t?.artwork);\n  if (box.dataset.src !== (url || '')) {\n    box.dataset.src = url || '';\n    box.innerHTML = cover(url, { size: 't120x120', eager: true }).replace(/^<span class=\"cover\">|<\\/span>$/g, '');\n  }\n  const title = $('#dock-title'), artist = $('#dock-artist');\n  title.textContent = t?.title || 'Ничего не играет';\n  artist.textContent = t ? t.artist : 'Включите «Мою волну»';\n  dock.classList.remove('track-in');\n  if (t && !motionReduced()) { void dock.offsetWidth; dock.classList.add('track-in'); }\n  updateLikeCurrent();\n}\n\nfunction updateLikeCurrent() {\n  const liked = isLiked(player.P.track?.id);\n  for (const b of $$('[data-action=\"like-current\"]')) {\n    b.disabled = !player.P.track;\n    b.classList.toggle('is-on', liked);\n    b.setAttribute('aria-pressed', String(liked));\n    b.setAttribute('aria-label', liked ? 'Убрать из избранного' : 'В избранное');\n    const use = b.querySelector('use');\n    if (use) use.setAttribute('href', '#i-' + (liked ? 'heart-fill' : 'heart'));\n  }\n}\n\nfunction updateControls() {\n  const P = player.P;\n  const playing = P.status === 'playing' || (P.status === 'loading' && P.want);\n  const loading = P.status === 'loading' && P.want;\n  for (const b of $$('[data-action=\"toggle\"]')) {\n    b.querySelector('use').setAttribute('href', '#i-' + (playing ? 'pause' : 'play'));\n    b.setAttribute('aria-label', playing ? 'Пауза' : 'Играть');\n    b.classList.toggle('is-loading', loading);\n  }\n  for (const b of $$('[data-action=\"shuffle\"]')) b.setAttribute('aria-pressed', String(P.shuffle));\n  for (const b of $$('[data-action=\"repeat\"]')) {\n    b.setAttribute('aria-pressed', String(P.repeat !== 'off'));\n    b.querySelector('use').setAttribute('href', '#i-' + (P.repeat === 'one' ? 'repeat-one' : 'repeat'));\n    b.setAttribute('aria-label', { off: 'Повтор выключен', all: 'Повторять очередь', one: 'Повторять трек' }[P.repeat]);\n  }\n  for (const b of $$('[data-action=\"prev\"],[data-action=\"next\"]')) b.disabled = !P.track && !P.queue.length;\n  root.dataset.playing = String(P.status === 'playing');\n  root.dataset.wave = String(player.isWave());\n  const waveStatus = $('[data-wave-status]');\n  if (waveStatus) waveStatus.textContent = player.isWave() ? (P.status === 'playing' ? 'Играет' : 'На паузе') : P.wave?.loading ? 'Подбираем…' : 'Включить';\n  railOrb?.setActive(player.isWave() && P.status === 'playing');\n  seekSlider?.disable(!P.track);\n  markRows();\n  home.refreshHero();\n  startDockLoop();\n}\n\nfunction markRows() {\n  const id = player.P.track?.id;\n  const playing = player.isPlaying();\n  for (const row of $$('#view [data-row]')) {\n    const current = row.dataset.row === id;\n    row.classList.toggle('is-current', current);\n    row.classList.toggle('is-playing', current && playing);\n  }\n}\n\nfunction startDockLoop() { if (!dockFrame) dockFrame = requestAnimationFrame(dockTick); }\nfunction dockTick() {\n  dockFrame = 0;\n  const pos = player.position(), dur = player.duration();\n  const ratio = dur ? Math.min(1, pos / dur) : 0;\n  dock.style.setProperty('--progress', ratio.toFixed(4));\n  if (seekSlider && !seekSlider.dragging) {\n    seekSlider.set(ratio);\n    const s = Math.floor(pos);\n    if (s !== dockSecond) { dockSecond = s; $('[data-time=\"pos\"]', dock).textContent = clock(pos); $('[data-time=\"dur\"]', dock).textContent = clock(dur); }\n  }\n  if (player.isPlaying() && !document.hidden) dockFrame = requestAnimationFrame(dockTick);\n}\ndocument.addEventListener('visibilitychange', () => { if (!document.hidden) startDockLoop(); });\naddEventListener('scroll', () => {\n  const scrolled = String(scrollY > 6);\n  if (root.dataset.scrolled !== scrolled) root.dataset.scrolled = scrolled;\n}, { passive: true });\n\nfunction updateMute() {\n  const b = $('[data-action=\"mute\"]');\n  if (!b) return;\n  const glyph = prefs.volume === 0 ? 'mute' : prefs.volume < 45 ? 'volume-low' : 'volume';\n  b.querySelector('use').setAttribute('href', '#i-' + glyph);\n  b.setAttribute('aria-label', prefs.volume ? 'Выключить звук' : 'Включить звук');\n}\n\n// ── действия ──\nconst ACTIONS = {\n  'play-track': b => actionsModule.playFrom(b.dataset.source, b.dataset.id),\n  like: b => {\n    const track = catalogue.get(b.dataset.id);\n    if (!track) return;\n    const on = toggleLike(track);\n    haptic(on ? 'success' : 'light');\n    if (on && player.P.wave && player.P.track?.id === track.id) player.P.wave.liked.push(track.id);\n  },\n  'like-current': () => player.likeCurrent(),\n  'dislike-current': () => player.P.track && player.dislikeTrack(player.P.track),\n  'track-menu': b => {\n    const row = b.closest('[data-q]');\n    actionsModule.openTrackMenu(catalogue.get(b.dataset.id), b, { inQueue: row ? Number(row.dataset.q) : -1 });\n  },\n  toggle: () => player.toggle(),\n  next: () => player.next(),\n  prev: () => player.prev(),\n  shuffle: () => { player.setShuffle(); haptic('select'); },\n  repeat: () => { player.cycleRepeat(); haptic('select'); },\n  mute: () => { if (prefs.volume) { lastVolume = prefs.volume; setPref('volume', 0); } else setPref('volume', lastVolume || 80); },\n  'player-open': () => full.open(),\n  'player-close': () => full.close(),\n  'player-lyrics': () => { full.open('lyrics'); },\n  'player-queue': () => { full.open('queue'); },\n  'player-panel': b => full.setPanel(b.dataset.panel),\n  'player-menu': b => actionsModule.openPlayerMenu(b),\n  'player-artist': () => { const t = player.P.track; if (t) navigate(t.artistId ? `/artist/${t.artistId}` : `/artist?name=${encodeURIComponent(t.artist)}`); },\n  'queue-remove': b => player.removeAt(Number(b.dataset.index)),\n  'lyrics-follow': () => full.followLyrics(),\n  'lyrics-shift': b => full.shiftLyrics(Number(b.dataset.value)),\n  'lyrics-size': () => full.cycleLyricSize(),\n  'sleep-menu': b => actionsModule.openSleepMenu(b),\n  'wave-toggle': () => actionsModule.toggleWave(),\n  'wave-tune': () => actionsModule.openWaveTuner(),\n  'wave-option': b => actionsModule.setWaveOption(b),\n  'wave-apply': () => actionsModule.applyWave(),\n  'shared-wave': b => { closeSheet(); player.startWave({ seed: b.dataset.id, label: 'Волна по треку' }); },\n  'sheet-close': () => closeSheet(),\n  'theme-cycle': () => {\n    const order = ['system', 'dark', 'light'];\n    setPref('theme', order[(order.indexOf(prefs.theme) + 1) % 3]);\n    haptic('select');\n  },\n  'set-pref': b => {\n    const { key, value } = b.dataset;\n    setPref(key, value);\n    haptic('select');\n    if (key.startsWith('wave') && player.isWave()) player.retuneWave();\n  },\n  fullscreen: () => {\n    if (inTelegram && tg.isVersionAtLeast?.('8.0')) { tg.isFullscreen ? tg.exitFullscreen() : tg.requestFullscreen(); return; }\n    if (document.fullscreenElement) document.exitFullscreen?.(); else root.requestFullscreen?.().catch(() => {});\n  },\n  'history-back': () => goBack(),\n  'search-clear': () => { const input = $('#search-input'); input.value = ''; onSearchInput(); input.focus(); },\n  'search-suggest': b => { const input = $('#search-input'); input.value = b.dataset.value; onSearchInput(true); },\n  'retry-home': () => home.load(true),\n  'library-play': b => library.playAll(b.dataset.value, false),\n  'library-shuffle': b => library.playAll(b.dataset.value, true),\n  ...search.actions, ...library.actions, ...detail.actions, ...settings.actions,\n};\n\ndocument.addEventListener('click', event => {\n  const link = event.target.closest('a[data-link]');\n  if (link && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {\n    event.preventDefault();\n    haptic('select');\n    navigate(link.getAttribute('href'), { replace: link.hasAttribute('data-replace') });\n    return;\n  }\n  const control = event.target.closest('[data-action]');\n  if (!control || control.disabled || control.getAttribute('aria-disabled') === 'true') return;\n  const handler = ACTIONS[control.dataset.action];\n  if (!handler) return;\n  if (['toggle', 'play-track', 'wave-toggle', 'next', 'prev', 'detail-play', 'detail-shuffle', 'library-play', 'library-shuffle', 'wave-apply'].includes(control.dataset.action)) player.engine.ensureContext();\n  handler(control, event);\n});\n\ndocument.addEventListener('change', event => {\n  const input = event.target;\n  if (input.matches('input[data-pref]')) {\n    setPref(input.dataset.pref, input.checked);\n    haptic('select');\n    if (input.dataset.pref === 'crossfade' && page?.page === 'settings') render('none', scrollY);\n  }\n});\n\n// ── поиск ──\nconst searchInput = $('#search-input');\nfunction onSearchInput(immediate = false) {\n  const value = searchInput.value;\n  $('[data-action=\"search-clear\"]').hidden = !value;\n  if (page?.page !== 'search') {\n    navigate('/search' + (value.trim() ? '?q=' + encodeURIComponent(value.trim()) : ''));\n    return;\n  }\n  search.setQuery(value, { immediate });\n}\nsearchInput.addEventListener('input', () => onSearchInput());\n$('#searchbar').addEventListener('submit', event => {\n  event.preventDefault();\n  onSearchInput(true);\n  if (coarseInput()) searchInput.blur();\n});\nsearchInput.addEventListener('focus', () => { if (page?.page !== 'search' && wide.matches) root.dataset.searchFocus = 'true'; });\nsearchInput.addEventListener('blur', () => { delete root.dataset.searchFocus; });\n\n// ── горячие клавиши ──\ndocument.addEventListener('keydown', event => {\n  if (event.target.closest('input, textarea, [contenteditable]') || event.altKey || event.ctrlKey || event.metaKey) {\n    if (event.key === 'Escape' && event.target === searchInput) searchInput.blur();\n    return;\n  }\n  const P = player.P;\n  switch (event.key) {\n    case ' ': if (event.target.closest('button, a, [role=\"slider\"]')) return; event.preventDefault(); player.engine.ensureContext(); player.toggle(); break;\n    case '/': event.preventDefault(); searchInput.focus(); break;\n    case 'ArrowRight': if (P.track && !event.target.closest('[role=\"slider\"]')) { event.preventDefault(); player.seek(player.position() + (event.shiftKey ? 30 : 10)); } break;\n    case 'ArrowLeft': if (P.track && !event.target.closest('[role=\"slider\"]')) { event.preventDefault(); player.seek(player.position() - (event.shiftKey ? 30 : 10)); } break;\n    case 'ArrowUp': if (!event.target.closest('[role=\"slider\"]') && !sheetKind()) { event.preventDefault(); setPref('volume', Math.min(100, prefs.volume + 5)); } break;\n    case 'ArrowDown': if (!event.target.closest('[role=\"slider\"]') && !sheetKind()) { event.preventDefault(); setPref('volume', Math.max(0, prefs.volume - 5)); } break;\n    case 'l': case 'д': player.likeCurrent(); break;\n    case 'n': case 'т': player.next(); break;\n    case 'p': case 'з': player.prev(); break;\n    case 'm': case 'ь': ACTIONS.mute(); break;\n    case 'f': case 'а': full.isOpen() ? full.close() : full.open(); break;\n    case 't': case 'е': full.open('lyrics'); break;\n    default: return;\n  }\n});\n\n// ── Telegram ──\nfunction setInsets() {\n  if (!inTelegram) return;\n  for (const [side, key] of Object.entries({ top: 't', bottom: 'b', left: 'l', right: 'r' })) {\n    root.style.setProperty('--tg-' + key, ((tg.safeAreaInset?.[side] || 0) + (tg.contentSafeAreaInset?.[side] || 0)) + 'px');\n  }\n  root.dataset.tgFullscreen = String(!!tg.isFullscreen);\n  $('#fullscreen-btn').hidden = !tg.isVersionAtLeast?.('8.0') || ['android', 'ios'].includes(tg.platform);\n}\n\nfunction initTelegram() {\n  if (!inTelegram) {\n    $('#fullscreen-btn').hidden = !document.fullscreenEnabled;\n    return;\n  }\n  root.dataset.telegram = 'true';\n  tg.ready();\n  tg.expand();\n  if (tg.isVersionAtLeast?.('7.7')) tg.disableVerticalSwipes?.();\n  if (tg.isVersionAtLeast?.('8.0') && ['android', 'ios'].includes(tg.platform)) { try { tg.requestFullscreen(); } catch {} }\n  for (const event of ['safeAreaChanged', 'contentSafeAreaChanged', 'fullscreenChanged', 'viewportChanged']) tg.onEvent(event, setInsets);\n  tg.onEvent('fullscreenFailed', () => { tg.expand(); setInsets(); });\n  tg.onEvent('themeChanged', () => { if (prefs.theme === 'system') applyPrefs('theme'); });\n  tg.BackButton?.onClick(goBack);\n  if (tg.SettingsButton) { tg.SettingsButton.show(); tg.SettingsButton.onClick(() => navigate('/settings')); }\n  setInsets();\n  if (tgUser) {\n    const box = $('#profile');\n    box.hidden = false;\n    box.innerHTML = `${tgUser.photo_url && safeUrl(tgUser.photo_url, 'tg') ? `<img src=\"${esc(tgUser.photo_url)}\" alt=\"\">` : `<span class=\"avatar\">${icon('user')}</span>`}<span><strong>${esc(tgUser.first_name || '')}</strong><small>${tgUser.username ? '@' + esc(tgUser.username) : 'Telegram'}</small></span>`;\n  }\n}\n\n// ── подписки на события ──\nbus.on('player:track', () => { updateDockTrack(); updateControls(); });\nbus.on('player:state', updateControls);\nbus.on('player:wave', updateControls);\nbus.on('player:time', startDockLoop);\nbus.on('player:colors', colors => { home.setHeroColors(colors); railOrb?.setColors(colors); });\nbus.on('library', event => {\n  refreshLikes($('#view'));\n  updateLikeCurrent();\n  if (page?.page === 'library') library.refresh(page.tab);\n  if (page?.page === 'home' && (event.kind === 'recent' || event.kind === '*' || event.cleared)) home.refreshRecent();\n  if (page?.page === 'settings') settings.refreshTaste();\n  markRows();\n});\nbus.on('prefs', key => {\n  applyPrefs(key);\n  if (key === 'taste' && page?.page === 'settings') settings.refreshTaste();\n  if (key.startsWith?.('wave')) home.refreshHero();\n});\nbus.on('rows', markRows);\n\n// ── запуск ──\nasync function boot() {\n  applyPrefs();\n  initTelegram();\n  full.init();\n  seekSlider = new Slider($('[data-slider=\"seek\"]', dock), {\n    onInput: v => { $('[data-time=\"pos\"]', dock).textContent = clock(v * player.duration()); },\n    onCommit: v => player.seek(v * player.duration()),\n    label: v => clock(v * player.duration()),\n  });\n  volumeSlider = new Slider($('[data-slider=\"volume\"]', dock), {\n    onInput: v => { setPref('volume', Math.round(v * 100)); },\n    step: .05,\n  });\n  volumeSlider.set(prefs.volume / 100);\n  updateMute();\n  if (wide.matches) {\n    railOrb = new WaveVisual($('.rail-wave canvas'), { levels: () => player.engine.levels(), shape: 'orb' });\n    railOrb.start();\n  }\n  history.replaceState({ depth: 0 }, '');\n  updateDockTrack();\n  updateControls();\n  await render('none');\n  root.dataset.ready = 'true';\n\n  api('config').then(config => {\n    window.__lofiConfig = { ...FALLBACK_CONFIG, ...config };\n    if (page?.page === 'home' && JSON.stringify(config.moods) !== JSON.stringify(FALLBACK_CONFIG.moods)) render('none', scrollY);\n  }).catch(() => {});\n  hydrate().then(() => { if (page?.page === 'home') home.refreshRecent(); });\n\n  // Параметры запуска: ?page=wave, ?track=123, ?q=..., start_param из прямой ссылки.\n  const params = new URLSearchParams(location.search);\n  const start = inTelegram ? tg.initDataUnsafe?.start_param || '' : '';\n  const trackId = params.get('track') || start.match(/^t_(\\d{1,15})$/)?.[1];\n  const q = params.get('q');\n  if (trackId && /^\\d{1,15}$/.test(trackId)) actionsModule.openSharedTrack(trackId);\n  else if (params.get('page') === 'wave' || start === 'w' || start === 'wave') {\n    setTimeout(() => { if (!player.P.track) player.startWave({ quiet: true }); }, 300);\n  } else if (q && location.pathname !== '/search') navigate('/search?q=' + encodeURIComponent(q), { replace: true });\n  else if (params.get('page') && ['search', 'library'].includes(params.get('page'))) navigate('/' + params.get('page'), { replace: true });\n}\n\nboot();\n",
  "/js/pages/detail.js": "// Страницы альбома, артиста и подборки под настроение.\n\nimport { $, esc, icon, api, plural, clock, safeUrl, artSize, tg, inTelegram } from '../core.js';\nimport { trackList, skeletonRows, empty, cover, formatCount, viewAlive, currentViewToken } from '../ui.js';\nimport { registerList } from '../actions.js';\nimport { moodArt } from './home.js';\nimport * as player from '../player/player.js';\n\nconst cache = new Map();\nlet current = null;\n\nexport function render(kind, id, name = '') {\n  const key = `${kind}:${id || name}`;\n  const data = cache.get(key);\n  current = { kind, id, name, key, page: data?.page || 0, data };\n  return `<div class=\"detail\" data-kind=\"${kind}\">${headHtml()}<div id=\"detail-body\">${data ? bodyHtml() : skeletonRows(8)}</div></div>`;\n}\n\nfunction headHtml() {\n  const { kind, data, name, id } = current;\n  const album = data?.album;\n  const title = data?.label || album?.title || name || (kind === 'mood' ? '' : '');\n  const art = kind === 'album' ? album?.artwork : kind === 'artist' ? data?.portrait : '';\n  const playable = data?.items?.some(t => t.available !== false);\n  const total = data?.items?.reduce((s, t) => s + (t.dur || 0), 0) || 0;\n  const meta = [];\n  if (kind === 'album' && album) {\n    meta.push(`<a class=\"link\" href=\"${album.artistId ? '/artist/' + esc(album.artistId) : '/artist?name=' + encodeURIComponent(album.artist)}\" data-link>${esc(album.artist)}</a>`);\n    if (album.year) meta.push(esc(album.year));\n    if (album.count) meta.push(`${album.count} ${plural(album.count, 'трек', 'трека', 'треков')}`);\n    if (total) meta.push(clock(total));\n  }\n  if (kind === 'artist' && data) {\n    if (data.followers) meta.push(`${formatCount(data.followers)} слушателей`);\n    if (data.items?.length) meta.push(`${data.items.length} ${plural(data.items.length, 'трек', 'трека', 'треков')}`);\n  }\n  if (kind === 'mood' && data?.note) meta.push(esc(data.note));\n  const label = { album: 'Альбом', artist: 'Артист', mood: 'Подборка' }[kind];\n  const backdrop = safeUrl(art);\n  return `<header class=\"detail-head${kind === 'artist' ? ' is-artist' : ''}\">\n      ${backdrop ? `<div class=\"detail-backdrop\" style=\"background-image:url('${esc(artSize(backdrop, 't300x300'))}')\" aria-hidden=\"true\"></div>` : ''}\n      <div class=\"detail-art\">${kind === 'mood' ? `<span class=\"cover mood-cover\" data-mood=\"${esc(id)}\">${moodArt(id)}</span>` : cover(art, { size: 't500x500', cls: kind === 'artist' ? 'round' : '', eager: true })}</div>\n      <div class=\"detail-copy\">\n        <small class=\"eyebrow\">${label}${data?.verified ? ' · ' + icon('check', 'verified') + ' подтверждён' : ''}</small>\n        <h1 class=\"${title ? '' : 'sk sk-title'}\">${esc(title)}</h1>\n        <p class=\"detail-meta\">${data ? meta.join('<span class=\"dot-sep\">·</span>') : '<i class=\"sk sk-line short\"></i>'}</p>\n        <div class=\"detail-actions\">\n          <button class=\"btn primary\" type=\"button\" data-action=\"detail-play\" ${playable ? '' : 'disabled'}>${icon('play')}<span>Слушать</span></button>\n          <button class=\"btn glass\" type=\"button\" data-action=\"detail-shuffle\" ${playable ? '' : 'disabled'}>${icon('shuffle')}<span>Перемешать</span></button>\n          ${kind !== 'mood' ? `<button class=\"btn glass\" type=\"button\" data-action=\"detail-wave\" ${playable ? '' : 'disabled'} title=\"Моя волна на основе этой музыки\">${icon('logo')}<span>Волна</span></button>` : ''}\n          ${kind === 'album' && safeUrl(album?.url, 'sc') ? `<button class=\"icon-btn glass\" type=\"button\" data-action=\"open-external\" data-url=\"${esc(album.url)}\" aria-label=\"Открыть в SoundCloud\">${icon('external')}</button>` : ''}\n        </div>\n      </div>\n    </header>`;\n}\n\nfunction bodyHtml() {\n  const { kind, data } = current;\n  if (data?.error) return empty('cloud', data.error, '', '<button class=\"btn glass\" type=\"button\" data-action=\"detail-retry\">Повторить</button>');\n  const items = data?.items || [];\n  if (!items.length) return empty('note', 'Здесь пока нет треков');\n  const source = 'detail';\n  registerList(source, items, { type: kind, label: data.label || '', href: location.pathname + location.search });\n  return `${data.bio ? `<details class=\"bio\"><summary>Об артисте</summary><p>${esc(data.bio)}</p></details>` : ''}\n    ${trackList(items, { source, number: kind === 'album' })}\n    ${data.more ? `<div class=\"more\"><button class=\"btn glass\" type=\"button\" data-action=\"detail-more\">Загрузить ещё</button></div>` : ''}`;\n}\n\nexport async function load(retry = false) {\n  const state = current;\n  if (!state || (state.data && !retry)) return;\n  const token = currentViewToken();\n  try {\n    const params = state.kind === 'artist' ? { id: state.id, name: state.name } : { id: state.id };\n    const data = await api(state.kind, { params });\n    state.data = data;\n    cache.set(state.key, data);\n    if (cache.size > 30) cache.delete(cache.keys().next().value);\n  } catch (error) {\n    state.data = { error: error.message };\n  }\n  if (current !== state || !viewAlive(token)) return;\n  repaint();\n}\n\nfunction repaint() {\n  const head = $('.detail-head');\n  if (head) head.outerHTML = headHtml();\n  const body = $('#detail-body');\n  if (body) { body.innerHTML = bodyHtml(); body.classList.add('fade-in'); }\n}\n\nasync function more(button) {\n  const state = current;\n  if (!state?.data) return;\n  button.disabled = true;\n  button.innerHTML = '<span class=\"spinner inline\"></span>';\n  try {\n    const page = (state.page || 0) + 1;\n    const next = await api(state.kind, { params: { id: state.id, page } });\n    if (current !== state) return;\n    state.page = page;\n    state.data = { ...state.data, items: [...state.data.items, ...next.items], more: next.more, page };\n    cache.set(state.key, state.data);\n    const body = $('#detail-body');\n    if (body) body.innerHTML = bodyHtml();\n  } catch {\n    button.disabled = false;\n    button.textContent = 'Повторить загрузку';\n  }\n}\n\nexport const actions = {\n  'detail-play': () => { const items = current?.data?.items || []; if (player.P.shuffle) player.setShuffle(false); player.playList(items, Math.max(0, items.findIndex(t => t.available !== false)), { type: current.kind, label: current.data.label, href: location.pathname + location.search }); },\n  'detail-shuffle': () => { const items = (current?.data?.items || []).filter(t => t.available !== false); if (!items.length) return; player.setShuffle(true); player.playList(items, Math.floor(Math.random() * items.length), { type: current.kind, label: current.data.label, href: location.pathname + location.search }); },\n  'detail-wave': () => { const first = current?.data?.items?.find(t => t.available !== false); if (first) player.startWave({ seed: first.id, label: 'Волна: ' + (current.data.label || '') }); },\n  'detail-more': more,\n  'detail-retry': () => { if (current) { current.data = null; $('#detail-body').innerHTML = skeletonRows(8); load(true); } },\n  'open-external': b => { const url = safeUrl(b.dataset.url, 'sc'); if (url) inTelegram ? tg.openLink(url) : window.open(url, '_blank', 'noopener'); },\n};\n",
  "/js/pages/home.js": "// Главная: «Моя волна», подборки под настроение, недавнее, альбомы и популярное.\n\nimport { $, esc, icon, api, bus, tgUser } from '../core.js';\nimport { state } from '../store.js';\nimport { trackRow, albumCard, sectionHead, skeletonRows, skeletonCards, empty, viewAlive, currentViewToken } from '../ui.js';\nimport { registerList, waveSummary } from '../actions.js';\nimport * as player from '../player/player.js';\nimport { engine } from '../player/player.js';\nimport { WaveVisual } from '../wave-visual.js';\n\nlet shelves = { home: null, releases: null };\nlet visual = null;\n\nfunction greeting() {\n  const h = new Date().getHours();\n  const word = h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : h < 23 ? 'Добрый вечер' : 'Доброй ночи';\n  return word + (tgUser?.first_name ? ', ' + tgUser.first_name : '');\n}\n\n/** Генеративные обложки подборок: у каждой свой линейный узор. */\nexport function moodArt(id) {\n  const lines = [];\n  const add = d => lines.push(`<path d=\"${d}\"/>`);\n  switch (id) {\n    case 'focus': for (let i = 1; i <= 7; i++) lines.push(`<circle cx=\"150\" cy=\"80\" r=\"${i * 13}\"/>`); break;\n    case 'rain': for (let i = 0; i < 22; i++) { const x = (i * 37) % 300, y = (i * 53) % 150; add(`M${x} ${y}l-10 26`); } break;\n    case 'night': add('M206 34a36 36 0 1 0 30 56 30 30 0 1 1-30-56z'); for (let i = 0; i < 14; i++) lines.push(`<circle cx=\"${(i * 71) % 290 + 8}\" cy=\"${(i * 29) % 140 + 6}\" r=\"1.4\" class=\"dot\"/>`); break;\n    case 'drive': for (let i = -6; i <= 6; i++) add(`M150 60L${150 + i * 48} 170`); for (let i = 0; i < 5; i++) add(`M0 ${80 + i * i * 4}h300`); break;\n    case 'energy': for (let r = 0; r < 4; r++) add(`M0 ${40 + r * 26}` + Array.from({ length: 12 }, (_, i) => `L${(i + 1) * 26} ${40 + r * 26 + (i % 2 ? -14 : 14)}`).join('')); break;\n    case 'sleep': for (let r = 0; r < 6; r++) add(`M0 ${50 + r * 16}c50-${10 + r * 2} 100-${10 + r * 2} 150 0s100 ${10 + r * 2} 150 0`); break;\n    default: for (let r = 0; r < 5; r++) add(`M0 ${40 + r * 20}c50-20 100-20 150 0s100 20 150 0`);\n  }\n  return `<svg class=\"mood-art\" viewBox=\"0 0 300 160\" preserveAspectRatio=\"xMidYMid slice\" aria-hidden=\"true\">${lines.join('')}</svg>`;\n}\n\nfunction heroState() {\n  const wave = player.P.wave;\n  const playing = player.isWave() && player.isPlaying();\n  const loading = !!wave?.loading || (player.isWave() && player.P.status === 'loading' && player.P.want);\n  const track = player.isWave() ? player.P.track : null;\n  return { playing, loading, track };\n}\n\nfunction heroControls() {\n  const { playing, loading, track } = heroState();\n  const chips = waveSummary();\n  return `\n    <p class=\"hero-sub\" data-hero-sub>${track ? `Сейчас: <b>${esc(track.title)}</b> · ${esc(track.artist)}` : 'Бесконечный поток музыки, который подстраивается под ваш вкус'}</p>\n    <div class=\"hero-actions\">\n      <button class=\"btn primary lg${loading ? ' is-loading' : ''}\" type=\"button\" data-action=\"wave-toggle\">${icon(playing ? 'pause' : 'play')}<span>${playing ? 'Пауза' : player.isWave() ? 'Продолжить' : 'Слушать'}</span><span class=\"spinner\" aria-hidden=\"true\"></span></button>\n      <button class=\"btn glass round lg\" type=\"button\" data-action=\"wave-tune\" aria-label=\"Настроить волну\" title=\"Настроить волну\">${icon('tune')}</button>\n    </div>\n    ${chips.length ? `<div class=\"hero-chips\">${chips.map(c => `<span class=\"chip\">${esc(c)}</span>`).join('')}</div>` : ''}`;\n}\n\nexport function render() {\n  const moods = window.__lofiConfig?.moods || [];\n  return `\n    <section class=\"hero\" data-hero>\n      <canvas class=\"hero-canvas\" aria-hidden=\"true\"></canvas>\n      <div class=\"hero-content\">\n        <p class=\"eyebrow\">${esc(greeting())}</p>\n        <h1 class=\"hero-title\">Моя волна</h1>\n        <div class=\"hero-controls\" data-hero-controls>${heroControls()}</div>\n      </div>\n    </section>\n    <section class=\"block reveal\" style=\"--i:1\">\n      ${sectionHead('Под настроение')}\n      <div class=\"moods\">${moods.map((m, i) => `\n        <a class=\"mood\" href=\"/mood/${esc(m.id)}\" data-link data-mood=\"${esc(m.id)}\" style=\"--i:${i}\">\n          ${moodArt(m.id)}<span class=\"mood-text\"><strong>${esc(m.name)}</strong><small>${esc(m.note)}</small></span>\n          <span class=\"mood-go\">${icon('arrow-right')}</span></a>`).join('')}</div>\n    </section>\n    <section class=\"block reveal\" style=\"--i:2\" data-recent-block>${recentBlock()}</section>\n    <section class=\"block reveal\" style=\"--i:3\" data-releases-block>\n      ${sectionHead('Альбомы для настроения')}\n      <div data-releases>${shelves.releases ? releasesHtml() : skeletonCards(6)}</div>\n    </section>\n    <section class=\"block reveal\" style=\"--i:4\">\n      ${sectionHead('Популярное в Lo-fi')}\n      <div data-home-tracks>${shelves.home ? homeHtml() : skeletonRows(6)}</div>\n    </section>`;\n}\n\nfunction recentBlock() {\n  const items = state.recent.slice(0, 12);\n  if (!items.length) return '';\n  registerList('home-recent', items, { type: 'library', label: 'Недавнее', href: '/library/history' });\n  return `${sectionHead('Недавнее', '/library/history', 'Вся история')}\n    <div class=\"row-grid\">${items.map((t, i) => trackRow(t, { source: 'home-recent', index: i, compact: true })).join('')}</div>`;\n}\nfunction releasesHtml() {\n  const items = shelves.releases?.items || [];\n  return items.length ? `<div class=\"shelf\">${items.map(albumCard).join('')}</div>` : empty('disc', 'Альбомы пока недоступны');\n}\nfunction homeHtml() {\n  if (shelves.home?.error) return empty('cloud', 'Подборка не загрузилась', shelves.home.error, '<button class=\"btn glass\" type=\"button\" data-action=\"retry-home\">Обновить</button>');\n  const items = shelves.home?.items || [];\n  registerList('home', items, { type: 'home', label: 'Популярное', href: '/' });\n  return `<div class=\"rows\">${items.map((t, i) => trackRow(t, { source: 'home', index: i })).join('')}</div>`;\n}\n\nexport async function load(force = false) {\n  const token = currentViewToken();\n  if (force) shelves = { home: null, releases: null };\n  const tasks = [];\n  if (!shelves.home) tasks.push(api('home').then(d => { shelves.home = d; }).catch(e => { shelves.home = { error: e.message, items: [] }; }).then(() => {\n    const box = $('[data-home-tracks]');\n    if (box && viewAlive(token)) { box.innerHTML = homeHtml(); box.classList.add('fade-in'); bus.emit('rows'); }\n  }));\n  if (!shelves.releases) tasks.push(api('releases').then(d => { shelves.releases = d; }).catch(() => { shelves.releases = { items: [] }; }).then(() => {\n    const box = $('[data-releases]');\n    if (box && viewAlive(token)) { box.innerHTML = releasesHtml(); box.classList.add('fade-in'); }\n  }));\n  await Promise.all(tasks);\n}\n\nexport function mount(page) {\n  visual?.destroy();\n  const canvas = $('.hero-canvas', page);\n  visual = new WaveVisual(canvas, { levels: () => engine.levels(), lines: 7 });\n  visual.setActive(player.isWave() && player.isPlaying());\n  visual.start();\n  if (shelves.home) registerList('home', shelves.home.items || [], { type: 'home', label: 'Популярное', href: '/' });\n  void load();\n}\nexport function unmount() { visual?.destroy(); visual = null; }\n\nexport function refreshHero() {\n  const box = $('[data-hero-controls]');\n  if (box) box.innerHTML = heroControls();\n  visual?.setActive(player.isWave() && player.isPlaying());\n}\nexport function refreshRecent() {\n  const box = $('[data-recent-block]');\n  if (box) box.innerHTML = recentBlock();\n}\nexport const setHeroColors = colors => visual?.setColors(colors);\n",
  "/js/pages/library.js": "// Медиатека: избранное, история и скрытые треки.\n\nimport { $, esc, icon, plural } from '../core.js';\nimport { state, clearList, setDislike } from '../store.js';\nimport { trackList, empty, cover } from '../ui.js';\nimport { registerList } from '../actions.js';\nimport * as player from '../player/player.js';\n\nconst TABS = [['favorites', 'Избранное', 'heart'], ['history', 'История', 'clock'], ['hidden', 'Скрытые', 'eye-off']];\n\nexport const tabFromPath = path => ({ '/library/history': 'history', '/library/hidden': 'hidden' })[path] || 'favorites';\n\nfunction items(tab) { return tab === 'history' ? state.recent : tab === 'hidden' ? state.dislikes : state.favorites; }\n\nexport function render(tab) {\n  return `\n    <header class=\"page-head\"><h1>Медиатека</h1></header>\n    <nav class=\"segmented\" aria-label=\"Разделы медиатеки\">\n      ${TABS.map(([key, label, glyph]) => `<a class=\"seg\" href=\"/library${key === 'favorites' ? '' : '/' + key}\" data-link data-replace aria-current=\"${key === tab ? 'page' : 'false'}\">${icon(glyph)}<span>${label}</span><small>${items(key).length || ''}</small></a>`).join('')}\n    </nav>\n    <div id=\"library-body\">${body(tab)}</div>`;\n}\n\nfunction body(tab) {\n  const list = items(tab);\n  if (!list.length) {\n    if (tab === 'favorites') return empty('heart', 'Здесь будут любимые треки', 'Нажмите на сердечко рядом с треком — он сохранится в избранном и подскажет волне ваш вкус.', '<a class=\"btn glass\" href=\"/search\" data-link>Найти музыку</a>');\n    if (tab === 'history') return empty('clock', 'История пока пуста', 'Здесь появятся треки, которые вы слушали.', '<button class=\"btn primary\" type=\"button\" data-action=\"wave-toggle\">' + icon('play') + '<span>Включить волну</span></button>');\n    return empty('eye-off', 'Скрытых треков нет', 'Треки с отметкой «Не нравится» не попадут в волну и подборки.');\n  }\n  if (tab === 'hidden') {\n    return `<div class=\"list-actions\"><span class=\"muted\">${list.length} ${plural(list.length, 'трек', 'трека', 'треков')}</span><button class=\"btn ghost sm\" type=\"button\" data-action=\"library-clear\" data-value=\"dislike\">${icon('trash')}<span>Очистить</span></button></div>\n      <div class=\"rows\">${list.map((t, i) => `<div class=\"row\" style=\"--i:${Math.min(i, 14)}\"><span class=\"row-lead\">${cover(t.artwork, { size: 't120x120' })}</span>\n        <span class=\"row-text\"><strong>${esc(t.title)}</strong><small>${esc(t.artist)}</small></span>\n        <button class=\"btn ghost sm\" type=\"button\" data-action=\"unhide\" data-id=\"${esc(t.id)}\">${icon('refresh')}<span>Вернуть</span></button></div>`).join('')}</div>`;\n  }\n  const source = 'library-' + tab;\n  registerList(source, list, { type: 'library', label: tab === 'history' ? 'История' : 'Избранное', href: '/library' + (tab === 'history' ? '/history' : '') });\n  return `<div class=\"list-actions\">\n      <button class=\"btn primary\" type=\"button\" data-action=\"library-play\" data-value=\"${source}\">${icon('play')}<span>Слушать</span></button>\n      <button class=\"btn glass\" type=\"button\" data-action=\"library-shuffle\" data-value=\"${source}\">${icon('shuffle')}<span>Перемешать</span></button>\n      <span class=\"spacer\"></span>\n      ${tab === 'history' ? `<button class=\"btn ghost sm\" type=\"button\" data-action=\"library-clear\" data-value=\"recent\">${icon('trash')}<span>Очистить</span></button>` : `<span class=\"muted\">${list.length} ${plural(list.length, 'трек', 'трека', 'треков')}</span>`}\n    </div>${trackList(list, { source })}`;\n}\n\nexport function refresh(tab) {\n  const box = $('#library-body');\n  if (box) { box.classList.add('static'); box.innerHTML = body(tab); }\n  for (const [key] of TABS) {\n    const counter = document.querySelector(`.seg[href=\"/library${key === 'favorites' ? '' : '/' + key}\"] small`);\n    if (counter) counter.textContent = items(key).length || '';\n  }\n}\n\nexport const actions = {\n  'library-clear': b => clearList(b.dataset.value),\n  unhide: b => { const t = state.dislikes.find(x => x.id === b.dataset.id); if (t) setDislike(t, false); },\n};\n\nexport function playAll(source, shuffle = false) {\n  const list = state[source === 'library-history' ? 'recent' : 'favorites'];\n  if (!list.length) return;\n  if (shuffle !== player.P.shuffle) player.setShuffle(shuffle);\n  const start = shuffle ? Math.floor(Math.random() * list.length) : 0;\n  player.playList(list, start, { type: 'library', label: source === 'library-history' ? 'История' : 'Избранное', href: '/library' });\n}\n",
  "/js/pages/search.js": "// Поиск: треки, альбомы и артисты, фильтр оригиналов, недавние запросы, бесконечная подгрузка.\n\nimport { $, $$, esc, icon, api } from '../core.js';\nimport { prefs, setPref, state, rememberSearch, forgetSearches } from '../store.js';\nimport { trackList, albumCard, artistCard, skeletonRows, skeletonGrid, empty, sectionHead } from '../ui.js';\nimport { registerList } from '../actions.js';\n\nconst S = { q: '', kind: 't', page: 0, result: null, loading: false, error: '', controller: null, more: false };\nlet observer = null;\nlet timer = 0;\n\nconst KINDS = [['t', 'Треки'], ['a', 'Альбомы'], ['u', 'Артисты']];\n\nexport function setQuery(q, { immediate = false } = {}) {\n  const value = q.trim();\n  clearTimeout(timer);\n  if (value === S.q && S.result && !immediate) return;\n  S.q = value;\n  if (value.length < 2) { abort(); S.result = null; S.error = ''; return paint(); }\n  if (immediate) return run();\n  S.loading = true;\n  paint();\n  timer = setTimeout(run, 320);\n}\nexport function setKind(kind) {\n  if (S.kind === kind) return;\n  S.kind = kind;\n  for (const b of $$('[data-action=\"search-kind\"]')) b.setAttribute('aria-pressed', String(b.dataset.value === kind));\n  syncUrl();\n  if (S.q.length >= 2) run();\n  else paint();\n}\nexport const query = () => S.q;\nexport const kind = () => S.kind;\n\nfunction abort() { S.controller?.abort(); S.controller = null; S.loading = false; }\n\nfunction syncUrl() {\n  const url = new URL(location.href);\n  if (url.pathname !== '/search') return;\n  if (S.q) url.searchParams.set('q', S.q); else url.searchParams.delete('q');\n  if (S.kind !== 't') url.searchParams.set('kind', S.kind); else url.searchParams.delete('kind');\n  history.replaceState(history.state, '', url.pathname + url.search);\n}\n\nasync function run(append = false) {\n  abort();\n  const controller = new AbortController();\n  S.controller = controller;\n  S.loading = true;\n  S.error = '';\n  const page = append ? S.page + 1 : 0;\n  if (!append) { S.result = null; paint(); }\n  else paintMore();\n  syncUrl();\n  try {\n    const data = await api('search', { params: { q: S.q, kind: S.kind, page, originals: prefs.originals ? 1 : 0 }, signal: controller.signal });\n    if (controller.signal.aborted) return;\n    S.result = append && S.result ? { ...data, items: [...S.result.items, ...data.items] } : data;\n    S.page = page;\n    S.more = !!data.more;\n    if (!append) rememberSearch(S.q);\n  } catch (error) {\n    if (error.name === 'AbortError') return;\n    S.error = error.message;\n  } finally {\n    if (S.controller === controller) { S.loading = false; S.controller = null; }\n  }\n  append ? appendResults() : paint();\n}\n\nexport function render() {\n  return `\n    <header class=\"page-head\"><h1>Поиск</h1></header>\n    <div class=\"filters\" role=\"toolbar\" aria-label=\"Что искать\">\n      ${KINDS.map(([value, label]) => `<button class=\"chip-btn\" type=\"button\" data-action=\"search-kind\" data-value=\"${value}\" aria-pressed=\"${S.kind === value}\">${label}</button>`).join('')}\n      <span class=\"filters-sep\"></span>\n      <button class=\"chip-btn toggle\" type=\"button\" data-action=\"search-originals\" aria-pressed=\"${prefs.originals}\" title=\"Скрыть перезаливы, ускоренные версии и сборники\">${icon('check')}<span>Только оригиналы</span></button>\n    </div>\n    <div class=\"search-results\" id=\"search-results\" aria-live=\"polite\"></div>`;\n}\n\nfunction resultsHtml() {\n  if (S.q.length < 2) return idleHtml();\n  if (S.error) return empty('cloud', S.error, '', '<button class=\"btn glass\" type=\"button\" data-action=\"search-retry\">Повторить</button>');\n  if (!S.result) return S.kind === 't' ? skeletonRows(8) : skeletonGrid(8, S.kind === 'u');\n  const r = S.result;\n  if (!r.items.length) return empty('search', 'Ничего не нашлось', r.hidden ? 'Часть версий скрыта фильтром «Только оригиналы» — попробуйте выключить его.' : 'Попробуйте другой запрос или ссылку SoundCloud.');\n  let head = '';\n  if (r.album) head = `<a class=\"result-banner\" href=\"/album/${esc(r.album.id)}\" data-link>${icon('disc')}<span>Альбом «${esc(r.album.title)}»</span>${icon('forward')}</a>`;\n  else if (r.artist) head = `<a class=\"result-banner\" href=\"/artist/${esc(r.artist.id)}\" data-link>${icon('user')}<span>${esc(r.artist.title)}</span>${icon('forward')}</a>`;\n  else if (r.label) head = sectionHead(r.label);\n  return head + itemsHtml(r.items, 0) + moreHtml();\n}\n\nfunction itemsHtml(items, offset) {\n  if (S.kind === 'a' && S.result?.kind === 'a') return `<div class=\"grid-cards\">${items.map((a, i) => albumCard(a, i + offset)).join('')}</div>`;\n  if (S.kind === 'u' && S.result?.kind === 'u') return `<div class=\"grid-cards\">${items.map((u, i) => artistCard(u, i + offset)).join('')}</div>`;\n  registerList('search', S.result.items, { type: 'search', label: 'Поиск: ' + S.q, href: '/search?q=' + encodeURIComponent(S.q) });\n  return trackList(items, { source: 'search' }).replace(/--i:(\\d+)/g, (_, n) => `--i:${Math.min(14, Number(n))}`);\n}\n\nconst moreHtml = () => S.more ? `<div class=\"more\" data-more><button class=\"btn glass\" type=\"button\" data-action=\"search-more\">${S.loading ? '<span class=\"spinner inline\"></span>' : 'Показать ещё'}</button></div>` : '';\n\nfunction idleHtml() {\n  const recent = state.searches;\n  const genres = window.__lofiConfig?.genres || [];\n  return `\n    ${recent.length ? `<section class=\"block\">${sectionHead('Вы искали')}\n      <div class=\"recent-searches\">${recent.map(q => `<button class=\"chip-btn\" type=\"button\" data-action=\"search-suggest\" data-value=\"${esc(q)}\">${icon('clock')}<span>${esc(q)}</span></button>`).join('')}\n      <button class=\"text-link\" type=\"button\" data-action=\"search-forget\">Очистить</button></div></section>` : ''}\n    <section class=\"block\">${sectionHead('Жанры и сцены')}\n      <div class=\"genres\">${genres.map((g, i) => `<button class=\"genre\" type=\"button\" data-action=\"search-suggest\" data-value=\"${esc(g.query)}\" style=\"--i:${i}\"><span>${esc(g.name)}</span>${icon('arrow-right')}</button>`).join('')}</div>\n    </section>\n    <p class=\"hint\">${icon('link')} Можно вставить ссылку SoundCloud на трек, альбом или артиста.</p>`;\n}\n\nfunction paint() {\n  const box = $('#search-results');\n  if (!box) return;\n  box.innerHTML = resultsHtml();\n  watchMore();\n}\nfunction paintMore() {\n  const more = $('[data-more] button');\n  if (more) more.innerHTML = '<span class=\"spinner inline\"></span>';\n}\nfunction appendResults() {\n  const box = $('#search-results');\n  if (!box || !S.result) return paint();\n  if (S.error) { const more = $('[data-more] button'); if (more) more.textContent = 'Повторить загрузку'; return; }\n  const shown = $$('.row, .grid-cards > .card', box).length;\n  const fresh = S.result.items.slice(shown);\n  $('[data-more]', box)?.remove();\n  const container = S.kind === 't' ? $('.rows', box) : $('.grid-cards', box);\n  if (!container) return paint();\n  const tmp = document.createElement('div');\n  tmp.innerHTML = itemsHtml(fresh, shown);\n  container.append(...tmp.firstElementChild.children);\n  box.insertAdjacentHTML('beforeend', moreHtml());\n  watchMore();\n}\n\nfunction watchMore() {\n  observer?.disconnect();\n  const sentinel = $('[data-more]');\n  if (!sentinel) return;\n  observer = new IntersectionObserver(entries => {\n    if (entries.some(e => e.isIntersecting) && !S.loading && S.more) run(true);\n  }, { rootMargin: '400px' });\n  observer.observe(sentinel);\n}\n\nexport function mount() {\n  const params = new URLSearchParams(location.search);\n  const q = params.get('q');\n  const kind = params.get('kind');\n  if (['t', 'a', 'u'].includes(kind)) S.kind = kind;\n  const input = $('#search-input');\n  if (q !== null && q !== S.q) { input.value = q; setQuery(q, { immediate: true }); }\n  else { if (S.q && input.value !== S.q) input.value = S.q; paint(); }\n  for (const b of $$('[data-action=\"search-kind\"]')) b.setAttribute('aria-pressed', String(b.dataset.value === S.kind));\n}\nexport function unmount() { observer?.disconnect(); }\n\nexport const actions = {\n  'search-kind': b => setKind(b.dataset.value),\n  'search-more': () => run(true),\n  'search-retry': () => run(),\n  'search-originals': b => { setPref('originals', !prefs.originals); b.setAttribute('aria-pressed', String(prefs.originals)); if (S.q.length >= 2) run(); },\n  'search-forget': () => { forgetSearches(); paint(); },\n};\n",
  "/js/pages/settings.js": "// Настройки: внешний вид, воспроизведение, караоке, «Моя волна», данные и сведения о приложении.\n\nimport { $, $$, esc, icon, inTelegram, tgUser, plural } from '../core.js';\nimport { prefs, setPref, setTaste, resetPrefs, tasteStats, clearList, forgetSearches, state } from '../store.js';\nimport { Slider, toast, cover } from '../ui.js';\nimport { WAVE_OPTIONS } from '../actions.js';\nimport * as player from '../player/player.js';\n\nconst seg = (key, options) => `<div class=\"segmented small\" role=\"radiogroup\">${options.map(([value, label]) =>\n  `<button class=\"seg\" type=\"button\" role=\"radio\" data-action=\"set-pref\" data-key=\"${key}\" data-value=\"${value}\" aria-checked=\"${prefs[key] === value}\">${label}</button>`).join('')}</div>`;\nconst toggle = (key, title, note = '') => `<label class=\"setting\">\n  <span class=\"setting-text\"><strong>${title}</strong>${note ? `<small>${note}</small>` : ''}</span>\n  <input class=\"switch\" type=\"checkbox\" data-pref=\"${key}\" ${prefs[key] ? 'checked' : ''}></label>`;\nconst row = (title, control, note = '') => `<div class=\"setting stacked\"><span class=\"setting-text\"><strong>${title}</strong>${note ? `<small>${note}</small>` : ''}</span>${control}</div>`;\nconst slider = (key, title, value, note = '') => `<div class=\"setting stacked\"><span class=\"setting-text\"><strong>${title}</strong>${note ? `<small>${note}</small>` : ''}</span>\n  <div class=\"setting-slider\"><div class=\"slider\" data-pref-slider=\"${key}\" role=\"slider\" tabindex=\"0\" aria-label=\"${esc(title)}\"><span class=\"slider-track\"><i class=\"slider-fill\"></i></span><span class=\"slider-thumb\"></span></div><output data-out=\"${key}\">${value}</output></div></div>`;\nconst group = (id, glyph, title, body) => `<section class=\"settings-group reveal\" id=\"${id}\"><h2>${icon(glyph)}${title}</h2><div class=\"settings-card\">${body}</div></section>`;\n\nconst SLIDERS = {\n  crossfadeSec: { min: 2, max: 12, step: 1, fmt: v => v + ' с' },\n  lyricOffset: { min: -5000, max: 5000, step: 100, fmt: v => (v > 0 ? '+' : v < 0 ? '−' : '') + (Math.abs(v) / 1000).toFixed(1).replace('.', ',') + ' с' },\n  volume: { min: 0, max: 100, step: 1, fmt: v => v + '%' },\n};\n\nfunction tasteHtml() {\n  const rows = tasteStats().slice(0, 14);\n  if (!rows.length) return '<p class=\"setting-note\">Послушайте несколько треков или добавьте их в избранное — здесь появятся ваши артисты, и вы сможете сказать волне, кого ставить чаще.</p>';\n  return rows.map(r => `<div class=\"taste-row\">\n      ${cover(r.track?.artwork, { size: 't120x120', cls: 'round' })}\n      <span class=\"taste-name\"><strong>${esc(r.name)}</strong><small>${r.share ? r.share + '% прослушиваний' : 'настроено вручную'}</small></span>\n      <div class=\"segmented tiny\">${[['often', 'Чаще'], ['normal', 'Как есть'], ['rare', 'Реже'], ['never', 'Нет']].map(([v, l]) =>\n        `<button class=\"seg\" type=\"button\" data-action=\"taste\" data-artist=\"${esc(r.name)}\" data-value=\"${v}\" aria-checked=\"${(prefs.taste[r.name] || 'normal') === v}\">${l}</button>`).join('')}</div>\n    </div>`).join('');\n}\n\nexport function render() {\n  const user = tgUser;\n  return `\n    <header class=\"page-head\"><h1>Настройки</h1></header>\n    <div class=\"settings\">\n      ${user || !inTelegram ? `<div class=\"profile-card reveal\">\n        ${user?.photo_url ? `<img class=\"avatar\" src=\"${esc(user.photo_url)}\" alt=\"\">` : `<span class=\"avatar\">${icon('user')}</span>`}\n        <span><strong>${esc(user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : 'Гость')}</strong>\n        <small>${user ? (user.username ? '@' + esc(user.username) + ' · ' : '') + 'медиатека синхронизируется' : 'Откройте Lo-fi в Telegram, чтобы медиатека сохранялась на всех устройствах'}</small></span>\n      </div>` : ''}\n      ${group('look', 'palette', 'Внешний вид',\n        row('Тема', seg('theme', [['system', 'Как в системе'], ['dark', 'Тёмная'], ['light', 'Светлая']]))\n        + toggle('glass', 'Эффект стекла', 'Размытие под панелями и плеером')\n        + toggle('dynamicColor', 'Цвет из обложки', 'Плеер и волна подхватывают оттенок трека')\n        + row('Анимации', seg('motion', [['full', 'Плавные'], ['reduced', 'Минимум']]), 'Системная настройка «уменьшить движение» учитывается всегда')\n        + row('Размер текста', seg('textScale', [['s', 'Мельче'], ['m', 'Обычный'], ['l', 'Крупнее']])))}\n      ${group('playback', 'speaker', 'Воспроизведение',\n        row('Качество', seg('quality', [['high', 'Высокое'], ['normal', 'Экономия трафика']]))\n        + toggle('gapless', 'Без пауз между треками', 'Следующий трек загружается заранее')\n        + toggle('crossfade', 'Плавный переход', 'Треки перетекают друг в друга')\n        + (prefs.crossfade ? slider('crossfadeSec', 'Длительность перехода', SLIDERS.crossfadeSec.fmt(prefs.crossfadeSec)) : '')\n        + toggle('normalize', 'Выравнивать громкость', 'Тихие и громкие треки звучат ровнее')\n        + toggle('autoplay', 'Продолжать «Моей волной»', 'Когда очередь закончится')\n        + toggle('originals', 'Только оригиналы в поиске', 'Скрывать перезаливы, ускоренные версии и сборники')\n        + toggle('canvas', 'Видеообложки', 'Если у трека есть анимированная обложка')\n        + row('Фон плеера', seg('playerBg', [['cover', 'Обложка'], ['wave', 'Волна'], ['plain', 'Однотонный']]))\n        + (inTelegram ? toggle('haptics', 'Вибрация', 'Лёгкий отклик на нажатия') : ''))}\n      ${group('karaoke', 'lyrics', 'Караоке',\n        row('Размер строк', seg('lyricSize', [['s', 'S'], ['m', 'M'], ['l', 'L'], ['xl', 'XL']]))\n        + toggle('lyricFollow', 'Следовать за текстом', 'Автопрокрутка к текущей строке')\n        + toggle('lyricBlur', 'Размывать дальние строки')\n        + slider('lyricOffset', 'Общий сдвиг текста', SLIDERS.lyricOffset.fmt(prefs.lyricOffset), 'Для одного трека сдвиг меняется прямо в плеере'))}\n      ${group('wave', 'logo', 'Моя волна',\n        Object.entries(WAVE_OPTIONS).map(([key, { title, items }]) => row(title, `<div class=\"tuner-chips\">${items.map(([value, label, glyph]) =>\n          `<button type=\"button\" class=\"tuner-chip\" data-action=\"set-pref\" data-key=\"${key}\" data-value=\"${value}\" aria-checked=\"${prefs[key] === value}\">${icon(glyph)}<span>${label}</span></button>`).join('')}</div>`)).join('')\n        + `<div class=\"setting stacked\"><span class=\"setting-text\"><strong>Вкус</strong><small>Подскажите волне, кого ставить чаще, а кого — никогда</small></span><div class=\"taste\" id=\"taste\">${tasteHtml()}</div></div>`)}\n      ${group('data', 'database', 'Данные',\n        `<div class=\"setting\"><span class=\"setting-text\"><strong>История прослушиваний</strong><small>${state.recent.length} ${plural(state.recent.length, 'трек', 'трека', 'треков')}</small></span><button class=\"btn ghost sm\" type=\"button\" data-action=\"settings-clear\" data-value=\"recent\">Очистить</button></div>\n        <div class=\"setting\"><span class=\"setting-text\"><strong>Скрытые треки</strong><small>${state.dislikes.length} ${plural(state.dislikes.length, 'трек', 'трека', 'треков')}</small></span><button class=\"btn ghost sm\" type=\"button\" data-action=\"settings-clear\" data-value=\"dislike\">Очистить</button></div>\n        <div class=\"setting\"><span class=\"setting-text\"><strong>История поиска</strong></span><button class=\"btn ghost sm\" type=\"button\" data-action=\"settings-clear\" data-value=\"search\">Очистить</button></div>\n        <div class=\"setting\"><span class=\"setting-text\"><strong>Настройки по умолчанию</strong><small>Вернуть всё как было при первом запуске</small></span><button class=\"btn ghost sm danger\" type=\"button\" data-action=\"settings-reset\">Сбросить</button></div>`)}\n      <section class=\"settings-group about reveal\">\n        <p>${icon('logo')} Lo-fi ${esc(window.__lofiConfig?.version || '')}</p>\n        <p>Музыка — SoundCloud. Тексты — LRCLIB, NetEase и lyrics.ovh. ${window.__lofiConfig?.cache ? 'Треки кешируются на сервере для мгновенного запуска.' : ''}</p>\n        <p class=\"muted\">Шрифт Manrope — SIL Open Font License 1.1.</p>\n      </section>\n    </div>`;\n}\n\nexport function mount(page) {\n  for (const el of $$('[data-pref-slider]', page)) {\n    const key = el.dataset.prefSlider, cfg = SLIDERS[key];\n    const toValue = r => Math.round((cfg.min + r * (cfg.max - cfg.min)) / cfg.step) * cfg.step;\n    const slider = new Slider(el, {\n      step: cfg.step / (cfg.max - cfg.min),\n      label: r => cfg.fmt(toValue(r)),\n      onInput: r => { $(`[data-out=\"${key}\"]`, page).textContent = cfg.fmt(toValue(r)); },\n      onCommit: r => setPref(key, toValue(r)),\n    });\n    slider.set((prefs[key] - cfg.min) / (cfg.max - cfg.min));\n  }\n}\n\nexport function refreshTaste() { const box = $('#taste'); if (box) box.innerHTML = tasteHtml(); }\n\nexport const actions = {\n  taste: b => {\n    setTaste(b.dataset.artist, b.dataset.value);\n    for (const s of b.parentElement.children) s.setAttribute('aria-checked', String(s === b));\n  },\n  'settings-clear': b => {\n    const kind = b.dataset.value;\n    if (kind === 'search') forgetSearches(); else clearList(kind);\n    toast('Очищено', { glyph: 'check' });\n    const note = b.parentElement.querySelector('small');\n    if (note && kind !== 'search') note.textContent = '0 треков';\n  },\n  'settings-reset': () => {\n    resetPrefs();\n    toast('Настройки сброшены', { glyph: 'refresh' });\n    if (player.isWave()) player.retuneWave();\n  },\n};\n",
  "/js/player/engine.js": "// Аудиодвижок: две деки <audio> для бесшовных переходов и кроссфейда, HLS через Hls.js,\n// Web Audio для громкости, нормализации и анализатора спектра, виджет SoundCloud как запасной путь.\n\nimport { isIOS } from '../core.js';\n\nconst HLS_URL = 'https://cdn.jsdelivr.net/npm/hls.js@1.6.16/dist/hls.light.min.js';\nconst scripts = new Map();\nfunction loadScript(url) {\n  if (!scripts.has(url)) {\n    const task = new Promise((resolve, reject) => {\n      const el = document.createElement('script');\n      const timer = setTimeout(() => { el.remove(); reject(Error('Скрипт не загрузился')); }, 9000);\n      el.src = url;\n      el.onload = () => { clearTimeout(timer); resolve(); };\n      el.onerror = () => { clearTimeout(timer); el.remove(); reject(Error('Скрипт недоступен')); };\n      document.head.append(el);\n    }).catch(error => { scripts.delete(url); throw error; });\n    scripts.set(url, task);\n  }\n  return scripts.get(url);\n}\n\nconst EVENTS = ['playing', 'pause', 'ended', 'error', 'waiting', 'canplay', 'timeupdate', 'durationchange', 'loadedmetadata', 'seeked', 'stalled'];\n\nclass Deck {\n  constructor() {\n    this.el = document.createElement('audio');\n    this.el.crossOrigin = 'anonymous';\n    this.el.preload = 'auto';\n    this.el.setAttribute('playsinline', '');\n    this.el.hidden = true;\n    document.body.append(this.el);\n    this.hls = null;\n    this.key = '';\n    this.gain = null;\n  }\n  async load(source, key) {\n    this.unload();\n    this.key = key;\n    if (source.protocol === 'hls' && !this.el.canPlayType('application/vnd.apple.mpegurl')) {\n      await loadScript(HLS_URL);\n      if (this.key !== key) return;\n      const Hls = window.Hls;\n      if (!Hls?.isSupported()) throw Error('HLS не поддерживается');\n      const hls = new Hls({ enableWorker: true, maxBufferLength: 40, backBufferLength: 30 });\n      this.hls = hls;\n      hls.on(Hls.Events.ERROR, (_event, data) => {\n        if (data.fatal && this.hls === hls) this.el.dispatchEvent(new Event('error'));\n      });\n      hls.loadSource(source.url);\n      hls.attachMedia(this.el);\n    } else {\n      this.el.src = source.url;\n      this.el.load();\n    }\n  }\n  unload() {\n    this.key = '';\n    if (this.hls) { this.hls.destroy(); this.hls = null; }\n    this.el.pause();\n    if (this.el.hasAttribute('src')) { this.el.removeAttribute('src'); try { this.el.load(); } catch {} }\n  }\n}\n\nexport class Engine extends EventTarget {\n  constructor() {\n    super();\n    this.decks = [new Deck(), new Deck()];\n    this.active = this.decks[0];\n    this.volume = 0.8;\n    this.normalize = false;\n    this.ctx = null;\n    this.fading = null;\n    this.smooth = { bass: 0, mid: 0, high: 0, energy: 0 };\n    this.webAudio = !isIOS && !!(window.AudioContext || window.webkitAudioContext);\n    for (const deck of this.decks) {\n      for (const type of EVENTS) deck.el.addEventListener(type, () => {\n        if (deck === this.active) this.dispatchEvent(new Event(type));\n      });\n    }\n  }\n\n  get el() { return this.active.el; }\n  get currentTime() { return this.el.currentTime || 0; }\n  get duration() { const d = this.el.duration; return Number.isFinite(d) && d > 0 ? d : 0; }\n  get paused() { return this.el.paused; }\n  get ready() { return this.el.readyState >= 2; }\n  get key() { return this.active.key; }\n  standby() { return this.decks.find(d => d !== this.active); }\n\n  /** Создаёт граф Web Audio. Вызывается из жеста пользователя. */\n  ensureContext() {\n    if (!this.webAudio) return;\n    if (!this.ctx) {\n      try {\n        const Ctx = window.AudioContext || window.webkitAudioContext;\n        const ctx = new Ctx({ latencyHint: 'playback' });\n        const master = ctx.createGain();\n        const direct = ctx.createGain();\n        const compressed = ctx.createGain();\n        const compressor = ctx.createDynamicsCompressor();\n        compressor.threshold.value = -20; compressor.knee.value = 14; compressor.ratio.value = 3.5;\n        compressor.attack.value = .02; compressor.release.value = .25;\n        const makeup = ctx.createGain(); makeup.gain.value = 1.35;\n        const analyser = ctx.createAnalyser();\n        analyser.fftSize = 512; analyser.smoothingTimeConstant = .78;\n        master.connect(direct).connect(analyser);\n        master.connect(compressor).connect(makeup).connect(compressed).connect(analyser);\n        analyser.connect(ctx.destination);\n        for (const deck of this.decks) {\n          const source = ctx.createMediaElementSource(deck.el);\n          deck.gain = ctx.createGain();\n          deck.gain.gain.value = deck === this.active ? 1 : 0;\n          source.connect(deck.gain).connect(master);\n        }\n        Object.assign(this, { ctx, master, direct, compressed, analyser, bins: new Uint8Array(analyser.frequencyBinCount) });\n        this.applyVolume();\n        this.applyNormalize();\n      } catch { this.webAudio = false; this.ctx = null; return; }\n    }\n    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});\n  }\n\n  applyVolume() {\n    const v = Math.pow(this.volume, 1.6);\n    if (this.ctx) {\n      this.master.gain.setTargetAtTime(v, this.ctx.currentTime, .03);\n      for (const deck of this.decks) deck.el.volume = 1;\n    } else {\n      for (const deck of this.decks) deck.el.volume = deck === this.active || this.fading ? v : 0;\n    }\n  }\n  setVolume(value) { this.volume = Math.min(1, Math.max(0, value)); this.applyVolume(); }\n  setNormalize(on) { this.normalize = !!on; this.applyNormalize(); }\n  applyNormalize() {\n    if (!this.ctx) return;\n    const t = this.ctx.currentTime;\n    this.direct.gain.setTargetAtTime(this.normalize ? 0 : 1, t, .05);\n    this.compressed.gain.setTargetAtTime(this.normalize ? 1 : 0, t, .05);\n  }\n\n  async load(source, key, { autoplay = true, start = 0 } = {}) {\n    this.cancelFade();\n    this.standby().unload();\n    if (this.active.gain) this.active.gain.gain.value = 1;\n    await this.active.load(source, key);\n    if (start) this.el.currentTime = start;\n    this.applyVolume();\n    if (autoplay) return this.play();\n  }\n\n  play() {\n    this.ensureContext();\n    return this.el.play();\n  }\n  pause() { this.el.pause(); }\n  seek(seconds) {\n    if (!this.el.readyState) return false;\n    this.el.currentTime = Math.max(0, Math.min(this.duration || seconds, seconds));\n    return true;\n  }\n  stop() { this.cancelFade(); for (const deck of this.decks) deck.unload(); }\n\n  /** Готовит следующий трек на запасной деке. */\n  async preload(source, key) {\n    const deck = this.standby();\n    if (deck.key === key) return true;\n    try {\n      await deck.load(source, key);\n      if (deck.gain) deck.gain.gain.value = 0; else deck.el.volume = 0;\n      return true;\n    } catch { deck.unload(); return false; }\n  }\n  isPreloaded(key) { const d = this.standby(); return d.key === key && d.el.readyState >= 2; }\n\n  /** Переключает на запасную деку: сразу (бесшовно) или с кроссфейдом. */\n  swap(fadeSeconds = 0) {\n    const next = this.standby();\n    if (!next.key) return false;\n    const prev = this.active;\n    this.cancelFade();\n    this.active = next;\n    const fade = this.ctx && fadeSeconds > 0.3 ? fadeSeconds : 0;\n    if (fade) {\n      const t = this.ctx.currentTime;\n      const curve = n => Float32Array.from({ length: 32 }, (_, i) => n ? Math.sin(i / 31 * Math.PI / 2) : Math.cos(i / 31 * Math.PI / 2));\n      next.gain.gain.cancelScheduledValues(t);\n      prev.gain.gain.cancelScheduledValues(t);\n      next.gain.gain.setValueCurveAtTime(curve(true), t, fade);\n      prev.gain.gain.setValueCurveAtTime(curve(false), t, fade);\n      this.fading = { prev, timer: setTimeout(() => { if (this.fading?.prev === prev) { this.fading = null; prev.unload(); } }, fade * 1000 + 80) };\n    } else {\n      prev.unload();\n      if (next.gain) next.gain.gain.value = 1;\n    }\n    this.applyVolume();\n    next.el.play().catch(() => {});\n    this.dispatchEvent(new Event('swap'));\n    return true;\n  }\n  cancelFade() {\n    if (!this.fading) return;\n    clearTimeout(this.fading.timer);\n    const prev = this.fading.prev;\n    this.fading = null;\n    if (prev !== this.active) prev.unload();\n    if (this.ctx) {\n      const t = this.ctx.currentTime;\n      for (const deck of this.decks) { deck.gain.gain.cancelScheduledValues(t); deck.gain.gain.value = deck === this.active ? 1 : 0; }\n    }\n  }\n\n  /** Энергия по полосам 0…1 для визуализации. Без Web Audio — мягкая имитация. */\n  levels(now = performance.now()) {\n    let bass, mid, high;\n    if (this.analyser && !this.el.paused) {\n      this.analyser.getByteFrequencyData(this.bins);\n      const avg = (a, b) => { let s = 0; for (let i = a; i < b; i++) s += this.bins[i]; return s / ((b - a) * 255); };\n      bass = avg(1, 6); mid = avg(6, 40); high = avg(40, 120);\n    } else if (!this.el.paused) {\n      const t = now / 1000;\n      bass = .45 + .25 * Math.sin(t * 3.1) * Math.sin(t * 1.3);\n      mid = .35 + .18 * Math.sin(t * 2.2 + 1);\n      high = .25 + .12 * Math.sin(t * 4.7 + 2);\n    } else { bass = mid = high = 0; }\n    const s = this.smooth, k = .18;\n    s.bass += (bass - s.bass) * k; s.mid += (mid - s.mid) * k; s.high += (high - s.high) * k;\n    s.energy = s.bass * .55 + s.mid * .3 + s.high * .15;\n    return s;\n  }\n\n  async setSink(id) {\n    const targets = this.ctx?.setSinkId ? [this.ctx] : this.decks.map(d => d.el);\n    await Promise.all(targets.map(t => t.setSinkId?.(id)));\n  }\n}\n\n/** Запасной путь: официальный виджет SoundCloud, если прямой поток недоступен. */\nexport class WidgetPlayer extends EventTarget {\n  constructor(slot) {\n    super();\n    this.slot = slot;\n    this.widget = null;\n    this.position = 0;\n    this.duration = 0;\n    this.paused = true;\n    this.at = 0;\n  }\n  async load(url, { autoplay = true, volume = 80 } = {}) {\n    this.destroy();\n    if (!window.SC?.Widget) await loadScript('https://w.soundcloud.com/player/api.js');\n    const frame = document.createElement('iframe');\n    const src = new URL('https://w.soundcloud.com/player/');\n    src.searchParams.set('url', url);\n    src.searchParams.set('auto_play', String(autoplay));\n    src.searchParams.set('show_artwork', 'false');\n    src.searchParams.set('show_teaser', 'false');\n    frame.allow = 'autoplay; encrypted-media';\n    frame.title = 'Аудиопоток';\n    frame.tabIndex = -1;\n    frame.src = src.href;\n    this.slot.replaceChildren(frame);\n    const widget = window.SC.Widget(frame);\n    this.widget = widget;\n    const E = window.SC.Widget.Events;\n    const on = (name, fn) => widget.bind(E[name], data => { if (this.widget === widget) fn(data); });\n    await new Promise((resolve, reject) => {\n      const timer = setTimeout(() => reject(Error('Виджет не ответил')), 15000);\n      on('READY', () => {\n        clearTimeout(timer);\n        widget.setVolume(volume);\n        widget.getDuration(ms => { this.duration = ms / 1000 || 0; this.dispatchEvent(new Event('durationchange')); });\n        resolve();\n      });\n      on('ERROR', () => { clearTimeout(timer); reject(Error('Виджет не смог воспроизвести трек')); });\n    });\n    on('PLAY', () => { this.paused = false; this.at = performance.now(); this.dispatchEvent(new Event('playing')); });\n    on('PAUSE', () => { this.paused = true; this.dispatchEvent(new Event('pause')); });\n    on('FINISH', () => { this.paused = true; this.dispatchEvent(new Event('ended')); });\n    on('PLAY_PROGRESS', e => { this.position = (e?.currentPosition || 0) / 1000; this.at = performance.now(); this.dispatchEvent(new Event('timeupdate')); });\n    on('SEEK', e => { this.position = (e?.currentPosition || 0) / 1000; this.at = performance.now(); });\n    on('ERROR', () => this.dispatchEvent(new Event('error')));\n  }\n  get currentTime() { return this.paused ? this.position : this.position + (performance.now() - this.at) / 1000; }\n  play() { this.widget?.play(); return Promise.resolve(); }\n  pause() { this.widget?.pause(); }\n  seek(seconds) { this.widget?.seekTo(seconds * 1000); this.position = seconds; this.at = performance.now(); return true; }\n  setVolume(v) { this.widget?.setVolume(Math.round(v * 100)); }\n  destroy() { this.widget = null; this.slot.replaceChildren(); this.paused = true; this.position = 0; this.duration = 0; }\n}\n",
  "/js/player/fullscreen.js": "// Полноэкранный плеер: обложка с размытым фоном, караоке и очередь.\n// Разметка строится один раз; при смене трека обновляются только нужные части — без мигания.\n\nimport { $, $$, esc, icon, clock, api, bus, root, safeUrl, artSize, motionReduced, coverColors, wide, haptic } from '../core.js';\nimport { prefs, isLiked, lyricOffset, nudgeLyrics, trackLyricOffset, setPref } from '../store.js';\nimport { Slider, cover, trackRow, toast, refreshLikes } from '../ui.js';\nimport * as player from './player.js';\nimport { Karaoke } from './lyrics.js';\nimport { WaveVisual } from '../wave-visual.js';\n\nconst { P, engine } = player;\nconst dialog = $('#player');\nconst lyricsCache = new Map();\nlet karaoke, seekSlider, visual, frame = 0, panel = 'none', lastSecond = -1, closing = 0, colorToken = 0;\n\nexport function isOpen() { return dialog.open && !closing; }\n\nfunction build() {\n  dialog.innerHTML = `\n    <div class=\"pl-bg\" aria-hidden=\"true\"><div class=\"pl-bg-art\"></div><canvas class=\"pl-wave\"></canvas><div class=\"pl-bg-shade\"></div></div>\n    <div class=\"pl-shell\" data-panel=\"none\">\n      <header class=\"pl-top\">\n        <button class=\"icon-btn ghost\" type=\"button\" data-action=\"player-close\" aria-label=\"Свернуть\">${icon('down')}</button>\n        <div class=\"pl-context\"><small>Играет</small><strong id=\"pl-context\">Lo-fi</strong></div>\n        <button class=\"icon-btn ghost\" type=\"button\" data-action=\"player-menu\" aria-label=\"Ещё\">${icon('more')}</button>\n      </header>\n      <div class=\"pl-body\">\n        <section class=\"pl-main\">\n          <div class=\"pl-art-wrap\"><div class=\"pl-art cover\" id=\"pl-art\">${icon('logo', 'ph')}</div></div>\n          <div class=\"pl-info\">\n            <div class=\"pl-titles\">\n              <h2 class=\"pl-title\" id=\"pl-title\">Ничего не играет</h2>\n              <button class=\"pl-artist\" type=\"button\" id=\"pl-artist\" data-action=\"player-artist\"></button>\n            </div>\n            <button class=\"icon-btn pl-like\" type=\"button\" data-action=\"like-current\" aria-label=\"В избранное\">${icon('heart')}</button>\n          </div>\n          <div class=\"pl-seek\">\n            <div class=\"slider seek big\" id=\"pl-seek\" role=\"slider\" aria-label=\"Позиция\" tabindex=\"0\" aria-valuemin=\"0\" aria-valuemax=\"100\"><span class=\"slider-track\"><i class=\"slider-buffer\"></i><i class=\"slider-fill\"></i></span><span class=\"slider-thumb\"></span></div>\n            <div class=\"pl-times\"><time id=\"pl-pos\">0:00</time><span class=\"pl-badges\" id=\"pl-badges\"></span><time id=\"pl-dur\">0:00</time></div>\n          </div>\n          <div class=\"pl-transport\">\n            <button class=\"icon-btn ghost\" type=\"button\" data-action=\"shuffle\" aria-label=\"Перемешать\" aria-pressed=\"false\">${icon('shuffle')}</button>\n            <button class=\"icon-btn ghost lg\" type=\"button\" data-action=\"prev\" aria-label=\"Предыдущий\">${icon('prev')}</button>\n            <button class=\"play-btn xl\" type=\"button\" data-action=\"toggle\" aria-label=\"Играть\">${icon('play')}<span class=\"spinner\" aria-hidden=\"true\"></span></button>\n            <button class=\"icon-btn ghost lg\" type=\"button\" data-action=\"next\" aria-label=\"Следующий\">${icon('next')}</button>\n            <button class=\"icon-btn ghost\" type=\"button\" data-action=\"repeat\" aria-label=\"Повтор\" aria-pressed=\"false\">${icon('repeat')}</button>\n          </div>\n          <div class=\"pl-tools\">\n            <button class=\"tool\" type=\"button\" data-action=\"player-panel\" data-panel=\"lyrics\" aria-pressed=\"false\">${icon('lyrics')}<span>Текст</span></button>\n            <button class=\"tool\" type=\"button\" data-action=\"player-panel\" data-panel=\"queue\" aria-pressed=\"false\">${icon('queue')}<span>Очередь</span></button>\n            <button class=\"tool wave-only\" type=\"button\" data-action=\"wave-tune\">${icon('tune')}<span>Волна</span></button>\n            <button class=\"tool wave-only\" type=\"button\" data-action=\"dislike-current\">${icon('dislike')}<span>Не то</span></button>\n            <button class=\"tool\" type=\"button\" data-action=\"sleep-menu\" id=\"pl-sleep\">${icon('timer')}<span>Сон</span></button>\n          </div>\n        </section>\n        <section class=\"pl-side\" aria-label=\"Текст и очередь\">\n          <div class=\"pl-pane\" data-pane=\"lyrics\">\n            <div class=\"pl-lyrics\" id=\"pl-lyrics\" tabindex=\"0\" aria-label=\"Текст песни\"></div>\n            <button class=\"ly-follow glass\" type=\"button\" data-action=\"lyrics-follow\" hidden>${icon('down')}<span>К текущей строке</span></button>\n            <div class=\"ly-tools glass\" id=\"ly-tools\" hidden>\n              <button class=\"icon-btn ghost sm\" type=\"button\" data-action=\"lyrics-shift\" data-value=\"-250\" aria-label=\"Текст раньше\">${icon('minus')}</button>\n              <span id=\"ly-offset\" title=\"Сдвиг текста для этого трека\">0,0 с</span>\n              <button class=\"icon-btn ghost sm\" type=\"button\" data-action=\"lyrics-shift\" data-value=\"250\" aria-label=\"Текст позже\">${icon('plus')}</button>\n              <span class=\"ly-sep\"></span>\n              <button class=\"icon-btn ghost sm\" type=\"button\" data-action=\"lyrics-size\" aria-label=\"Размер текста\">${icon('text')}</button>\n            </div>\n          </div>\n          <div class=\"pl-pane\" data-pane=\"queue\"><div class=\"pl-queue\" id=\"pl-queue\"></div></div>\n        </section>\n      </div>\n    </div>`;\n  karaoke = new Karaoke($('#pl-lyrics'), {\n    onSeek: ms => { player.seek(Math.max(0, (ms - lyricOffset(P.track?.id)) / 1000)); karaoke.resume(); haptic('select'); },\n    onFollowChange: following => { $('.ly-follow', dialog).hidden = following; },\n  });\n  seekSlider = new Slider($('#pl-seek'), {\n    onInput: v => { $('#pl-pos').textContent = clock(v * player.duration()); },\n    onCommit: v => player.seek(v * player.duration()),\n    label: v => clock(v * player.duration()),\n  });\n  visual = new WaveVisual($('.pl-wave', dialog), { levels: () => engine.levels(), lines: 9, intensity: 1.1 });\n  bindDrag();\n}\n\n// ── открытие и закрытие ──\nexport function open(view = panel === 'none' && wide.matches ? 'none' : panel) {\n  if (!dialog.firstChild) build();\n  clearTimeout(closing);\n  closing = 0;\n  setPanel(view === 'cover' ? 'none' : view, false);\n  updateTrack(true);\n  updateState();\n  if (!dialog.open) dialog.showModal();\n  dialog.classList.remove('is-closing');\n  requestAnimationFrame(() => requestAnimationFrame(() => dialog.classList.add('is-open')));\n  applyBackground();\n  startLoop();\n  bus.emit('player:open', true);\n  haptic('light');\n}\n\nexport function close() {\n  if (!dialog.open || closing) return;\n  dialog.classList.remove('is-open');\n  dialog.classList.add('is-closing');\n  closing = setTimeout(() => {\n    closing = 0;\n    dialog.classList.remove('is-closing');\n    dialog.style.transform = '';\n    if (dialog.open) dialog.close();\n    stopLoop();\n    visual?.stop();\n    bus.emit('player:open', false);\n  }, motionReduced() ? 0 : 420);\n}\ndialog.addEventListener('cancel', event => { event.preventDefault(); close(); });\n\nexport function setPanel(name, animate = true) {\n  if (!dialog.firstChild) build();\n  panel = panel === name && animate ? 'none' : name;\n  const shell = $('.pl-shell', dialog);\n  shell.dataset.panel = panel;\n  for (const b of $$('[data-action=\"player-panel\"]', dialog)) b.setAttribute('aria-pressed', String(b.dataset.panel === panel));\n  $('#ly-tools').hidden = panel !== 'lyrics' || karaoke.mode !== 'synced';\n  if (panel === 'lyrics') { loadLyrics(); requestAnimationFrame(() => karaoke.relayout()); }\n  if (panel === 'queue') renderQueue();\n}\nexport const currentPanel = () => panel;\n\n// ── трек ──\nlet shownTrack = null;\nfunction updateTrack(force = false) {\n  if (!dialog.firstChild) return;\n  const track = P.track;\n  if (!force && shownTrack === track) return;\n  const changed = shownTrack?.id !== track?.id;\n  shownTrack = track;\n  $('#pl-context').textContent = P.context.label || (P.wave ? 'Моя волна' : 'Очередь');\n  $('.pl-shell', dialog).classList.toggle('is-wave', player.isWave());\n  const title = $('#pl-title'), artist = $('#pl-artist');\n  const apply = () => {\n    title.textContent = track?.title || 'Ничего не играет';\n    title.title = track?.title || '';\n    artist.innerHTML = track ? `${track.avatar && safeUrl(track.avatar) ? `<img src=\"${esc(safeUrl(track.avatar))}\" alt=\"\">` : ''}<span>${esc(track.artist)}</span>${icon('forward')}` : '';\n  };\n  if (changed && !motionReduced() && isOpen()) {\n    title.parentElement.classList.add('is-swapping');\n    setTimeout(() => { apply(); title.parentElement.classList.remove('is-swapping'); }, 160);\n  } else apply();\n  swapArt($('#pl-art'), track, 't500x500');\n  swapArt($('.pl-bg-art', dialog), track, 't300x300');\n  updateCanvas(track);\n  updateLike();\n  if (changed) {\n    karaoke.set(null);\n    if (panel === 'lyrics' || track) loadLyrics();\n    if (panel === 'queue') renderQueue();\n    applyColors(track);\n  }\n  updateBadges();\n}\n\n/** Плавная смена обложки: новая картинка проявляется поверх старой. */\nfunction swapArt(box, track, size) {\n  const url = safeUrl(track?.artwork);\n  const current = box.querySelector('img:last-of-type');\n  if (current?.dataset.src === (url || '')) return;\n  if (!url) { $$('img', box).forEach(img => img.remove()); return; }\n  const img = new Image();\n  img.alt = '';\n  img.decoding = 'async';\n  img.dataset.src = url;\n  img.src = artSize(url, size);\n  box.append(img);\n  const done = () => { for (const old of $$('img', box)) if (old !== img) setTimeout(() => old.remove(), 500); };\n  if (img.complete) { img.classList.add('is-loaded'); done(); }\n  else img.addEventListener('load', done, { once: true });\n}\n\nfunction updateCanvas(track) {\n  const box = $('#pl-art');\n  let video = $('video', box);\n  const url = prefs.canvas && !motionReduced() ? safeUrl(track?.canvas, 'canvas') : '';\n  if (!url) { video?.remove(); return; }\n  if (video?.dataset.src === url) return;\n  video?.remove();\n  video = document.createElement('video');\n  Object.assign(video, { muted: true, loop: true, autoplay: true, playsInline: true });\n  video.dataset.src = url;\n  video.src = url;\n  video.addEventListener('playing', () => video.classList.add('is-loaded'), { once: true });\n  video.addEventListener('error', () => video.remove(), { once: true });\n  box.append(video);\n  video.play().catch(() => video.remove());\n}\n\nasync function applyColors(track) {\n  const token = ++colorToken;\n  const colors = prefs.dynamicColor ? await coverColors(safeUrl(track?.artwork)) : null;\n  if (token !== colorToken) return;\n  const tint = colors?.accent || colors?.average;\n  if (tint) {\n    root.style.setProperty('--tint', tint.join(' '));\n    root.style.setProperty('--tint-avg', colors.average.join(' '));\n    root.dataset.tinted = 'true';\n  } else {\n    root.style.removeProperty('--tint');\n    root.style.removeProperty('--tint-avg');\n    delete root.dataset.tinted;\n  }\n  visual?.setColors(colors);\n  bus.emit('player:colors', colors);\n}\n\nfunction applyBackground() {\n  const shell = dialog;\n  shell.dataset.bg = prefs.playerBg;\n  if (prefs.playerBg === 'wave' || prefs.playerBg === 'cover') { visual.start(); visual.setActive(player.isPlaying()); }\n  else visual.stop();\n}\n\nfunction updateLike() {\n  const button = $('.pl-like', dialog);\n  if (!button) return;\n  const liked = isLiked(P.track?.id);\n  button.classList.toggle('is-on', liked);\n  button.innerHTML = icon(liked ? 'heart-fill' : 'heart');\n  button.setAttribute('aria-pressed', String(liked));\n  button.disabled = !P.track;\n}\n\nfunction updateBadges() {\n  const box = $('#pl-badges');\n  if (!box) return;\n  const parts = [];\n  if (P.cached) parts.push(`<span class=\"badge\" title=\"Трек в кеше сервера: мгновенный старт и перемотка\">${icon('database')}кеш</span>`);\n  if (P.bitrate) parts.push(`<span class=\"badge\">${P.bitrate} кбит/с</span>`);\n  if (P.mode === 'widget') parts.push('<span class=\"badge\">виджет</span>');\n  box.innerHTML = parts.join('');\n}\n\nexport function updateState() {\n  if (!dialog.firstChild) return;\n  const shell = $('.pl-shell', dialog);\n  shell.classList.toggle('is-wave', player.isWave());\n  $('#pl-sleep').classList.toggle('is-on', player.sleepLeft() !== 0);\n  updateLike();\n  updateBadges();\n  visual?.setActive(player.isPlaying());\n  seekSlider?.disable(!P.track);\n}\n\n// ── текст песни ──\nasync function loadLyrics() {\n  const track = P.track;\n  if (!track) return karaoke.status('lyrics', 'Текст появится здесь', 'Включите трек, и строки будут подсвечиваться в такт.');\n  karaoke.follow = prefs.lyricFollow;\n  if (lyricsCache.has(track.id)) {\n    const data = await lyricsCache.get(track.id);\n    if (P.track?.id === track.id && karaoke._for !== track.id) { karaoke._for = track.id; karaoke.set(data); updateLyricTools(); }\n    return;\n  }\n  karaoke._for = null;\n  karaoke.set(null);\n  const task = api('lyrics', { params: { id: track.id } }).catch(error => ({ error: error.message }));\n  lyricsCache.set(track.id, task);\n  if (lyricsCache.size > 60) lyricsCache.delete(lyricsCache.keys().next().value);\n  const data = await task;\n  if (data.error) lyricsCache.delete(track.id);\n  if (P.track?.id !== track.id) return;\n  karaoke._for = track.id;\n  karaoke.set(data);\n  updateLyricTools();\n}\nexport function retryLyrics() { if (P.track) { lyricsCache.delete(P.track.id); karaoke._for = null; loadLyrics(); } }\n\nfunction updateLyricTools() {\n  const tools = $('#ly-tools');\n  if (!tools) return;\n  tools.hidden = panel !== 'lyrics' || karaoke.mode !== 'synced';\n  const value = trackLyricOffset(P.track?.id) / 1000;\n  $('#ly-offset').textContent = (value > 0 ? '+' : value < 0 ? '−' : '') + Math.abs(value).toFixed(2).replace('.', ',').replace(/0$/, '') + ' с';\n}\nexport function shiftLyrics(delta) {\n  if (!P.track) return;\n  nudgeLyrics(P.track.id, delta);\n  updateLyricTools();\n  haptic('select');\n}\nexport function cycleLyricSize() {\n  const sizes = ['s', 'm', 'l', 'xl'];\n  setPref('lyricSize', sizes[(sizes.indexOf(prefs.lyricSize) + 1) % sizes.length]);\n  requestAnimationFrame(() => karaoke.relayout());\n}\nexport const followLyrics = () => karaoke?.resume();\n\n// ── очередь ──\nexport function renderQueue() {\n  const box = $('#pl-queue');\n  if (!box || panel !== 'queue') return;\n  const upcoming = P.queue.slice(P.index + 1);\n  const current = P.queue[P.index];\n  box.innerHTML = `\n    ${current ? `<h3 class=\"q-head\">Сейчас играет</h3><div class=\"rows\">${trackRow(current, { source: 'queue', index: P.index, compact: true })}</div>` : ''}\n    <h3 class=\"q-head\">${player.isWave() ? 'Дальше в волне' : 'Далее'}<small>${upcoming.length ? upcoming.length : ''}</small></h3>\n    ${upcoming.length ? `<div class=\"rows q-list\">${upcoming.map((t, i) => `<div class=\"q-item\" data-q=\"${P.index + 1 + i}\">\n        <span class=\"q-grip\" data-grip aria-hidden=\"true\">${icon('grip')}</span>\n        ${trackRow(t, { source: 'queue', index: P.index + 1 + i, compact: true })}\n        <button class=\"icon-btn ghost sm\" type=\"button\" data-action=\"queue-remove\" data-index=\"${P.index + 1 + i}\" aria-label=\"Убрать\">${icon('close')}</button>\n      </div>`).join('')}</div>` : `<p class=\"q-empty\">${player.isWave() ? 'Подбираем следующие треки…' : 'Очередь пуста. Добавляйте треки через меню «⋯».'}</p>`}`;\n  markCurrentRows(box);\n}\n\n/** Перетаскивание треков в очереди за ручку. */\nfunction bindQueueDrag() {\n  const box = $('#pl-queue');\n  let drag = null;\n  box.addEventListener('pointerdown', event => {\n    const grip = event.target.closest('[data-grip]');\n    if (!grip) return;\n    const item = grip.closest('.q-item');\n    const items = $$('.q-item', box);\n    drag = { item, from: Number(item.dataset.q), startY: event.clientY, rects: items.map(el => el.getBoundingClientRect()), items, to: Number(item.dataset.q) };\n    item.classList.add('is-dragging');\n    grip.setPointerCapture(event.pointerId);\n    event.preventDefault();\n  });\n  box.addEventListener('pointermove', event => {\n    if (!drag) return;\n    const dy = event.clientY - drag.startY;\n    drag.item.style.transform = `translateY(${dy}px)`;\n    const y = event.clientY;\n    const fromPos = drag.items.indexOf(drag.item);\n    let pos = drag.rects.findIndex(r => y < r.top + r.height / 2);\n    if (pos < 0) pos = drag.items.length - 1;\n    else if (pos > fromPos) pos -= 1;\n    const h = drag.rects[fromPos].height;\n    drag.items.forEach((el, i) => {\n      if (el === drag.item) return;\n      const shift = fromPos < pos && i > fromPos && i <= pos ? -h : fromPos > pos && i >= pos && i < fromPos ? h : 0;\n      el.style.transform = shift ? `translateY(${shift}px)` : '';\n    });\n    drag.to = Number(drag.items[0].dataset.q) + pos;\n  });\n  const end = () => {\n    if (!drag) return;\n    const { from, to } = drag;\n    drag.items.forEach(el => { el.style.transform = ''; el.classList.remove('is-dragging'); });\n    drag = null;\n    if (from !== to) { player.moveItem(from, to); haptic('select'); }\n  };\n  box.addEventListener('pointerup', end);\n  box.addEventListener('pointercancel', end);\n}\n\nfunction markCurrentRows(scope = document) {\n  for (const row of $$('[data-row]', scope)) {\n    const current = row.dataset.row === P.track?.id;\n    row.classList.toggle('is-current', current);\n    row.classList.toggle('is-playing', current && player.isPlaying());\n  }\n}\n\n// ── кадр анимации ──\nfunction startLoop() { if (!frame) frame = requestAnimationFrame(tick); }\nfunction stopLoop() { cancelAnimationFrame(frame); frame = 0; }\nfunction tick(now) {\n  frame = 0;\n  if (!dialog.open) return;\n  const pos = player.position(), dur = player.duration();\n  if (!seekSlider.dragging) {\n    seekSlider.set(dur ? pos / dur : 0);\n    const second = Math.floor(pos);\n    if (second !== lastSecond) { lastSecond = second; $('#pl-pos').textContent = clock(pos); $('#pl-dur').textContent = clock(dur); }\n  }\n  const buffered = engine.el.buffered;\n  if (P.mode === 'audio' && buffered?.length && dur) $('.slider-buffer', dialog).style.width = (buffered.end(buffered.length - 1) / dur * 100).toFixed(1) + '%';\n  if (panel === 'lyrics' || wide.matches) karaoke.tick(pos * 1000 + lyricOffset(P.track?.id), now);\n  if (player.isPlaying() || seekSlider.dragging || panel === 'lyrics') frame = requestAnimationFrame(tick);\n  else setTimeout(() => { if (dialog.open && !frame) frame = requestAnimationFrame(tick); }, 250);\n}\n\n// ── жест «смахнуть вниз» на телефоне ──\nfunction bindDrag() {\n  const top = $('.pl-top', dialog), art = $('.pl-art-wrap', dialog);\n  let start = null;\n  const down = event => {\n    if (wide.matches || event.target.closest('button')) return;\n    start = { y: event.clientY, t: performance.now(), dy: 0 };\n    dialog.style.transition = 'none';\n    event.currentTarget.setPointerCapture(event.pointerId);\n  };\n  const move = event => {\n    if (!start) return;\n    start.dy = Math.max(0, event.clientY - start.y);\n    dialog.style.transform = `translateY(${start.dy}px)`;\n  };\n  const up = () => {\n    if (!start) return;\n    const { dy, t } = start;\n    start = null;\n    dialog.style.transition = '';\n    if (dy > 140 || dy / Math.max(1, performance.now() - t) > .7) close();\n    else dialog.style.transform = '';\n  };\n  for (const el of [top, art]) {\n    el.addEventListener('pointerdown', down);\n    el.addEventListener('pointermove', move);\n    el.addEventListener('pointerup', up);\n    el.addEventListener('pointercancel', up);\n  }\n}\n\n// ── подписки ──\nbus.on('player:track', () => { if (dialog.firstChild) { updateTrack(); markCurrentRows(dialog); } if (!dialog.open) applyColors(P.track); });\nbus.on('player:state', () => { updateState(); markCurrentRows(dialog); if (dialog.open) startLoop(); });\nbus.on('player:queue', () => { if (panel === 'queue') renderQueue(); });\nbus.on('player:wave', () => { if (dialog.firstChild) updateTrack(true); });\nbus.on('library', () => { updateLike(); if (dialog.firstChild) refreshLikes(dialog); });\nbus.on('prefs', key => {\n  if (!dialog.firstChild) return;\n  if (['playerBg', '*'].includes(key)) applyBackground();\n  if (['dynamicColor', '*'].includes(key)) applyColors(P.track);\n  if (['canvas', '*'].includes(key)) updateCanvas(P.track);\n  if (['lyricFollow', '*'].includes(key)) karaoke.follow = prefs.lyricFollow;\n  if (['lyricSize', 'textScale', '*'].includes(key)) requestAnimationFrame(() => karaoke.relayout());\n});\naddEventListener('resize', () => { if (dialog.open) karaoke?.relayout(); });\n\nexport function init() {\n  build();\n  bindQueueDrag();\n  dialog.dataset.bg = prefs.playerBg;\n}\n",
  "/js/player/lyrics.js": "// Караоке: построчная и пословная подсветка с плавной заливкой, паузы-проигрыши,\n// мягкая автопрокрутка, которая уступает ручной прокрутке, и переход к строке по нажатию.\n\nimport { esc, icon, motionReduced } from '../core.js';\n\nconst GAP_MIN = 4500;\n\nfunction estimate(text) { return Math.max(1400, text.replace(/\\s+/g, '').length * 85 + 700); }\n\n/** Разбивает строку на слова с таймингами (настоящими или вычисленными по длине слов). */\nfunction wordsOf(line, end) {\n  if (line.words?.length) {\n    return line.words.map((w, i) => ({ text: w.text, start: w.time, end: line.words[i + 1]?.time ?? end }));\n  }\n  const parts = line.text.match(/\\S+\\s*/g) || [];\n  const weights = parts.map(p => p.trim().length + 1.5);\n  const total = weights.reduce((a, b) => a + b, 0) || 1;\n  let t = line.time;\n  const span = end - line.time;\n  return parts.map((text, i) => {\n    const start = t;\n    t += span * weights[i] / total;\n    return { text, start, end: t };\n  });\n}\n\nexport class Karaoke {\n  constructor(container, { onSeek, onFollowChange } = {}) {\n    this.el = container;\n    this.onSeek = onSeek;\n    this.onFollowChange = onFollowChange;\n    this.items = [];\n    this.active = -2;\n    this.userUntil = 0;\n    this.scrollCurrent = 0;\n    this.scrollTarget = 0;\n    this.lastFrame = 0;\n    this.follow = true;\n    this.mode = 'empty';\n    const userScroll = () => {\n      if (this.mode !== 'synced') return;\n      this.userUntil = performance.now() + 3500;\n      this.setFollowing(false);\n    };\n    container.addEventListener('wheel', userScroll, { passive: true });\n    container.addEventListener('touchstart', userScroll, { passive: true });\n    container.addEventListener('keydown', e => { if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) userScroll(); });\n    container.addEventListener('click', event => {\n      const line = event.target.closest('[data-t]');\n      if (line && this.mode === 'synced') this.onSeek?.(Number(line.dataset.t));\n    });\n  }\n\n  setFollowing(value) {\n    if (this.following === value) return;\n    this.following = value;\n    this.onFollowChange?.(value);\n  }\n\n  status(glyph, title, text = '') {\n    this.mode = 'empty';\n    this.items = [];\n    this.el.innerHTML = `<div class=\"ly-status\">${icon(glyph)}<strong>${esc(title)}</strong>${text ? `<p>${esc(text)}</p>` : ''}</div>`;\n  }\n  loading() {\n    this.mode = 'empty';\n    this.items = [];\n    this.el.innerHTML = `<div class=\"ly-loading\" aria-hidden=\"true\">${Array.from({ length: 7 }, (_, i) => `<i class=\"sk\" style=\"width:${[78, 62, 88, 54, 70, 84, 48][i]}%\"></i>`).join('')}</div>`;\n  }\n\n  set(data) {\n    this.active = -2;\n    this.userUntil = 0;\n    this.setFollowing(true);\n    if (!data) return this.loading();\n    if (data.error) return this.status('cloud', data.error);\n    if (data.type === 'instrumental') return this.status('note', 'Инструментальный трек', 'Здесь нет слов — просто слушайте.');\n    if (data.type === 'plain') {\n      this.mode = 'plain';\n      this.items = [];\n      const blocks = data.lines.reduce((acc, line) => { if (!line) acc.push([]); else acc.at(-1).push(line); return acc; }, [[]]).filter(b => b.length);\n      this.el.innerHTML = `<div class=\"ly ly-plain\"><p class=\"ly-note\">${icon('info')} Текст без синхронизации</p>${blocks.map(b => `<p class=\"ly-stanza\">${b.map(esc).join('<br>')}</p>`).join('')}${credit(data.source)}</div>`;\n      this.el.scrollTop = 0;\n      return;\n    }\n    if (data.type !== 'synced' || !data.lines?.length) return this.status('lyrics', 'Текст не найден', 'Для этого трека пока нет слов в открытых источниках.');\n    this.mode = 'synced';\n    const lines = data.lines;\n    const items = [];\n    if (lines[0].time >= 4000) items.push({ gap: true, start: 0, end: lines[0].time });\n    lines.forEach((line, i) => {\n      const next = lines[i + 1]?.time ?? line.time + estimate(line.text) + 2000;\n      if (!line.text) return;\n      const end = line.words?.length ? Math.min(next, Math.max(line.words.at(-1).time + 600, line.time + 400)) : Math.min(next, line.time + estimate(line.text));\n      items.push({ start: line.time, end, text: line.text, words: wordsOf(line, end) });\n      if (lines[i + 1] && lines[i + 1].time - end >= GAP_MIN) items.push({ gap: true, start: end, end: lines[i + 1].time });\n    });\n    this.items = items;\n    this.el.innerHTML = `<div class=\"ly ly-synced\"><div class=\"ly-pad\"></div>${items.map((item, i) => item.gap\n      ? `<div class=\"ly-gap\" data-i=\"${i}\" data-t=\"${item.start}\" aria-hidden=\"true\"><i></i><i></i><i></i></div>`\n      : `<p class=\"ly-line\" data-i=\"${i}\" data-t=\"${item.start}\" role=\"button\" tabindex=\"-1\">${item.words.map(w => `<span class=\"w\">${esc(w.text)}</span>`).join('')}</p>`).join('')}<div class=\"ly-pad end\"></div>${credit(data.source)}</div>`;\n    this.nodes = [...this.el.querySelectorAll('[data-i]')];\n    this.wordNodes = this.nodes.map(node => [...node.querySelectorAll('.w')]);\n    this.el.scrollTop = 0;\n    this.scrollCurrent = 0;\n  }\n\n  /** Вызывается на каждом кадре, пока виден текст. time — миллисекунды с учётом сдвига. */\n  tick(time, now = performance.now()) {\n    if (this.mode !== 'synced' || !this.items.length) return;\n    const items = this.items;\n    let lo = 0, hi = items.length;\n    while (lo < hi) { const mid = (lo + hi) >> 1; if (items[mid].start <= time) lo = mid + 1; else hi = mid; }\n    let index = lo - 1;\n    if (index >= 0 && items[index].gap && time >= items[index].end) index = Math.min(items.length - 1, index + 1);\n    if (index !== this.active) this.activate(index);\n    // заливка слов активной строки и точек проигрыша\n    const item = items[index];\n    if (item) {\n      if (item.gap) {\n        const p = Math.min(1, Math.max(0, (time - item.start) / (item.end - item.start)));\n        this.nodes[index].style.setProperty('--p', p.toFixed(3));\n      } else {\n        const words = this.wordNodes[index];\n        for (let w = 0; w < words.length; w++) {\n          const word = item.words[w];\n          const p = time <= word.start ? 0 : time >= word.end ? 1 : (time - word.start) / (word.end - word.start);\n          const value = p.toFixed(3);\n          if (words[w]._p !== value) { words[w]._p = value; words[w].style.setProperty('--p', value); }\n        }\n      }\n    }\n    // автопрокрутка\n    if (now > this.userUntil && this.follow) {\n      if (this.following === false) this.setFollowing(true);\n      const dt = Math.min(.1, (now - (this.lastFrame || now)) / 1000);\n      const diff = this.scrollTarget - this.el.scrollTop;\n      if (Math.abs(diff) > .5) {\n        const step = motionReduced() ? diff : diff * (1 - Math.exp(-dt * 7.5));\n        this.el.scrollTop += step;\n      }\n    }\n    this.lastFrame = now;\n  }\n\n  activate(index) {\n    const prev = this.active;\n    this.active = index;\n    this.nodes.forEach((node, i) => {\n      const d = index < 0 ? Math.min(4, i + 1) : Math.min(4, Math.abs(i - index));\n      if (node._d !== d) { node._d = d; node.dataset.d = d; }\n      const state = i === index ? 'active' : i < index ? 'past' : 'future';\n      if (node._s !== state) {\n        node._s = state;\n        node.dataset.s = state;\n        if (state !== 'active' && !this.items[i].gap) for (const w of this.wordNodes[i]) { const v = state === 'past' ? '1' : '0'; if (w._p !== v) { w._p = v; w.style.setProperty('--p', v); } }\n      }\n    });\n    const target = this.nodes[Math.max(0, index)];\n    if (target) {\n      const box = this.el.clientHeight;\n      this.scrollTarget = Math.max(0, target.offsetTop - box * .36 + target.offsetHeight / 2 - box * .0);\n      if (prev === -2) this.el.scrollTop = this.scrollTarget;\n    }\n  }\n\n  /** Вернуться к текущей строке после ручной прокрутки. */\n  resume() { this.userUntil = 0; this.setFollowing(true); }\n  relayout() { if (this.active >= -1) { const i = this.active; this.active = -3; this.activate(i); } }\n}\n\nfunction credit(source) {\n  if (!source) return '';\n  const link = source === 'LRCLIB' ? '<a href=\"https://lrclib.net/\" target=\"_blank\" rel=\"noopener\">LRCLIB</a>' : esc(source);\n  return `<p class=\"ly-credit\">Текст: ${link}</p>`;\n}\n",
  "/js/player/player.js": "// Контроллер воспроизведения: очередь, перемешивание, повтор, «Моя волна», предзагрузка,\n// кроссфейд, Media Session и события прослушивания.\n\nimport { api, bus, safeUrl, artSize, inTelegram, haptic, $ } from '../core.js';\nimport { prefs, state, addRecent, isDisliked, remember, setDislike, toggleLike, isLiked } from '../store.js';\nimport { Engine, WidgetPlayer } from './engine.js';\nimport { toast } from '../ui.js';\n\nexport const engine = new Engine();\nconst widget = new WidgetPlayer($('#widget-slot'));\n\nexport const P = {\n  queue: [], index: -1, track: null,\n  context: { type: '', label: '', href: '' },\n  status: 'idle', want: false, mode: '',\n  shuffle: false, repeat: 'off', original: null,\n  wave: null, version: 0, startedAt: 0, bitrate: null, cached: false, errors: 0,\n};\n\nconst sources = new Map();\nconst SOURCE_TTL = 80e3;\nlet watchdog = 0;\nlet lastTimeEmit = 0;\nlet recentFor = -1;\n\nconst emit = (name, data) => bus.emit('player:' + name, data);\nconst setStatus = status => { if (P.status !== status) { P.status = status; emit('state'); updateSession(); } };\n\nexport const position = () => P.mode === 'widget' ? widget.currentTime : engine.currentTime;\nexport const duration = () => (P.mode === 'widget' ? widget.duration : engine.duration) || P.track?.dur || 0;\nexport const isPlaying = () => P.status === 'playing';\nexport const isWave = () => !!P.wave && P.context.type === 'wave';\n\nfunction logEvent(kind, track = P.track, source = P.context.type) {\n  if (!track) return;\n  api('event', { body: { id: track.id, kind, source, title: track.title, artist: track.artist } }).catch(() => {});\n}\n\n// ── источник звука ──\nasync function resolveSource(track, { fresh = false } = {}) {\n  const hit = sources.get(track.id);\n  if (!fresh && hit && (hit.data.cached || Date.now() - hit.at < SOURCE_TTL)) return hit.data;\n  const data = await api('playback', { params: { id: track.id, quality: prefs.quality } });\n  sources.set(track.id, { data, at: Date.now() });\n  if (sources.size > 200) sources.delete(sources.keys().next().value);\n  return data;\n}\nconst toEngineSource = data => ({ url: data.source, protocol: data.protocol === 'hls' ? 'hls' : 'file' });\n\n// ── загрузка трека ──\nasync function load(index, { autoplay = true, fade = 0 } = {}) {\n  const track = P.queue[index];\n  if (!track) return;\n  const version = ++P.version;\n  clearTimeout(watchdog);\n  if (P.mode === 'widget') { widget.destroy(); P.mode = ''; }\n  Object.assign(P, { index, track, want: autoplay, bitrate: null, cached: false, startedAt: 0, _retried: false });\n  setStatus('loading');\n  emit('track', track);\n  updateMetadata();\n  maybeExtendWave();\n\n  const key = track.id + ':' + version;\n  // Следующий трек уже на запасной деке — переключаемся без паузы или с кроссфейдом.\n  const standby = engine.standby();\n  if (standby.key.startsWith(track.id + ':') && standby.el.readyState >= 2) {\n    standby.key = key;\n    const data = sources.get(track.id)?.data;\n    P.bitrate = data?.bitrate || null; P.cached = !!data?.cached;\n    P.mode = 'audio';\n    engine.swap(fade);\n    afterStart(version);\n    return;\n  }\n  try {\n    const data = await resolveSource(track);\n    if (version !== P.version) return;\n    P.bitrate = data.bitrate || null;\n    P.cached = !!data.cached;\n    if (data.protocol === 'widget' || !data.source) return useWidget(version, autoplay);\n    P.mode = 'audio';\n    await engine.load(toEngineSource(data), key, { autoplay }).catch(error => {\n      if (error?.name === 'NotAllowedError') { P.want = false; setStatus('paused'); return; }\n      if (error?.name !== 'AbortError') throw error;\n    });\n    afterStart(version);\n  } catch (error) {\n    if (version !== P.version) return;\n    failed(version, error);\n  }\n}\n\nfunction afterStart(version) {\n  clearTimeout(watchdog);\n  watchdog = setTimeout(() => {\n    if (version === P.version && P.status === 'loading' && P.want) failed(version, Error('Трек долго не загружается'));\n  }, 16000);\n  prefetchAhead();\n}\n\nasync function useWidget(version, autoplay) {\n  const track = P.track;\n  const url = safeUrl(track?.url, 'sc');\n  if (!url) return failed(version, Error('Трек недоступен'));\n  engine.stop();\n  P.mode = 'widget';\n  try {\n    await widget.load(url, { autoplay, volume: Math.round(prefs.volume) });\n    if (version !== P.version) return;\n    if (!autoplay) setStatus('paused');\n  } catch (error) { if (version === P.version) failed(version, error, true); }\n}\n\nfunction failed(version, error, final = false) {\n  clearTimeout(watchdog);\n  if (version !== P.version) return;\n  if (!final && P.mode === 'audio' && P.track) {\n    // Ссылка могла устареть: пробуем свежий поток, затем виджет.\n    if (!P._retried) {\n      P._retried = true;\n      sources.delete(P.track.id);\n      resolveSource(P.track, { fresh: true }).then(data => {\n        if (version !== P.version) return;\n        if (data.protocol === 'widget' || !data.source) return useWidget(version, P.want);\n        return engine.load(toEngineSource(data), P.track.id + ':' + version, { autoplay: P.want }).then(() => afterStart(version));\n      }).catch(() => useWidget(version, P.want));\n      return;\n    }\n    return useWidget(version, P.want);\n  }\n  P._retried = false;\n  setStatus('error');\n  P.errors++;\n  toast(error?.message && !/HTTP|fetch/i.test(error.message) ? error.message : 'Не удалось воспроизвести трек', { glyph: 'cloud' });\n  // В очереди или волне пропускаем недоступный трек, но не бесконечно.\n  if (P.errors < 4 && P.want && (P.index + 1 < P.queue.length || isWave())) setTimeout(() => { if (version === P.version) next({ auto: true }); }, 900);\n}\n\n// ── события движка ──\nfunction onPlaying() {\n  clearTimeout(watchdog);\n  P._retried = false;\n  P.errors = 0;\n  if (!P.startedAt) P.startedAt = Date.now();\n  P.want = true;\n  setStatus('playing');\n  if (recentFor !== P.version && P.track) {\n    recentFor = P.version;\n    addRecent(P.track);\n    logEvent('play');\n    if (P.wave) P.wave.played.push(P.track.id);\n  }\n}\nfunction onPause() {\n  if (P.status === 'loading' && P.want) return;\n  // Перед «ended» браузер шлёт «pause» — не мигаем кнопкой между треками.\n  if (P.mode === 'audio' && engine.el.ended) return;\n  P.want = false;\n  setStatus('paused');\n}\nfunction onEnded() {\n  if (P.track) logEvent('finish');\n  if (sleepAt === -1) {\n    sleepAt = 0;\n    P.want = false;\n    setStatus('paused');\n    toast('Таймер сна: трек закончился', { glyph: 'timer' });\n    return;\n  }\n  if (P.repeat === 'one') { seek(0); play(); return; }\n  next({ auto: true });\n}\nfunction onTime() {\n  const now = performance.now();\n  if (now - lastTimeEmit > 240) { lastTimeEmit = now; emit('time'); updatePosition(); }\n  if (P.mode !== 'audio' || !P.track) return;\n  const dur = engine.duration, pos = engine.currentTime;\n  if (!dur) return;\n  const remaining = dur - pos;\n  const nextIndex = upcomingIndex();\n  const nextTrack = P.queue[nextIndex];\n  if (nextTrack && remaining < 25 && (prefs.gapless || prefs.crossfade) && P.repeat !== 'one') void preloadNext(nextTrack);\n  if (prefs.crossfade && nextTrack && remaining <= prefs.crossfadeSec && remaining > .3 && engine.isPreloaded(nextTrack.id + ':pre') && !P.fadingTo) {\n    P.fadingTo = nextTrack.id;\n    load(nextIndex, { fade: Math.min(prefs.crossfadeSec, remaining) }).finally(() => { P.fadingTo = null; });\n  }\n}\n\nlet preloading = '';\nasync function preloadNext(track) {\n  if (preloading === track.id || engine.standby().key.startsWith(track.id + ':')) return;\n  preloading = track.id;\n  try {\n    const data = await resolveSource(track);\n    if (data.protocol !== 'widget' && data.source && upcomingIndex() >= 0 && P.queue[upcomingIndex()]?.id === track.id) {\n      await engine.preload(toEngineSource(data), track.id + ':pre');\n    }\n  } catch { /* при переходе попробуем ещё раз */ }\n  finally { if (preloading === track.id) preloading = ''; }\n}\n\n/** Просит сервер заранее скачать следующие треки в кеш. */\nfunction prefetchAhead() {\n  const ids = P.queue.slice(P.index + 1, P.index + 3).map(t => t.id);\n  if (ids.length) api('prefetch', { body: { ids } }).catch(() => {});\n  for (const t of P.queue.slice(P.index + 1, P.index + 2)) resolveSource(t).catch(() => {});\n}\n\nfor (const [type, fn] of Object.entries({ playing: onPlaying, pause: onPause, ended: onEnded, timeupdate: onTime,\n  error: () => P.mode === 'audio' && failed(P.version, Error('Ошибка потока')),\n  waiting: () => { if (P.want && P.status === 'playing') setStatus('loading'); },\n  canplay: () => { if (P.status === 'loading' && !P.want) setStatus('paused'); },\n  durationchange: () => emit('time'), swap: () => emit('time') })) {\n  engine.addEventListener(type, fn);\n}\nfor (const [type, fn] of Object.entries({ playing: onPlaying, pause: onPause, ended: onEnded, timeupdate: () => emit('time'),\n  durationchange: () => emit('time'), error: () => failed(P.version, Error('Виджет не смог воспроизвести трек'), true) })) {\n  widget.addEventListener(type, () => { if (P.mode === 'widget') fn(); });\n}\n\n// ── управление ──\nexport function playList(tracks, index = 0, context = {}) {\n  const selected = tracks[index];\n  if (!selected || selected.available === false) return;\n  remember(tracks);\n  const list = tracks.filter(t => t.available !== false && (t.id === selected.id || !isDisliked(t.id)));\n  let start = list.findIndex(t => t.id === selected.id);\n  if (context.type !== 'wave') P.wave = null;\n  P.context = { type: context.type || '', label: context.label || '', href: context.href || '' };\n  P.original = [...list];\n  if (P.shuffle && context.type !== 'wave') {\n    const rest = list.filter((_, i) => i !== start);\n    shuffleInPlace(rest);\n    P.queue = [list[start], ...rest];\n    start = 0;\n  } else P.queue = list;\n  engine.ensureContext();\n  emit('queue');\n  return load(start);\n}\n\nexport function play() {\n  engine.ensureContext();\n  if (!P.track) return P.queue.length ? load(0) : startWave();\n  P.want = true;\n  if (P.mode === 'widget') return widget.play();\n  if (P.mode !== 'audio' || P.status === 'error') return load(P.index);\n  if (P.status === 'paused' || P.status === 'idle') setStatus(engine.ready ? 'playing' : 'loading');\n  return engine.play().catch(error => {\n    if (error?.name === 'NotAllowedError') { P.want = false; setStatus('paused'); }\n    else if (error?.name !== 'AbortError') load(P.index);\n  });\n}\nexport function pause() {\n  P.want = false;\n  if (P.mode === 'widget') widget.pause(); else engine.pause();\n  if (P.status === 'loading') setStatus('paused');\n}\nexport function toggle() {\n  haptic('light');\n  if (P.status === 'playing' || (P.status === 'loading' && P.want)) pause(); else play();\n}\nexport function seek(seconds) {\n  const target = Math.max(0, Math.min(duration() || seconds, seconds));\n  if (P.mode === 'widget') widget.seek(target);\n  else if (P.mode === 'audio') { engine.cancelFade(); engine.seek(target); }\n  emit('time');\n  updatePosition();\n}\n\nfunction upcomingIndex() {\n  if (P.repeat === 'one') return P.index;\n  if (P.index + 1 < P.queue.length) return P.index + 1;\n  return P.repeat === 'all' && P.queue.length > 1 ? 0 : -1;\n}\n\nexport async function next({ auto = false } = {}) {\n  if (!P.track) return play();\n  const pos = position(), dur = duration();\n  if (!auto) {\n    haptic('light');\n    if (pos < 30 && dur > 45) {\n      logEvent('skip');\n      if (P.wave) P.wave.skipped.push(P.track.artist);\n    }\n  }\n  if (P.index + 1 < P.queue.length) return load(P.index + 1);\n  if (isWave()) {\n    await extendWave(true);\n    if (P.index + 1 < P.queue.length) return load(P.index + 1);\n  }\n  if (P.repeat === 'all' && P.queue.length) return load(0);\n  if (auto && prefs.autoplay && P.track) {\n    toast('Очередь закончилась — включаю «Мою волну»', { glyph: 'logo' });\n    return startWave({ seed: P.track.id, quiet: true });\n  }\n  if (!auto) toast('Это последний трек в очереди', { glyph: 'queue' });\n  else { P.want = false; setStatus('paused'); }\n}\n\nexport function prev() {\n  haptic('light');\n  if (position() > 4 || P.index <= 0) return seek(0);\n  return load(P.index - 1);\n}\n\nexport function jump(index) { if (P.queue[index]) return load(index); }\n\nexport function setShuffle(on = !P.shuffle) {\n  P.shuffle = on;\n  if (P.queue.length > 1 && !isWave()) {\n    const current = P.queue[P.index];\n    if (on) {\n      P.original = [...P.queue];\n      const upcoming = P.queue.slice(P.index + 1);\n      shuffleInPlace(upcoming);\n      P.queue = [...P.queue.slice(0, P.index + 1), ...upcoming];\n    } else if (P.original) {\n      const known = new Set(P.original.map(t => t.id));\n      const extra = P.queue.filter(t => !known.has(t.id));\n      P.queue = [...P.original.filter(t => P.queue.some(q => q.id === t.id)), ...extra];\n      P.index = Math.max(0, P.queue.findIndex(t => t.id === current?.id));\n    }\n    engine.standby().unload();\n  }\n  emit('queue');\n  emit('state');\n}\nexport function cycleRepeat() {\n  P.repeat = { off: 'all', all: 'one', one: 'off' }[P.repeat];\n  emit('state');\n}\n\nexport function playNext(track) {\n  remember([track]);\n  P.queue = P.queue.filter((t, i) => t.id !== track.id || i === P.index);\n  if (P.index < 0 || !P.track) return playList([track], 0);\n  P.queue.splice(P.index + 1, 0, track);\n  engine.standby().unload();\n  emit('queue');\n  toast('Сыграет следующим', { glyph: 'queue' });\n}\nexport function enqueue(track) {\n  remember([track]);\n  if (!P.track) return playList([track], 0);\n  if (P.queue.some((t, i) => t.id === track.id && i > P.index)) { toast('Уже в очереди', { glyph: 'queue' }); return; }\n  P.queue.push(track);\n  emit('queue');\n  toast('Добавлено в очередь', { glyph: 'plus' });\n}\nexport function removeAt(index) {\n  if (index === P.index || !P.queue[index]) return;\n  P.queue.splice(index, 1);\n  if (index < P.index) P.index--;\n  engine.standby().unload();\n  emit('queue');\n}\nexport function moveItem(from, to) {\n  if (from === P.index || !P.queue[from]) return;\n  to = Math.max(P.index + 1, Math.min(P.queue.length - 1, to));\n  const [item] = P.queue.splice(from, 1);\n  P.queue.splice(to, 0, item);\n  if (from < P.index && to >= P.index) P.index--;\n  engine.standby().unload();\n  emit('queue');\n}\n\nexport function setVolume(value) {\n  engine.setVolume(value / 100);\n  widget.setVolume(value / 100);\n}\n\n// ── «Моя волна» ──\nfunction waveBody(extra = {}) {\n  const w = P.wave;\n  const body = {\n    seed: w?.seed || undefined,\n    liked: w?.liked.slice(-24) || [],\n    played: [...new Set([...(w?.played || []), ...P.queue.slice(Math.max(0, P.index)).map(t => t.id)])].slice(-400),\n    skipped: w?.skipped.slice(-40) || [],\n    mood: prefs.waveMood, activity: prefs.waveActivity, character: prefs.waveCharacter, taste: prefs.taste, count: 10,\n    ...extra,\n  };\n  if (!inTelegram) {\n    body.favorites = state.favorites.slice(0, 120).map(t => ({ id: t.id, artist: t.artist, userId: t.userId || t.artistId, dur: t.dur }));\n    body.recent = state.recent.slice(0, 60).map(t => ({ id: t.id, artist: t.artist, userId: t.userId || t.artistId, dur: t.dur }));\n    body.dislikes = state.dislikes.slice(0, 1000).map(t => t.id);\n  }\n  return body;\n}\n\nexport async function startWave({ seed = null, quiet = false, label = '' } = {}) {\n  engine.ensureContext();\n  const token = Symbol('wave');\n  P.wave = { token, seed, liked: [], skipped: [], played: [], loading: true, label: label || 'Моя волна' };\n  emit('wave');\n  if (!quiet) haptic('medium');\n  try {\n    const data = await api('wave', { body: waveBody() });\n    if (P.wave?.token !== token) return;\n    P.wave.loading = false;\n    const items = data.items.filter(t => !isDisliked(t.id));\n    if (!items.length) throw Error('Волна пока пустая — послушайте пару треков, и она подстроится.');\n    void playList(items, 0, { type: 'wave', label: P.wave.label, href: '/' });\n    emit('wave');\n  } catch (error) {\n    if (P.wave?.token === token) { P.wave = null; emit('wave'); }\n    toast(error.message || 'Волна недоступна', { glyph: 'cloud' });\n  }\n}\n\nexport function stopWave() {\n  if (!P.wave) return;\n  P.wave = null;\n  P.context = { type: 'queue', label: 'Очередь', href: '' };\n  emit('wave');\n}\n\nlet extending = null;\nasync function extendWave(force = false) {\n  if (!isWave()) return;\n  if (!force && P.queue.length - P.index > 3) return;\n  if (extending) return extending;\n  const token = P.wave.token;\n  extending = api('wave', { body: waveBody() }).then(data => {\n    if (P.wave?.token !== token) return;\n    const known = new Set(P.queue.map(t => t.id));\n    const fresh = data.items.filter(t => !known.has(t.id) && !isDisliked(t.id));\n    remember(fresh);\n    P.queue.push(...fresh);\n    emit('queue');\n  }).catch(() => {}).finally(() => { extending = null; });\n  return extending;\n}\nfunction maybeExtendWave() { if (isWave()) void extendWave(); }\n\n/** Настройки волны изменились — заменяем то, что ещё не играло. */\nexport async function retuneWave() {\n  if (!isWave()) return;\n  const token = P.wave.token;\n  P.queue = P.queue.slice(0, P.index + 1);\n  engine.standby().unload();\n  emit('queue');\n  await extendWave(true);\n  if (P.wave?.token === token) toast('Волна подстроилась', { glyph: 'sparkle' });\n}\n\nexport function likeCurrent() {\n  if (!P.track) return;\n  const active = toggleLike(P.track);\n  haptic(active ? 'success' : 'light');\n  if (active) logEvent('like');\n  if (active && P.wave) P.wave.liked.push(P.track.id);\n  return active;\n}\nexport function dislikeTrack(track) {\n  const active = setDislike(track);\n  if (active) {\n    logEvent('dislike', track);\n    if (P.wave) P.wave.skipped.push(track.artist, track.artist);\n    toast('Больше не будем это предлагать', { glyph: 'dislike', action: { label: 'Вернуть', run: () => setDislike(track, false) } });\n    if (P.track?.id === track.id) next({ auto: true });\n    else {\n      const i = P.queue.findIndex((t, n) => t.id === track.id && n > P.index);\n      if (i > 0) removeAt(i);\n    }\n  }\n  return active;\n}\n\n// ── таймер сна ──\nlet sleepTimer = 0, sleepAt = 0;\nexport function setSleep(minutes) {\n  clearTimeout(sleepTimer);\n  sleepAt = minutes ? Date.now() + minutes * 60e3 : 0;\n  if (minutes === -1) { sleepAt = -1; emit('state'); return; }\n  if (minutes) sleepTimer = setTimeout(() => { sleepAt = 0; pause(); toast('Таймер сна: воспроизведение остановлено', { glyph: 'timer' }); emit('state'); }, minutes * 60e3);\n  emit('state');\n}\nexport const sleepLeft = () => sleepAt === -1 ? -1 : sleepAt ? Math.max(0, sleepAt - Date.now()) : 0;\n\n// ── Media Session ──\nfunction updateMetadata() {\n  if (!('mediaSession' in navigator) || !P.track) return;\n  const art = safeUrl(P.track.artwork);\n  try {\n    navigator.mediaSession.metadata = new MediaMetadata({\n      title: P.track.title, artist: P.track.artist, album: P.track.album || P.context.label || 'Lo-fi',\n      artwork: art ? [{ src: artSize(art, 't300x300'), sizes: '300x300', type: 'image/jpeg' }, { src: art, sizes: '500x500', type: 'image/jpeg' }] : [],\n    });\n  } catch { /* старый браузер */ }\n}\nfunction updateSession() {\n  if (!('mediaSession' in navigator)) return;\n  navigator.mediaSession.playbackState = !P.track ? 'none' : P.status === 'playing' ? 'playing' : 'paused';\n}\nfunction updatePosition() {\n  if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;\n  const dur = duration();\n  if (!dur) return;\n  try { navigator.mediaSession.setPositionState({ duration: dur, position: Math.min(dur, position()), playbackRate: 1 }); } catch {}\n}\nif ('mediaSession' in navigator) {\n  const handlers = {\n    play: () => play(), pause: () => pause(), previoustrack: () => prev(), nexttrack: () => next(),\n    seekto: e => seek(e.seekTime), seekbackward: e => seek(position() - (e.seekOffset || 10)), seekforward: e => seek(position() + (e.seekOffset || 10)),\n  };\n  for (const [action, fn] of Object.entries(handlers)) { try { navigator.mediaSession.setActionHandler(action, fn); } catch {} }\n}\n\n// Аудиоконтекст засыпает в фоне на некоторых устройствах — будим при возврате.\ndocument.addEventListener('visibilitychange', () => { if (!document.hidden && engine.ctx?.state === 'suspended' && P.want) engine.ctx.resume().catch(() => {}); });\n\nfunction shuffleInPlace(list) {\n  for (let i = list.length - 1; i > 0; i--) {\n    const j = Math.floor(Math.random() * (i + 1));\n    [list[i], list[j]] = [list[j], list[i]];\n  }\n  return list;\n}\n\nexport { isLiked };\n",
  "/js/store.js": "// Состояние пользователя: настройки, избранное, история, скрытые треки и синхронизация с сервером.\n\nimport { CHOICES, DEFAULTS, RANGES, TASTE } from './schema.js';\nimport { api, bus, load, save, inTelegram, setHaptics } from './core.js';\n\nconst stored = load('prefs', null) || (() => { try { return JSON.parse(localStorage.getItem('lofi2:prefs:last')); } catch { return null; } })() || {};\n\nexport function clean(value) {\n  const prefs = { ...DEFAULTS, taste: {} };\n  if (!value || typeof value !== 'object') return prefs;\n  for (const [key, values] of Object.entries(CHOICES)) if (values.includes(value[key])) prefs[key] = value[key];\n  for (const key of Object.keys(DEFAULTS)) if (typeof DEFAULTS[key] === 'boolean' && typeof value[key] === 'boolean') prefs[key] = value[key];\n  for (const [key, [min, max]] of Object.entries(RANGES)) if (Number.isFinite(value[key])) prefs[key] = Math.round(Math.min(max, Math.max(min, value[key])));\n  if (value.taste && typeof value.taste === 'object') {\n    prefs.taste = Object.fromEntries(Object.entries(value.taste).filter(([k, v]) => k && k.length <= 140 && TASTE.includes(v) && v !== 'normal').slice(-80));\n  }\n  return prefs;\n}\n\nexport const prefs = clean(stored);\nexport const state = {\n  favorites: load('favorites', []),\n  recent: load('recent', []),\n  dislikes: load('dislikes', []),\n  searches: load('searches', []),\n  lyricOffsets: load('lyric-offsets', {}),\n  synced: false,\n  hydrated: !inTelegram,\n};\n\n/** Все известные клиенту треки по id (для кнопок в списках). */\nexport const catalogue = new Map();\nexport function remember(tracks = []) { for (const t of tracks) if (t?.id) catalogue.set(String(t.id), t); }\nremember([...state.favorites, ...state.recent]);\n\n// ── синхронизация ──\nconst queues = new Map();\nconst pendingOps = [];\nfunction sync(path, body, key = path) {\n  if (!inTelegram) return;\n  if (!state.hydrated) { pendingOps.push([path, body, key]); return; }\n  if (!state.synced) return;\n  const previous = queues.get(key) || Promise.resolve();\n  const next = previous.catch(() => {}).then(() => api(path, { body })).catch(error => { if (error.status === 401) state.synced = false; });\n  queues.set(key, next);\n  next.finally(() => { if (queues.get(key) === next) queues.delete(key); });\n}\n\nlet prefsTimer;\nfunction persistPrefs() {\n  save('prefs', prefs);\n  try { localStorage.setItem('lofi2:prefs:last', JSON.stringify({ theme: prefs.theme, motion: prefs.motion, glass: prefs.glass, textScale: prefs.textScale })); } catch {}\n  clearTimeout(prefsTimer);\n  prefsTimer = setTimeout(() => sync('preferences', { ...prefs }), 400);\n}\n\nexport function setPref(key, value) {\n  if (prefs[key] === value) return;\n  prefs[key] = value;\n  if (key === 'haptics') setHaptics(value);\n  persistPrefs();\n  bus.emit('prefs', key);\n}\nexport function setTaste(artist, level) {\n  const taste = { ...prefs.taste };\n  if (level === 'normal') delete taste[artist]; else taste[artist] = level;\n  prefs.taste = Object.fromEntries(Object.entries(taste).slice(-80));\n  persistPrefs();\n  bus.emit('prefs', 'taste');\n}\nexport function resetPrefs() {\n  Object.assign(prefs, clean({}));\n  persistPrefs();\n  bus.emit('prefs', '*');\n}\nsetHaptics(prefs.haptics);\n\n// ── избранное, история, скрытые ──\nexport const isLiked = id => state.favorites.some(t => t.id === String(id));\nexport const isDisliked = id => state.dislikes.some(t => t.id === String(id));\nconst slim = t => ({ id: t.id, title: t.title, artist: t.artist, dur: t.dur, artwork: t.artwork, artistId: t.artistId || '', userId: t.userId || '',\n  avatar: t.avatar || '', url: t.url || '', album: t.album || '', canvas: t.canvas || '', available: t.available !== false, genre: t.genre || '' });\n\nexport function toggleLike(track, force) {\n  if (!track) return false;\n  const active = force ?? !isLiked(track.id);\n  state.favorites = active ? [slim(track), ...state.favorites.filter(t => t.id !== track.id)].slice(0, 1000) : state.favorites.filter(t => t.id !== track.id);\n  if (active) state.dislikes = state.dislikes.filter(t => t.id !== track.id);\n  save('favorites', state.favorites);\n  save('dislikes', state.dislikes);\n  remember([track]);\n  sync('favorite', { id: track.id, active }, 'favorite:' + track.id);\n  bus.emit('library', { kind: 'favorite', track, active });\n  return active;\n}\n\nexport function setDislike(track, active = !isDisliked(track.id)) {\n  if (!track) return false;\n  state.dislikes = active ? [slim(track), ...state.dislikes.filter(t => t.id !== track.id)].slice(0, 1000) : state.dislikes.filter(t => t.id !== track.id);\n  if (active && isLiked(track.id)) toggleLike(track, false);\n  save('dislikes', state.dislikes);\n  sync('dislike', { id: track.id, active }, 'dislike:' + track.id);\n  bus.emit('library', { kind: 'dislike', track, active });\n  return active;\n}\n\nexport function addRecent(track) {\n  if (!track) return;\n  state.recent = [slim(track), ...state.recent.filter(t => t.id !== track.id)].slice(0, 100);\n  save('recent', state.recent);\n  sync('recent', { id: track.id }, 'recent:' + track.id);\n  bus.emit('library', { kind: 'recent', track, active: true });\n}\n\nexport function clearList(kind) {\n  if (kind === 'recent') { state.recent = []; save('recent', []); }\n  if (kind === 'dislike') { state.dislikes = []; save('dislikes', []); }\n  sync('clear', { kind }, 'clear:' + kind);\n  bus.emit('library', { kind, cleared: true });\n}\n\nexport function rememberSearch(query) {\n  const q = query.trim();\n  if (q.length < 2) return;\n  state.searches = [q, ...state.searches.filter(s => s.toLowerCase() !== q.toLowerCase())].slice(0, 12);\n  save('searches', state.searches);\n}\nexport function forgetSearches() { state.searches = []; save('searches', []); }\n\nexport function lyricOffset(id) { return (state.lyricOffsets[id] || 0) + prefs.lyricOffset; }\nexport function nudgeLyrics(id, delta) {\n  const value = Math.max(-10000, Math.min(10000, (state.lyricOffsets[id] || 0) + delta));\n  if (value) state.lyricOffsets[id] = value; else delete state.lyricOffsets[id];\n  const keys = Object.keys(state.lyricOffsets);\n  if (keys.length > 300) delete state.lyricOffsets[keys[0]];\n  save('lyric-offsets', state.lyricOffsets);\n  return value;\n}\nexport const trackLyricOffset = id => state.lyricOffsets[id] || 0;\n\n/** Доли артистов среди избранного и истории. */\nexport function tasteStats() {\n  const counts = new Map();\n  for (const t of [...state.favorites.slice(0, 300), ...state.recent]) {\n    if (!t.artist) continue;\n    const row = counts.get(t.artist) || { name: t.artist, n: 0, track: t };\n    row.n++;\n    counts.set(t.artist, row);\n  }\n  for (const name of Object.keys(prefs.taste)) if (!counts.has(name)) counts.set(name, { name, n: 0 });\n  const sum = [...counts.values()].reduce((s, a) => s + a.n, 0) || 1;\n  return [...counts.values()].sort((a, b) => b.n - a.n).map(a => ({ ...a, share: Math.round(a.n * 100 / sum) }));\n}\n\n// ── загрузка профиля из Telegram ──\nexport async function hydrate() {\n  if (!inTelegram) return;\n  try {\n    const data = await api('state');\n    state.synced = true;\n    state.favorites = data.favorites || [];\n    state.recent = data.recent || [];\n    state.dislikes = data.dislikes || [];\n    if (data.preferences) Object.assign(prefs, clean(data.preferences));\n    save('favorites', state.favorites);\n    save('recent', state.recent);\n    save('dislikes', state.dislikes);\n    remember([...state.favorites, ...state.recent]);\n  } catch { /* остаёмся на локальных данных */ }\n  state.hydrated = true;\n  // Действия, сделанные до загрузки профиля, применяются поверх данных сервера.\n  const ops = pendingOps.splice(0);\n  for (const [path, body, key] of ops) {\n    if (path === 'favorite') {\n      const t = state.favorites.find(x => x.id === body.id) || catalogue.get(body.id);\n      if (body.active && t && !isLiked(body.id)) state.favorites.unshift(slim(t));\n      if (!body.active) state.favorites = state.favorites.filter(x => x.id !== body.id);\n    }\n    if (path === 'recent') { const t = catalogue.get(body.id); if (t) state.recent = [slim(t), ...state.recent.filter(x => x.id !== t.id)].slice(0, 100); }\n    if (path === 'dislike') { const t = catalogue.get(body.id); if (body.active && t) state.dislikes.unshift(slim(t)); else state.dislikes = state.dislikes.filter(x => x.id !== body.id); }\n    if (path === 'preferences') { Object.assign(prefs, clean(body)); continue; }\n    sync(path, body, key);\n  }\n  if (ops.some(([path]) => path === 'preferences')) sync('preferences', { ...prefs });\n  save('prefs', prefs);\n  save('favorites', state.favorites);\n  save('recent', state.recent);\n  save('dislikes', state.dislikes);\n  setHaptics(prefs.haptics);\n  bus.emit('prefs', '*');\n  bus.emit('library', { kind: '*' });\n}\n",
  "/js/ui.js": "// Общие элементы интерфейса: листы, меню, тосты, переходы страниц, слайдеры и карточки.\n\nimport { $, $$, esc, icon, clock, sleep, motionReduced, coarse, wide, safeUrl, artSize, haptic } from './core.js';\nimport { isLiked } from './store.js';\n\n// ── картинки: плавное появление без сдвига вёрстки ──\ndocument.addEventListener('load', event => {\n  const img = event.target;\n  if (img.tagName === 'IMG') img.classList.add('is-loaded');\n}, true);\ndocument.addEventListener('error', event => {\n  const img = event.target;\n  if (img.tagName === 'IMG') img.remove();\n}, true);\n\nexport function cover(url, { size = 't300x300', cls = '', eager = false } = {}) {\n  const src = safeUrl(url);\n  return `<span class=\"cover${cls ? ' ' + cls : ''}\">${icon('logo', 'ph')}${src ? `<img src=\"${esc(artSize(src, size))}\" alt=\"\" decoding=\"async\"${eager ? '' : ' loading=\"lazy\"'}>` : ''}</span>`;\n}\n\n// ── строки и карточки ──\nexport const eq = '<span class=\"eq\" aria-hidden=\"true\"><i></i><i></i><i></i></span>';\n\nexport function trackRow(track, { source = '', index = 0, number = false, compact = false } = {}) {\n  const id = esc(track.id);\n  if (track.available === false) {\n    return `<div class=\"row is-unavailable\" style=\"--i:${Math.min(index, 14)}\">\n      <span class=\"row-lead\">${number ? `<span class=\"row-num\">${index + 1}</span>` : cover(track.artwork)}</span>\n      <span class=\"row-text\"><strong>${esc(track.title)}</strong><small>${esc(track.artist)} · недоступен</small></span></div>`;\n  }\n  const liked = isLiked(track.id);\n  return `<div class=\"row${compact ? ' compact' : ''}\" data-row=\"${id}\" style=\"--i:${Math.min(index, 14)}\">\n    <button class=\"row-main\" type=\"button\" data-action=\"play-track\" data-id=\"${id}\" data-source=\"${esc(source)}\" data-index=\"${index}\">\n      <span class=\"row-lead\">${number ? `<span class=\"row-num\">${index + 1}</span>` : cover(track.artwork, { size: 't120x120' })}<span class=\"row-play\">${icon('play')}${eq}</span></span>\n      <span class=\"row-text\"><strong>${esc(track.title)}${track.explicit ? '<em class=\"badge-e\" title=\"Ненормативная лексика\">E</em>' : ''}</strong><small>${esc(track.artist)}</small></span>\n    </button>\n    ${compact ? '' : `<time class=\"row-time\">${track.dur ? clock(track.dur) : ''}</time>`}\n    <button class=\"icon-btn ghost row-like${liked ? ' is-on' : ''}\" type=\"button\" data-action=\"like\" data-id=\"${id}\" aria-pressed=\"${liked}\" aria-label=\"${liked ? 'Убрать из избранного' : 'В избранное'}\">${icon(liked ? 'heart-fill' : 'heart')}</button>\n    <button class=\"icon-btn ghost row-more\" type=\"button\" data-action=\"track-menu\" data-id=\"${id}\" aria-label=\"Действия\">${icon('more')}</button>\n  </div>`;\n}\n\nexport const trackList = (tracks, options = {}) =>\n  `<div class=\"rows\">${tracks.map((t, i) => trackRow(t, { ...options, index: i })).join('')}</div>`;\n\nexport function albumCard(album, i = 0) {\n  return `<a class=\"card\" href=\"/album/${esc(album.id)}\" data-link style=\"--i:${Math.min(i, 12)}\">\n    ${cover(album.artwork, { cls: 'card-cover' })}\n    <strong>${esc(album.title)}</strong><small>${esc(album.artist)}${album.year ? ' · ' + esc(album.year) : ''}</small></a>`;\n}\n\nexport function artistCard(user, i = 0) {\n  return `<a class=\"card artist\" href=\"/artist/${esc(user.id)}\" data-link style=\"--i:${Math.min(i, 12)}\">\n    ${cover(user.artwork, { cls: 'card-cover round' })}\n    <strong>${esc(user.title)}${user.verified ? ' ' + icon('check', 'verified') : ''}</strong><small>${user.followers ? formatCount(user.followers) + ' слушателей' : 'Артист'}</small></a>`;\n}\n\nexport const formatCount = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace('.', ',') + ' млн' : n >= 1e3 ? Math.round(n / 1e3) + ' тыс.' : String(n);\n\nexport const sectionHead = (title, link = '', linkLabel = 'Все') =>\n  `<div class=\"section-head\"><h2>${esc(title)}</h2>${link ? `<a class=\"text-link\" href=\"${esc(link)}\" data-link>${esc(linkLabel)}${icon('forward')}</a>` : ''}</div>`;\n\nexport const skeletonRows = (n = 6) => `<div class=\"rows\" aria-hidden=\"true\">${Array.from({ length: n }, () =>\n  '<div class=\"row skeleton\"><span class=\"row-lead\"><span class=\"sk sk-cover\"></span></span><span class=\"row-text\"><i class=\"sk sk-line\"></i><i class=\"sk sk-line short\"></i></span></div>').join('')}</div>`;\nconst skeletonCard = round => `<div class=\"card skeleton\"><span class=\"sk sk-card${round ? ' round' : ''}\"></span><i class=\"sk sk-line\"></i><i class=\"sk sk-line short\"></i></div>`;\nexport const skeletonCards = (n = 6, round = false) => `<div class=\"shelf\" aria-hidden=\"true\">${Array.from({ length: n }, () => skeletonCard(round)).join('')}</div>`;\nexport const skeletonGrid = (n = 8, round = false) => `<div class=\"grid-cards\" aria-hidden=\"true\">${Array.from({ length: n }, () => skeletonCard(round)).join('')}</div>`;\n\nexport const empty = (glyph, title, text = '', action = '') =>\n  `<div class=\"empty\">${icon(glyph)}<strong>${esc(title)}</strong>${text ? `<p>${esc(text)}</p>` : ''}${action}</div>`;\n\n// ── переходы между страницами ──\nlet viewToken = 0;\nexport async function swapView(html, { mount, scroll = 0, direction = 'forward' } = {}) {\n  const token = ++viewToken;\n  const view = $('#view');\n  if (!motionReduced() && view.firstElementChild) {\n    view.dataset.leaving = direction;\n    await sleep(130);\n    if (token !== viewToken) return false;\n  }\n  view.innerHTML = `<div class=\"page\" data-dir=\"${direction}\">${html}</div>`;\n  delete view.dataset.leaving;\n  window.scrollTo({ top: scroll, behavior: 'instant' });\n  mount?.(view.firstElementChild);\n  return true;\n}\nexport const viewAlive = token => token === viewToken;\nexport const currentViewToken = () => viewToken;\n\n// ── тосты (в верхнем слое, поверх открытых диалогов) ──\nconst supportsPopover = typeof HTMLElement.prototype.showPopover === 'function';\nfunction raise(el) {\n  if (!supportsPopover) return;\n  try { if (el.matches(':popover-open')) el.hidePopover(); el.showPopover(); } catch { /* уже показан */ }\n}\nexport function toast(message, { glyph = '', action = null, duration = 2800 } = {}) {\n  const box = $('#toasts');\n  raise(box);\n  const el = document.createElement('div');\n  el.className = 'toast glass';\n  el.setAttribute('role', 'status');\n  el.innerHTML = `${glyph ? icon(glyph) : ''}<span>${esc(message)}</span>${action ? `<button type=\"button\">${esc(action.label)}</button>` : ''}`;\n  if (action) el.querySelector('button').addEventListener('click', () => { action.run(); dismiss(); });\n  box.append(el);\n  while (box.children.length > 3) box.firstElementChild.remove();\n  requestAnimationFrame(() => el.classList.add('is-in'));\n  let timer = setTimeout(dismiss, duration);\n  el.addEventListener('pointerenter', () => clearTimeout(timer));\n  el.addEventListener('pointerleave', () => { timer = setTimeout(dismiss, 1200); });\n  function dismiss() {\n    clearTimeout(timer);\n    el.classList.remove('is-in');\n    el.classList.add('is-out');\n    setTimeout(() => el.remove(), motionReduced() ? 0 : 320);\n  }\n  return dismiss;\n}\n\n// ── листы: снизу на телефоне, по центру на компьютере ──\nconst sheet = $('#sheet');\nconst sheetState = { closing: null, onClose: null, kind: '' };\n\nexport function openSheet({ title = '', body = '', kind = '', size = '', onClose = null } = {}) {\n  sheetState.kind = kind;\n  const reopen = sheet.open && !sheetState.closing;\n  clearTimeout(sheetState.closing);\n  sheetState.closing = null;\n  const prevClose = sheetState.onClose;\n  sheetState.onClose = onClose;\n  if (reopen) prevClose?.();\n  const html = `<div class=\"sheet-scrim\" data-action=\"sheet-close\"></div>\n    <div class=\"sheet-panel glass${size ? ' ' + size : ''}\" role=\"document\">\n      <div class=\"sheet-grabber\" aria-hidden=\"true\"></div>\n      <header class=\"sheet-head\"><h2 id=\"sheet-title\">${esc(title)}</h2>\n        <button class=\"icon-btn ghost\" type=\"button\" data-action=\"sheet-close\" aria-label=\"Закрыть\">${icon('close')}</button></header>\n      <div class=\"sheet-body\">${body}</div>\n    </div>`;\n  if (reopen) {\n    const panel = $('.sheet-panel', sheet);\n    panel.classList.add('is-swapping');\n    setTimeout(() => {\n      sheet.innerHTML = html;\n      sheet.classList.add('is-open');\n      bindDrag();\n    }, motionReduced() ? 0 : 110);\n    return sheet;\n  }\n  sheet.innerHTML = html;\n  sheet.classList.remove('is-open', 'is-closing');\n  if (!sheet.open) sheet.showModal();\n  bindDrag();\n  requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('is-open')));\n  haptic('light');\n  return sheet;\n}\n\nexport function updateSheetBody(html) {\n  const body = $('.sheet-body', sheet);\n  if (body) body.innerHTML = html;\n}\nexport const sheetKind = () => (sheet.open && !sheetState.closing ? sheetState.kind : '');\n\nexport function closeSheet() {\n  if (!sheet.open || sheetState.closing) return;\n  sheet.classList.remove('is-open');\n  sheet.classList.add('is-closing');\n  const done = () => {\n    sheetState.closing = null;\n    sheet.classList.remove('is-closing');\n    if (sheet.open) sheet.close();\n    sheet.innerHTML = '';\n    const fn = sheetState.onClose;\n    sheetState.onClose = null;\n    fn?.();\n  };\n  sheetState.closing = setTimeout(done, motionReduced() ? 0 : 300);\n}\nsheet.addEventListener('cancel', event => { event.preventDefault(); closeSheet(); });\n\nfunction bindDrag() {\n  const panel = $('.sheet-panel', sheet);\n  const handle = $('.sheet-grabber', sheet);\n  const head = $('.sheet-head', sheet);\n  if (!panel) return;\n  let startY = 0, dy = 0, startT = 0, dragging = false;\n  const down = event => {\n    if (wide.matches || event.target.closest('button')) return;\n    dragging = true; startY = event.clientY; dy = 0; startT = performance.now();\n    panel.style.transition = 'none';\n    event.currentTarget.setPointerCapture(event.pointerId);\n  };\n  const move = event => {\n    if (!dragging) return;\n    dy = Math.max(0, event.clientY - startY);\n    panel.style.transform = `translateY(${dy}px)`;\n  };\n  const up = () => {\n    if (!dragging) return;\n    dragging = false;\n    panel.style.transition = '';\n    panel.style.transform = '';\n    const velocity = dy / Math.max(1, performance.now() - startT);\n    if (dy > 110 || velocity > .6) closeSheet();\n  };\n  for (const el of [handle, head]) {\n    el.addEventListener('pointerdown', down);\n    el.addEventListener('pointermove', move);\n    el.addEventListener('pointerup', up);\n    el.addEventListener('pointercancel', up);\n  }\n}\n\n// ── контекстное меню: поповер на компьютере, лист на телефоне ──\nconst popover = $('#popover');\nlet popoverItems = [];\n\nexport function openMenu(anchor, { title = '', header = '', items = [] }) {\n  const visible = items.filter(Boolean);\n  const html = visible.map((item, i) => item.divider ? '<hr>' :\n    `<button class=\"menu-item${item.danger ? ' danger' : ''}\" type=\"button\" role=\"menuitem\" data-menu=\"${i}\">${icon(item.icon)}<span>${esc(item.label)}</span>${item.hint ? `<small>${esc(item.hint)}</small>` : ''}</button>`).join('');\n  popoverItems = visible;\n  if (coarse.matches || !wide.matches || !anchor || !supportsPopover) {\n    openSheet({ title, body: `${header}<div class=\"menu-list\">${html}</div>`, kind: 'menu' });\n    return;\n  }\n  closeMenu(true);\n  popover.innerHTML = `${header ? `<div class=\"menu-header\">${header}</div>` : ''}<div class=\"menu-list\">${html}</div>`;\n  raise(popover);\n  const rect = anchor.getBoundingClientRect();\n  const width = popover.offsetWidth, height = popover.offsetHeight;\n  const below = rect.bottom + 6 + height < innerHeight - 8;\n  const left = Math.min(innerWidth - width - 10, Math.max(10, rect.right - width));\n  const top = below ? rect.bottom + 6 : Math.max(10, rect.top - height - 6);\n  popover.style.left = left + 'px';\n  popover.style.top = top + 'px';\n  popover.style.transformOrigin = `${rect.left + rect.width / 2 - left}px ${below ? 0 : height}px`;\n  requestAnimationFrame(() => popover.classList.add('is-open'));\n  $('.menu-item', popover)?.focus({ preventScroll: true });\n}\n\nconst menuOpen = () => supportsPopover && popover.matches(':popover-open');\nexport function closeMenu(instant = false) {\n  if (!menuOpen()) return;\n  popover.classList.remove('is-open');\n  const hide = () => { if (!popover.classList.contains('is-open') && menuOpen()) popover.hidePopover(); };\n  if (instant || motionReduced()) hide(); else setTimeout(hide, 160);\n}\n\ndocument.addEventListener('click', event => {\n  const item = event.target.closest('[data-menu]');\n  if (item && (popover.contains(item) || sheet.contains(item))) {\n    const entry = popoverItems[Number(item.dataset.menu)];\n    closeMenu();\n    if (sheet.contains(item)) closeSheet();\n    haptic('select');\n    entry?.run?.();\n    return;\n  }\n  if (menuOpen() && !popover.contains(event.target) && !event.target.closest('[data-action=\"track-menu\"],[data-action=\"player-menu\"],[data-action=\"sleep-menu\"]')) closeMenu();\n});\ndocument.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });\naddEventListener('resize', () => closeMenu(true));\naddEventListener('scroll', () => closeMenu(), { passive: true });\n\n// ── слайдер на указателе (позиция трека, громкость, настройки) ──\nexport class Slider {\n  constructor(el, { onInput, onCommit, step = 0.02, label = v => Math.round(v * 100) + '%' } = {}) {\n    this.el = el; this.value = 0; this.dragging = false;\n    this.onInput = onInput; this.onCommit = onCommit; this.step = step; this.label = label;\n    el.addEventListener('pointerdown', e => this.down(e));\n    el.addEventListener('pointermove', e => this.move(e));\n    el.addEventListener('pointerup', e => this.up(e));\n    el.addEventListener('pointercancel', e => this.up(e));\n    el.addEventListener('keydown', e => this.key(e));\n  }\n  ratio(event) {\n    const rect = this.el.getBoundingClientRect();\n    return Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));\n  }\n  down(event) {\n    if (this.el.getAttribute('aria-disabled') === 'true') return;\n    this.dragging = true;\n    this.el.classList.add('is-dragging');\n    this.el.setPointerCapture(event.pointerId);\n    this.set(this.ratio(event));\n    this.onInput?.(this.value);\n  }\n  move(event) {\n    if (!this.dragging) return;\n    this.set(this.ratio(event));\n    this.onInput?.(this.value);\n  }\n  up() {\n    if (!this.dragging) return;\n    this.dragging = false;\n    this.el.classList.remove('is-dragging');\n    this.onCommit?.(this.value);\n  }\n  key(event) {\n    const delta = { ArrowRight: this.step, ArrowUp: this.step, ArrowLeft: -this.step, ArrowDown: -this.step, PageUp: .1, PageDown: -.1 }[event.key];\n    if (delta === undefined && !['Home', 'End'].includes(event.key)) return;\n    event.preventDefault();\n    this.set(event.key === 'Home' ? 0 : event.key === 'End' ? 1 : this.value + delta);\n    this.onInput?.(this.value);\n    this.onCommit?.(this.value);\n  }\n  set(value) {\n    this.value = Math.min(1, Math.max(0, Number(value) || 0));\n    this.el.style.setProperty('--v', this.value);\n    this.el.setAttribute('aria-valuenow', String(Math.round(this.value * 100)));\n    this.el.setAttribute('aria-valuetext', this.label(this.value));\n  }\n  disable(flag) { this.el.setAttribute('aria-disabled', String(!!flag)); }\n}\n\n/** Обновляет состояние лайков во всех видимых списках. */\nexport function refreshLikes(root = document) {\n  for (const button of $$('[data-action=\"like\"][data-id]', root)) {\n    const on = isLiked(button.dataset.id);\n    if (button.classList.contains('is-on') === on) continue;\n    button.classList.toggle('is-on', on);\n    button.setAttribute('aria-pressed', String(on));\n    button.setAttribute('aria-label', on ? 'Убрать из избранного' : 'В избранное');\n    button.innerHTML = icon(on ? 'heart-fill' : 'heart');\n    if (on && !motionReduced()) { button.classList.remove('pop'); void button.offsetWidth; button.classList.add('pop'); }\n  }\n}\n",
  "/js/wave-visual.js": "// Анимация «Моей волны»: пучок световых лент (ribbons) или живое кольцо (orb).\n// Амплитуда следует за спектром музыки, цвет — за обложкой текущего трека.\n\nimport { motionReduced, root } from './core.js';\n\nconst lerp = (a, b, t) => a + (b - a) * t;\nconst mix = (c1, c2, t) => c1.map((v, i) => Math.round(lerp(v, c2[i], t)));\n\nconst DEFAULT_DARK = [[236, 236, 240], [150, 150, 160]];\nconst DEFAULT_LIGHT = [[28, 28, 32], [110, 110, 120]];\n\nexport class WaveVisual {\n  constructor(canvas, { levels, shape = 'ribbons', lines = 7, intensity = 1 } = {}) {\n    this.canvas = canvas;\n    this.ctx = canvas.getContext('2d');\n    this.levels = levels || (() => ({ bass: 0, mid: 0, high: 0, energy: 0 }));\n    this.shape = shape;\n    this.lines = lines;\n    this.intensity = intensity;\n    this.colors = null;\n    this.current = null;\n    this.target = null;\n    this.running = false;\n    this.visible = true;\n    this.active = false;\n    this.activity = 0;\n    this.t = Math.random() * 100;\n    this.last = 0;\n    this.frame = 0;\n    this.dpr = 1;\n    this.resize = this.resize.bind(this);\n    this.loop = this.loop.bind(this);\n    this.ro = new ResizeObserver(this.resize);\n    this.ro.observe(canvas);\n    this.io = new IntersectionObserver(entries => {\n      this.visible = entries.some(e => e.isIntersecting);\n      this.kick();\n    });\n    this.io.observe(canvas);\n    this.onVisibility = () => this.kick();\n    document.addEventListener('visibilitychange', this.onVisibility);\n    this.resize();\n  }\n\n  palette() {\n    if (this.colors) return this.colors;\n    return root.dataset.theme === 'light' ? DEFAULT_LIGHT : DEFAULT_DARK;\n  }\n  /** Цвета обложки: accent — яркий, average — средний. null — монохром. */\n  setColors(colors) {\n    if (!colors) { this.colors = null; return; }\n    const light = root.dataset.theme === 'light';\n    const lift = c => light ? c.map(v => Math.round(v * .7)) : c.map(v => Math.round(v + (255 - v) * .35));\n    const a = lift(colors.accent || colors.average);\n    const b = lift(colors.average);\n    this.colors = [a, mix(b, light ? [40, 40, 44] : [220, 220, 228], .45)];\n  }\n  setActive(active) { this.active = active; this.kick(); }\n\n  resize() {\n    const rect = this.canvas.getBoundingClientRect();\n    this.dpr = Math.min(2, window.devicePixelRatio || 1);\n    const w = Math.max(1, Math.round(rect.width * this.dpr)), h = Math.max(1, Math.round(rect.height * this.dpr));\n    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }\n    if (!this.running || motionReduced()) this.draw(0);\n  }\n\n  start() { this.running = true; this.kick(); }\n  stop() { this.running = false; cancelAnimationFrame(this.frame); this.frame = 0; }\n  destroy() { this.stop(); this.ro.disconnect(); this.io.disconnect(); document.removeEventListener('visibilitychange', this.onVisibility); }\n\n  kick() {\n    if (!this.running) return;\n    if (motionReduced() || !this.visible || document.hidden) { cancelAnimationFrame(this.frame); this.frame = 0; this.draw(0); return; }\n    if (!this.frame) { this.last = performance.now(); this.frame = requestAnimationFrame(this.loop); }\n  }\n\n  loop(now) {\n    this.frame = 0;\n    if (!this.running || !this.visible || document.hidden || motionReduced()) return;\n    const dt = Math.min(.05, (now - this.last) / 1000);\n    this.last = now;\n    this.activity = lerp(this.activity, this.active ? 1 : 0, .04);\n    this.t += dt * (.35 + this.activity * .55);\n    this.draw(dt, now);\n    this.frame = requestAnimationFrame(this.loop);\n  }\n\n  draw(dt, now = performance.now()) {\n    const { ctx, canvas } = this;\n    const w = canvas.width, h = canvas.height;\n    if (!w || !h) return;\n    const lv = this.levels(now);\n    const energy = Math.min(1.2, lv.energy * 1.6) * this.activity;\n    const bass = Math.min(1.2, lv.bass * 1.5) * this.activity;\n    const [c1, c2] = this.palette();\n    this.current = this.current ? [mix(this.current[0], c1, .05), mix(this.current[1], c2, .05)] : [c1, c2];\n    const [ca, cb] = this.current;\n    const light = root.dataset.theme === 'light';\n    ctx.clearRect(0, 0, w, h);\n    ctx.globalCompositeOperation = light ? 'source-over' : 'lighter';\n    if (this.shape === 'orb') this.drawOrb(w, h, ca, cb, energy, bass, light);\n    else this.drawRibbons(w, h, ca, cb, energy, bass, light, lv);\n    ctx.globalCompositeOperation = 'source-over';\n  }\n\n  drawRibbons(w, h, ca, cb, energy, bass, light, lv) {\n    const { ctx } = this;\n    const n = this.lines, t = this.t, d = this.dpr;\n    // мягкое свечение за лентами\n    const glow = ctx.createRadialGradient(w * .62, h * .52, 0, w * .62, h * .52, Math.max(w, h) * .55);\n    glow.addColorStop(0, `rgba(${ca.join(',')},${(light ? .10 : .14) + energy * .12})`);\n    glow.addColorStop(1, 'rgba(0,0,0,0)');\n    ctx.fillStyle = glow;\n    ctx.fillRect(0, 0, w, h);\n    const step = Math.max(4, Math.round(7 * d));\n    for (let i = 0; i < n; i++) {\n      const f = n > 1 ? i / (n - 1) : .5;\n      const color = mix(ca, cb, f);\n      const base = h * (.5 + (f - .5) * .32);\n      const amp = h * (.12 + .06 * Math.sin(i * 1.7)) * (.55 + energy * .9 + bass * .35) * this.intensity;\n      const k = (1.15 + i * .16) * Math.PI * 2 / w;\n      const ph = t * (.9 + i * .13) + i * .8;\n      const pts = [];\n      for (let x = -step; x <= w + step; x += step) {\n        const env = .3 + .7 * Math.sin(Math.PI * Math.min(1, Math.max(0, x / w)));\n        const y = base + amp * env * (\n          Math.sin(k * x + ph) * .62 +\n          Math.sin(k * 1.85 * x - ph * 1.25 + i) * .28 +\n          Math.sin(k * .45 * x + ph * .55) * .42 +\n          (lv.high || 0) * this.activity * .25 * Math.sin(k * 5 * x + ph * 3));\n        pts.push(x, y);\n      }\n      // полупрозрачная лента под линией\n      const thick = h * (.035 + .02 * Math.sin(t + i)) * (1 + energy * .6);\n      ctx.beginPath();\n      ctx.moveTo(pts[0], pts[1]);\n      for (let p = 2; p < pts.length; p += 2) ctx.lineTo(pts[p], pts[p + 1]);\n      for (let p = pts.length - 2; p >= 0; p -= 2) ctx.lineTo(pts[p], pts[p + 1] + thick);\n      ctx.closePath();\n      const band = ctx.createLinearGradient(0, base - amp, 0, base + amp + thick);\n      const a = (light ? .05 : .055) + energy * .035;\n      band.addColorStop(0, `rgba(${color.join(',')},0)`);\n      band.addColorStop(.5, `rgba(${color.join(',')},${a})`);\n      band.addColorStop(1, `rgba(${color.join(',')},0)`);\n      ctx.fillStyle = band;\n      ctx.fill();\n      // тонкая светящаяся линия\n      ctx.beginPath();\n      ctx.moveTo(pts[0], pts[1]);\n      for (let p = 2; p < pts.length; p += 2) ctx.lineTo(pts[p], pts[p + 1]);\n      ctx.lineWidth = (i === Math.floor(n / 2) ? 1.8 : 1.1) * d;\n      ctx.strokeStyle = `rgba(${color.join(',')},${(light ? .42 : .5) + energy * .3 - Math.abs(f - .5) * .3})`;\n      ctx.stroke();\n    }\n  }\n\n  drawOrb(w, h, ca, cb, energy, bass, light) {\n    const { ctx } = this;\n    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * .3, t = this.t, d = this.dpr;\n    const rings = 5;\n    for (let i = 0; i < rings; i++) {\n      const f = i / (rings - 1);\n      const color = mix(ca, cb, f);\n      ctx.beginPath();\n      for (let s = 0; s <= 96; s++) {\n        const a = s / 96 * Math.PI * 2;\n        const r = R * (1 + (f - .5) * .5) + R * (.08 + energy * .16 + bass * .06) * (\n          Math.sin(a * 3 + t * (1.2 + i * .2) + i) * .6 + Math.sin(a * 5 - t * 1.6 + i * 2) * .35);\n        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;\n        if (s) ctx.lineTo(x, y); else ctx.moveTo(x, y);\n      }\n      ctx.closePath();\n      ctx.lineWidth = 1.2 * d;\n      ctx.strokeStyle = `rgba(${color.join(',')},${(light ? .55 : .6) - f * .25 + energy * .2})`;\n      ctx.stroke();\n    }\n  }\n}\n",
  "/manifest.webmanifest": "{\n  \"name\": \"Lo-fi\",\n  \"short_name\": \"Lo-fi\",\n  \"description\": \"«Моя волна», подборки под настроение и плеер с караоке.\",\n  \"start_url\": \"/\",\n  \"display\": \"standalone\",\n  \"background_color\": \"#050506\",\n  \"theme_color\": \"#050506\",\n  \"lang\": \"ru\",\n  \"icons\": [{ \"src\": \"/media/logo.svg\", \"sizes\": \"any\", \"type\": \"image/svg+xml\", \"purpose\": \"any\" }]\n}\n",
  "/media/logo.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\">\n  <rect width=\"64\" height=\"64\" rx=\"18\" fill=\"#0a0a0c\"/>\n  <circle cx=\"32\" cy=\"32\" r=\"19\" fill=\"none\" stroke=\"#f4f4f6\" stroke-width=\"3.2\"/>\n  <path d=\"M13 32c3.2-5.8 6.3-5.8 9.5 0s6.3 5.8 9.5 0 6.3-5.8 9.5 0 6.3 5.8 9.5 0\" fill=\"none\" stroke=\"#f4f4f6\" stroke-width=\"3.2\" stroke-linecap=\"round\"/>\n</svg>\n"
};
const __binary = {
  "/fonts/manrope-cyrillic.woff2": "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",
  "/fonts/manrope-latin.woff2": "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",
  "/media/welcome.png": "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"
};
globalThis.__lofiAssets = Object.assign(Object.create(null),
  Object.fromEntries(Object.entries(__text).map(([k, v]) => [k, Buffer.from(v, 'utf8')])),
  Object.fromEntries(Object.entries(__binary).map(([k, v]) => [k, Buffer.from(v, 'base64')])));

// ── серверные модули ──
const __sources = {
"src/assets.js": function (exports, require, module, __filename, __dirname) {
'use strict';

// Файлы Mini App: встроенные в собранный bot.js или с диска из public/ (режим разработки).

const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');

const embedded = globalThis.__lofiAssets || null;

function walk(dir, prefix = '', out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) walk(full, prefix + '/' + item.name, out);
    else out.push(prefix + '/' + item.name);
  }
  return out;
}

/** Список путей вида /js/main.js. */
const listAssets = () => embedded ? Object.keys(embedded) : walk(config.publicDir);

/** Содержимое файла или null. */
function readAsset(urlPath) {
  if (embedded) return embedded[urlPath] || null;
  const file = path.join(config.publicDir, ...urlPath.split('/').filter(Boolean));
  if (!file.startsWith(config.publicDir)) return null;
  try { return fs.readFileSync(file); } catch { return null; }
}

module.exports = { listAssets, readAsset, isEmbedded: !!embedded };
},

"src/audio-cache.js": function (exports, require, module, __filename, __dirname) {
'use strict';

// Дисковый кеш треков. Первый раз трек играет напрямую из CDN, параллельно сервер скачивает его
// целиком и дальше отдаёт со своего домена: мгновенный старт, перемотка, никаких истекающих ссылок.
//
// SoundCloud отдаёт в основном HLS (AAC во фрагментированном MP4), поэтому кеш хранит локальное
// HLS-зеркало: data/cache/audio/<id>/index.m3u8 + init + сегменты. Клиент играет его так же,
// как исходный поток. Если доступен прогрессивный MP3 — хранится один файл audio.mp3.

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const config = require('./config');
const { sql, now } = require('./db');
const { fetchRetry, formatBytes, plural } = require('./util');
const { SC, isMediaHost, isPlayable, fullTranscodings } = require('./soundcloud');

const dir = path.join(config.cacheDir, 'audio');
const MAX_TRACK_BYTES = 280 * 1024 * 1024;
const MAX_DURATION_MS = 3 * 3600e3;
const CONCURRENCY = 2;
const SEGMENT_PARALLEL = 6;

const enabled = () => config.audioCacheBytes > 0;
const jobs = new Map();
const waiting = [];
let active = 0;
const failures = new Map();
const lastTouch = new Map();
const stats = { hits: 0, misses: 0, downloads: 0, errors: 0 };

const trackDir = id => path.join(dir, String(id));
const SAFE_NAME = /^(?:index\.m3u8|init\.mp4|s\d{1,5}\.(?:m4s|ts|mp3|aac)|audio\.mp3)$/;

if (enabled()) {
  fs.mkdirSync(dir, { recursive: true });
  for (const name of fs.readdirSync(dir)) if (name.includes('.part')) fs.rmSync(path.join(dir, name), { recursive: true, force: true });
  for (const row of sql('SELECT track_id, file FROM audio_cache').all()) {
    if (!fs.existsSync(path.join(trackDir(row.track_id), row.file))) sql('DELETE FROM audio_cache WHERE track_id = ?').run(row.track_id);
  }
}

function lookup(id) {
  if (!enabled()) return null;
  const row = sql('SELECT * FROM audio_cache WHERE track_id = ?').get(String(id));
  if (!row) return null;
  if (!fs.existsSync(path.join(trackDir(row.track_id), row.file))) {
    sql('DELETE FROM audio_cache WHERE track_id = ?').run(row.track_id);
    return null;
  }
  return row;
}

/** Адрес для клиента и протокол воспроизведения. */
const sourceOf = row => ({
  source: `/api/stream/${row.track_id}/${row.file}`,
  protocol: row.file.endsWith('.m3u8') ? 'hls' : 'file',
});

/** Ставит трек в очередь на скачивание. Возвращает промис строки кеша либо null. */
function ensure(id, { priority = false } = {}) {
  id = String(id);
  if (!enabled() || !/^\d{1,15}$/.test(id)) return Promise.resolve(null);
  const row = lookup(id);
  if (row) return Promise.resolve(row);
  if (jobs.has(id)) {
    const job = jobs.get(id);
    if (priority && waiting.includes(job)) { waiting.splice(waiting.indexOf(job), 1); waiting.unshift(job); }
    return job.promise;
  }
  if ((failures.get(id) || 0) > Date.now()) return Promise.resolve(null);
  let resolve;
  const promise = new Promise(res => { resolve = res; });
  const job = { id, promise, resolve };
  jobs.set(id, job);
  if (priority) waiting.unshift(job); else waiting.push(job);
  while (waiting.length > 40) {
    const dropped = waiting.pop();
    jobs.delete(dropped.id);
    dropped.resolve(null);
  }
  pump();
  return promise;
}

function pump() {
  while (active < CONCURRENCY && waiting.length) {
    const job = waiting.shift();
    active++;
    download(job.id)
      .then(row => { stats.downloads++; job.resolve(row); })
      .catch(error => {
        stats.errors++;
        failures.set(job.id, Date.now() + 30 * 60e3);
        if (failures.size > 2000) failures.delete(failures.keys().next().value);
        if (!/недоступ|unsupported|длинн/i.test(error.message)) console.warn('Кеш трека', job.id + ':', error.message);
        job.resolve(null);
      })
      .finally(() => { active--; jobs.delete(job.id); pump(); });
  }
}

/** Порядок форматов: прогрессивный MP3 (один файл), затем HLS — сначала AAC лучшего качества. */
function cacheCandidates(track) {
  const rate = t => Number((t.preset || '').match(/(\d{2,3})k/)?.[1]) || 0;
  const score = t => {
    const mime = t.format.mime_type || '';
    if (t.format.protocol === 'progressive' && /mpeg/.test(mime)) return 1000;
    if (t.format.protocol === 'hls' && /mp4|aac/.test(mime)) return 500 + rate(t);
    if (t.format.protocol === 'hls' && /mpeg/.test(mime) && !/mpegurl/.test(mime)) return 400;
    return 0;
  };
  return fullTranscodings(track).filter(t => score(t) > 0).sort((a, b) => score(b) - score(a));
}

async function fetchMedia(url, timeout = 20000) {
  if (!isMediaHost(url)) throw Error('Недопустимый адрес медиа');
  const response = await fetchRetry(url, {}, 3, timeout);
  if (!response.ok) { await response.body?.cancel().catch(() => {}); throw Error('HTTP ' + response.status); }
  if (!isMediaHost(response.url)) { await response.body?.cancel().catch(() => {}); throw Error('Недопустимое перенаправление'); }
  return response;
}

async function writeProgressive(url, folder) {
  const response = await fetchMedia(url, 60000);
  const handle = await fsp.open(path.join(folder, 'audio.mp3'), 'w');
  let bytes = 0;
  try {
    for await (const chunk of response.body) {
      bytes += chunk.length;
      if (bytes > MAX_TRACK_BYTES) throw Error('Слишком длинный трек');
      await handle.write(chunk);
    }
  } finally { await handle.close(); }
  return { bytes, file: 'audio.mp3', mime: 'audio/mpeg' };
}

async function mirrorHls(url, folder, mime) {
  let playlistUrl = url;
  let text = await (await fetchMedia(playlistUrl)).text();
  if (/#EXT-X-STREAM-INF/.test(text)) {
    const variant = text.split(/\r?\n/).find(line => line && !line.startsWith('#'));
    if (!variant) throw Error('Пустой мастер-плейлист');
    playlistUrl = new URL(variant.trim(), playlistUrl).href;
    text = await (await fetchMedia(playlistUrl)).text();
  }
  if (/#EXT-X-KEY:(?![^\n]*METHOD=NONE)/.test(text)) throw Error('Поток зашифрован (unsupported)');
  if (!/#EXT-X-ENDLIST/.test(text) && !/#EXT-X-PLAYLIST-TYPE:VOD/.test(text)) throw Error('Не VOD-плейлист (unsupported)');
  const ext = /mp4|aac/.test(mime) ? 'm4s' : /mpeg/.test(mime) ? 'mp3' : 'ts';
  const downloads = [];
  const lines = text.split(/\r?\n/).map(line => {
    const map = line.match(/^#EXT-X-MAP:(.*)URI="([^"]+)"(.*)$/);
    if (map) { downloads.push({ url: new URL(map[2], playlistUrl).href, name: 'init.mp4' }); return `#EXT-X-MAP:${map[1]}URI="init.mp4"${map[3]}`; }
    if (!line.trim() || line.startsWith('#')) return line;
    const name = `s${downloads.filter(d => d.name !== 'init.mp4').length}.${ext}`;
    downloads.push({ url: new URL(line.trim(), playlistUrl).href, name });
    return name;
  });
  if (downloads.length < 2 || downloads.length > 4000) throw Error('Неожиданный плейлист');
  for (const d of downloads) if (!isMediaHost(d.url)) throw Error('Недопустимый адрес сегмента');

  let bytes = 0, next = 0;
  const worker = async () => {
    while (next < downloads.length) {
      const item = downloads[next++];
      const buffer = Buffer.from(await (await fetchMedia(item.url)).arrayBuffer());
      bytes += buffer.length;
      if (bytes > MAX_TRACK_BYTES) throw Error('Слишком длинный трек');
      await fsp.writeFile(path.join(folder, item.name), buffer);
    }
  };
  await Promise.all(Array.from({ length: SEGMENT_PARALLEL }, worker));
  await fsp.writeFile(path.join(folder, 'index.m3u8'), lines.join('\n'));
  return { bytes, file: 'index.m3u8', mime: 'application/vnd.apple.mpegurl' };
}

async function download(id) {
  const track = await SC.track(id);
  if (!isPlayable(track)) throw Error('Трек недоступен');
  if ((track.full_duration || track.duration || 0) > MAX_DURATION_MS) throw Error('Слишком длинный трек');
  const candidates = cacheCandidates(track);
  if (!candidates.length) throw Error('Нет подходящего формата (unsupported)');
  let lastError;
  for (const transcoding of candidates) {
    const tmp = path.join(dir, `${id}.part-${crypto.randomBytes(4).toString('hex')}`);
    try {
      await fsp.mkdir(tmp, { recursive: true });
      const url = await SC.streamUrl(transcoding, track);
      const result = transcoding.format.protocol === 'progressive'
        ? await writeProgressive(url, tmp)
        : await mirrorHls(url, tmp, transcoding.format.mime_type || '');
      if (result.bytes < 16 * 1024) throw Error('Слишком короткий файл');
      const target = trackDir(id);
      await fsp.rm(target, { recursive: true, force: true });
      await fsp.rename(tmp, target);
      const ts = now();
      sql(`INSERT INTO audio_cache VALUES (?, ?, ?, ?, ?, ?, 0)
           ON CONFLICT(track_id) DO UPDATE SET file = excluded.file, mime = excluded.mime, bytes = excluded.bytes, used_at = excluded.used_at`)
        .run(String(id), result.file, result.mime, result.bytes, ts, ts);
      evict();
      return lookup(id);
    } catch (error) {
      lastError = error;
      await fsp.rm(tmp, { recursive: true, force: true }).catch(() => {});
    }
  }
  throw lastError || Error('Не удалось скачать трек');
}

function totals() {
  const row = sql('SELECT COUNT(*) AS files, COALESCE(SUM(bytes), 0) AS bytes, COALESCE(SUM(hits), 0) AS hits FROM audio_cache').get();
  return { files: row.files, bytes: row.bytes, hits: row.hits };
}

function remove(id) {
  fs.rmSync(trackDir(id), { recursive: true, force: true });
  sql('DELETE FROM audio_cache WHERE track_id = ?').run(String(id));
}

function evict() {
  let { bytes } = totals();
  if (bytes <= config.audioCacheBytes) return;
  for (const row of sql('SELECT track_id, bytes FROM audio_cache ORDER BY used_at ASC LIMIT 500').all()) {
    if (bytes <= config.audioCacheBytes * 0.9) break;
    remove(row.track_id);
    bytes -= row.bytes;
  }
}

function clear() {
  for (const row of sql('SELECT track_id FROM audio_cache').all()) remove(row.track_id);
  failures.clear();
}

function touch(row) {
  const last = lastTouch.get(row.track_id) || 0;
  if (Date.now() - last < 60e3) return;
  lastTouch.set(row.track_id, Date.now());
  if (lastTouch.size > 5000) lastTouch.delete(lastTouch.keys().next().value);
  sql('UPDATE audio_cache SET used_at = ?, hits = hits + 1 WHERE track_id = ?').run(now(), row.track_id);
}

const MIME = { m3u8: 'application/vnd.apple.mpegurl', mp4: 'audio/mp4', m4s: 'audio/mp4', ts: 'video/mp2t', mp3: 'audio/mpeg', aac: 'audio/aac' };

/** Отдаёт файл трека из кеша (плейлист, сегмент или целый файл) с поддержкой Range. */
function serve(req, res, id, name) {
  if (!SAFE_NAME.test(name)) return false;
  const row = lookup(id);
  if (!row) return false;
  const file = path.join(trackDir(id), name);
  let size;
  try { size = fs.statSync(file).size; } catch { return false; }
  if (name === row.file) { stats.hits++; touch(row); }
  const headers = {
    'content-type': MIME[name.split('.').pop()] || 'application/octet-stream', 'accept-ranges': 'bytes',
    'cache-control': 'private, max-age=604800, immutable', etag: `"${id}-${name}-${size}"`,
  };
  if (req.headers['if-none-match'] === headers.etag) { res.writeHead(304, headers); res.end(); return true; }
  let start = 0, end = size - 1, status = 200;
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (range && (range[1] || range[2])) {
    if (range[1]) { start = Number(range[1]); if (range[2]) end = Math.min(size - 1, Number(range[2])); }
    else start = Math.max(0, size - Number(range[2]));
    if (start > end || start >= size) {
      res.writeHead(416, { 'content-range': `bytes */${size}` });
      res.end();
      return true;
    }
    status = 206;
    headers['content-range'] = `bytes ${start}-${end}/${size}`;
  }
  headers['content-length'] = end - start + 1;
  res.writeHead(status, headers);
  if (req.method === 'HEAD') { res.end(); return true; }
  const stream = fs.createReadStream(file, { start, end });
  stream.on('error', () => res.destroy());
  res.on('close', () => stream.destroy());
  stream.pipe(res);
  return true;
}

function summary() {
  const t = totals();
  return { ...t, limit: config.audioCacheBytes, queue: waiting.length, active, ...stats,
    text: `${t.files} ${plural(t.files, 'трек', 'трека', 'треков')} · ${formatBytes(t.bytes)} из ${formatBytes(config.audioCacheBytes)}` };
}

module.exports = { enabled, lookup, ensure, serve, sourceOf, clear, summary, missed: () => { stats.misses++; } };
},

"src/catalog.js": function (exports, require, module, __filename, __dirname) {
'use strict';

// Высокоуровневые выборки каталога для API: поиск, альбомы, артисты, подборки и поток.

const { LRU, memo, normQ, httpError } = require('./util');
const {
  SC, soundcloudUrl, isMediaHost, meta, fullTranscodings, isPlayable, trackView, albumView, playables, cache, artUrl,
} = require('./soundcloud');

const MOODS = Object.freeze([
  { id: 'focus', name: 'В потоке', note: 'Для концентрации', query: 'jazz lofi beats' },
  { id: 'rain', name: 'За окном дождь', note: 'Спокойный фон', query: 'rain lofi beats' },
  { id: 'night', name: 'Поздняя ночь', note: 'Тихий вечер', query: 'late night chillhop' },
  { id: 'drive', name: 'В дороге', note: 'Ровный темп', query: 'night drive synthwave' },
  { id: 'energy', name: 'Заряд', note: 'Для движения', query: 'energetic workout beats' },
  { id: 'sleep', name: 'Перед сном', note: 'Медленно и мягко', query: 'ambient sleep piano' },
]);

const GENRES = Object.freeze([
  { name: 'Lo-fi', query: 'lofi hip hop' }, { name: 'Рэп', query: 'русский рэп' }, { name: 'Фонк', query: 'phonk' },
  { name: 'Инди', query: 'indie' }, { name: 'Джаз', query: 'jazz' }, { name: 'Эмбиент', query: 'ambient' },
  { name: 'Хаус', query: 'deep house' }, { name: 'Поп', query: 'pop' },
]);

const PAGE = 12;

async function listTracks(q, kind, page, originals) {
  const url = soundcloudUrl(q);
  if (url) {
    const found = await SC.resolve(url.href);
    if (found?.kind === 'track' && isPlayable(found)) {
      cache.track.set(found.id, Promise.resolve(found));
      return { items: [trackView(found)], label: meta(found).title, kind: 't', more: false };
    }
    if (found?.kind === 'playlist') return albumTracks(found.id, page);
    if (found?.kind === 'user') {
      return { items: playables(await SC.userTracks(found.id), originals), label: found.username, kind: 't', more: false, artist: userView(found) };
    }
    return { items: [], kind: 't', more: false };
  }
  if (/^https?:\/\//i.test(q)) throw httpError(400, 'Вставьте ссылку на трек, альбом или артиста SoundCloud');
  if (kind === 'u') {
    const result = await SC.api('/search/users', { q, limit: PAGE + 1, offset: page * PAGE });
    const users = Array.isArray(result) ? result : result.collection || [];
    return { kind: 'u', more: users.length > PAGE, items: users.slice(0, PAGE).map(userView) };
  }
  const result = await SC.searchList(kind, q, (page + 1) * PAGE + 1, originals);
  const items = result.items.slice(page * PAGE, page * PAGE + PAGE).map(kind === 'a' ? albumView : trackView);
  return { items, kind, more: result.items.length > (page + 1) * PAGE, hidden: result.hidden };
}

function userView(user) {
  return {
    id: String(user.id), title: user.username || 'Артист',
    artwork: artUrl({ artwork_url: user.avatar_url }, 't500x500'),
    followers: user.followers_count || 0, verified: !!(user.verified || user.badges?.verified),
  };
}

async function albumTracks(id, page = 0) {
  const album = await SC.playlist(id);
  const start = page * 50;
  const all = album.tracks || [];
  const tracks = await SC.tracks(all.slice(start, start + 50));
  const items = tracks.map((t, i) => t.title ? trackView(t) : {
    id: String(t.id), title: 'Дорожка ' + (start + i + 1), artist: album.user?.username || '', available: false, dur: 0,
  });
  return { items, label: album.title, album: albumView(album), kind: 't', more: start + 50 < all.length };
}

async function artistView(name, id) {
  if (id) {
    const [user, tracks] = await Promise.all([SC.user(id), SC.userTracks(id)]);
    const view = userView(user);
    return { label: user.username, portrait: view.artwork, followers: view.followers, verified: view.verified,
      bio: String(user.description || '').slice(0, 900), items: tracks.map(trackView) };
  }
  const result = await SC.searchList('t', name, 60, false);
  const items = result.items.map(trackView).filter(t => normQ(t.artist) === normQ(name)
    || t.artist.split(/,\s+|\s+&\s+|\s+(?:feat\.?|ft\.?|x)\s+/i).some(a => normQ(a) === normQ(name)));
  return { label: name, items, portrait: items.find(t => t.avatar)?.avatar || items[0]?.artwork || '' };
}

async function moodView(id, page = 0) {
  const mood = MOODS.find(item => item.id === id);
  if (!mood) throw httpError(404, 'Подборка не найдена');
  const data = await listTracks(mood.query, 't', page, false);
  return { ...data, label: mood.name, note: mood.note };
}

const shelfCache = new LRU(8, 20 * 60e3);
const home = () => memo(shelfCache, 'home', async () => {
  const result = await SC.searchList('t', 'chillhop music', 13, false);
  return { items: result.items.slice(0, 12).map(trackView) };
});
const releases = () => memo(shelfCache, 'releases', async () => {
  const result = await SC.searchList('a', 'chillhop essentials', 10, false);
  return { items: result.items.slice(0, 10).map(albumView) };
});

// ── выбор потока ──
const bitrateOf = t => Number((t.preset || '').match(/(?:^|[_-])(64|96|128|160|192|256|320|1411)k?(?=[_-]|$)/)?.[1]) || (/mp3/.test(t.preset || '') ? 128 : 0);

function candidates(track, max) {
  const rank = t => bitrateOf(t) > max ? -bitrateOf(t) : bitrateOf(t);
  return fullTranscodings(track)
    .filter(t => ['progressive', 'hls'].includes(t.format.protocol) && /mpeg|mp4|aac|flac/i.test(t.format.mime_type || ''))
    .sort((a, b) => rank(b) - rank(a) || Number(b.format.protocol === 'progressive') - Number(a.format.protocol === 'progressive'));
}

const streamCache = new LRU(600, 120e3);
function playback(id, quality = 'high') {
  const max = quality === 'normal' ? 128 : 320;
  return memo(streamCache, id + ':' + max, async () => {
    const track = await SC.track(id);
    if (!isPlayable(track)) throw httpError(404, 'Этот трек недоступен для воспроизведения');
    const view = trackView(track);
    for (const transcoding of candidates(track, max)) {
      try {
        const url = new URL(await SC.streamUrl(transcoding, track));
        if (isMediaHost(url)) return { track: view, source: url.href, bitrate: bitrateOf(transcoding) || null, protocol: transcoding.format.protocol };
      } catch { /* следующий формат, затем виджет */ }
    }
    if (!view.url) throw httpError(404, 'Каталог не вернул доступный поток');
    return { track: view, source: '', protocol: 'widget' };
  });
}

module.exports = { MOODS, GENRES, listTracks, albumTracks, artistView, moodView, home, releases, playback, candidates, bitrateOf };
},

"src/config.js": function (exports, require, module, __filename, __dirname) {
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const ROOT = path.resolve(__dirname, '..');

try { process.loadEnvFile(path.join(ROOT, '.env')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) http.setGlobalProxyFromEnv?.();

const env = (key, fallback = '') => String(process.env[key] ?? fallback).trim();
const int = (key, fallback, min, max) => {
  const value = Number(env(key, String(fallback)));
  if (!Number.isInteger(value) || value < min || value > max) throw Error(`${key} должен быть целым числом ${min}–${max}`);
  return value;
};

const appUrl = env('APP_URL').replace(/\/+$/, '');
if (appUrl) {
  const url = new URL(appUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) {
    throw Error('APP_URL должен быть корневым публичным HTTPS-адресом, например https://lofi.example.com');
  }
}

const dataDir = path.resolve(ROOT, env('DATA_DIR', 'data'));
const dbPath = path.resolve(ROOT, env('DB_PATH', path.join(path.relative(ROOT, dataDir) || 'data', 'lofi.sqlite3')));
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const config = Object.freeze({
  root: ROOT,
  publicDir: path.join(ROOT, 'public'),
  dataDir,
  dbPath,
  cacheDir: path.resolve(ROOT, env('CACHE_DIR', path.join(path.relative(ROOT, dataDir) || 'data', 'cache'))),
  token: env('BOT_TOKEN'),
  appUrl,
  port: int('PORT', 8080, 1, 65535),
  host: env('HOST', '0.0.0.0'),
  /** Владельцы из окружения. Дополнительных администраторов можно добавить в панели. */
  owners: new Set(env('ADMIN_IDS').split(/[\s,]+/).filter(id => /^\d+$/.test(id))),
  originalsByDefault: env('ORIGINALS_ONLY', '1') !== '0',
  scClientId: env('SC_CLIENT_ID'),
  audioCacheBytes: int('AUDIO_CACHE_MB', 1024, 0, 1024 * 1024) * 1024 * 1024,
  /** Часовой пояс админ-панели в минутах от UTC (по умолчанию Москва). */
  tzOffset: int('TZ_OFFSET', 180, -720, 840),
  version: '2.0.0',
  userAgent: 'Lo-fi/2.0 (' + (appUrl || 'local preview') + ')',
});

module.exports = config;
},

"src/db.js": function (exports, require, module, __filename, __dirname) {
'use strict';

const { DatabaseSync } = require('node:sqlite');
const config = require('./config');

const db = new DatabaseSync(config.dbPath);
db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS preferences (uid TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS library (
  uid TEXT NOT NULL, kind TEXT NOT NULL, track_id TEXT NOT NULL, track TEXT NOT NULL, ts INTEGER NOT NULL,
  PRIMARY KEY (uid, kind, track_id));
CREATE INDEX IF NOT EXISTS library_order ON library(uid, kind, ts DESC);
CREATE TABLE IF NOT EXISTS lyrics (track_id TEXT PRIMARY KEY, lrc TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS lyrics_cache (track_id TEXT PRIMARY KEY, data TEXT NOT NULL, ts INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, first_name TEXT NOT NULL DEFAULT '', last_name TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL DEFAULT '', lang TEXT NOT NULL DEFAULT '', premium INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL, bot_seen_at INTEGER, app_seen_at INTEGER, started INTEGER NOT NULL DEFAULT 0,
  blocked INTEGER NOT NULL DEFAULT 0, banned INTEGER NOT NULL DEFAULT 0, source TEXT NOT NULL DEFAULT '');
CREATE INDEX IF NOT EXISTS users_bot_seen ON users(bot_seen_at);
CREATE INDEX IF NOT EXISTS users_app_seen ON users(app_seen_at);
CREATE INDEX IF NOT EXISTS users_username ON users(username COLLATE NOCASE);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY, uid TEXT, track_id TEXT NOT NULL, kind TEXT NOT NULL, source TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '', artist TEXT NOT NULL DEFAULT '', ts INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS events_ts ON events(ts);
CREATE INDEX IF NOT EXISTS events_kind_ts ON events(kind, ts);
CREATE TABLE IF NOT EXISTS audio_cache (
  track_id TEXT PRIMARY KEY, file TEXT NOT NULL, mime TEXT NOT NULL, bytes INTEGER NOT NULL,
  created_at INTEGER NOT NULL, used_at INTEGER NOT NULL, hits INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS audio_cache_used ON audio_cache(used_at);
CREATE TABLE IF NOT EXISTS admins (id TEXT PRIMARY KEY, added_by TEXT NOT NULL, added_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS broadcasts (
  id INTEGER PRIMARY KEY, admin_id TEXT NOT NULL, source_chat TEXT NOT NULL, source_message INTEGER NOT NULL,
  options TEXT NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'draft', scheduled_at INTEGER,
  created_at INTEGER NOT NULL, started_at INTEGER, finished_at INTEGER, total INTEGER NOT NULL DEFAULT 0,
  sent INTEGER NOT NULL DEFAULT 0, failed INTEGER NOT NULL DEFAULT 0, blocked INTEGER NOT NULL DEFAULT 0,
  cursor TEXT NOT NULL DEFAULT '', status_chat TEXT, status_message INTEGER);
CREATE TABLE IF NOT EXISTS broadcast_messages (
  broadcast_id INTEGER NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE, chat_id TEXT NOT NULL,
  message_id INTEGER NOT NULL, PRIMARY KEY (broadcast_id, chat_id));
`);

const statements = new Map();
/** Подготовленный запрос с кешированием. */
const sql = text => {
  let statement = statements.get(text);
  if (!statement) statements.set(text, statement = db.prepare(text));
  return statement;
};

function tx(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

const getSetting = (key, fallback = '') => sql('SELECT value FROM settings WHERE key = ?').get(key)?.value ?? fallback;
const setSetting = (key, value) => sql('INSERT INTO settings VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value));
const deleteSetting = key => sql('DELETE FROM settings WHERE key = ?').run(key);
function getJson(key, fallback) {
  try { const raw = getSetting(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
const setJson = (key, value) => setSetting(key, JSON.stringify(value));

const now = () => Date.now();

// ── пользователи ──
function touchUser(user, { via = 'bot', started = false, source = '' } = {}) {
  if (!user?.id || user.is_bot) return;
  const id = String(user.id), ts = now();
  sql(`INSERT INTO users (id, first_name, last_name, username, lang, premium, created_at, bot_seen_at, app_seen_at, started, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET first_name = excluded.first_name, last_name = excluded.last_name,
         username = excluded.username, lang = CASE WHEN excluded.lang != '' THEN excluded.lang ELSE users.lang END,
         premium = excluded.premium,
         bot_seen_at = COALESCE(excluded.bot_seen_at, users.bot_seen_at),
         app_seen_at = COALESCE(excluded.app_seen_at, users.app_seen_at),
         started = MAX(users.started, excluded.started),
         blocked = CASE WHEN excluded.bot_seen_at IS NOT NULL THEN 0 ELSE users.blocked END`)
    .run(id, String(user.first_name || '').slice(0, 128), String(user.last_name || '').slice(0, 128),
      String(user.username || '').slice(0, 64), String(user.language_code || '').slice(0, 12), user.is_premium ? 1 : 0,
      ts, via === 'bot' ? ts : null, via === 'app' ? ts : null, started ? 1 : 0, String(source).slice(0, 64));
}
const getUser = id => sql('SELECT * FROM users WHERE id = ?').get(String(id));
const setBlocked = (id, blocked) => sql('UPDATE users SET blocked = ? WHERE id = ?').run(blocked ? 1 : 0, String(id));
const setBanned = (id, banned) => sql('UPDATE users SET banned = ? WHERE id = ?').run(banned ? 1 : 0, String(id));
const isBanned = id => !!sql('SELECT banned FROM users WHERE id = ?').get(String(id))?.banned;

// ── администраторы ──
const isOwner = id => config.owners.has(String(id));
const isAdmin = id => isOwner(id) || !!sql('SELECT 1 AS x FROM admins WHERE id = ?').get(String(id));
const listAdmins = () => sql('SELECT * FROM admins ORDER BY added_at').all();
const addAdmin = (id, by) => sql('INSERT OR IGNORE INTO admins VALUES (?, ?, ?)').run(String(id), String(by), now());
const removeAdmin = id => sql('DELETE FROM admins WHERE id = ?').run(String(id));

// ── медиатека ──
const LIBRARY_LIMITS = { favorite: 1000, dislike: 1000, recent: 100 };
function library(uid, kind, count = LIBRARY_LIMITS[kind]) {
  return sql('SELECT track FROM library WHERE uid = ? AND kind = ? ORDER BY ts DESC LIMIT ?').all(uid, kind, count)
    .map(row => { try { return JSON.parse(row.track); } catch { return null; } }).filter(Boolean);
}
function libraryPut(uid, kind, track) {
  tx(() => {
    sql('INSERT INTO library VALUES (?, ?, ?, ?, ?) ON CONFLICT(uid, kind, track_id) DO UPDATE SET track = excluded.track, ts = excluded.ts')
      .run(uid, kind, String(track.id), JSON.stringify(track), now());
    sql('DELETE FROM library WHERE uid = ? AND kind = ? AND track_id IN (SELECT track_id FROM library WHERE uid = ? AND kind = ? ORDER BY ts DESC LIMIT -1 OFFSET ?)')
      .run(uid, kind, uid, kind, LIBRARY_LIMITS[kind]);
  });
}
const libraryRemove = (uid, kind, id) => sql('DELETE FROM library WHERE uid = ? AND kind = ? AND track_id = ?').run(uid, kind, String(id));
const libraryClear = (uid, kind) => sql('DELETE FROM library WHERE uid = ? AND kind = ?').run(uid, kind);

// ── события прослушивания (для статистики и «Моей волны») ──
function logEvent(uid, track, kind, source = '') {
  sql('INSERT INTO events (uid, track_id, kind, source, title, artist, ts) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(uid || null, String(track.id), kind, String(source).slice(0, 24), String(track.title || '').slice(0, 200), String(track.artist || '').slice(0, 200), now());
}

// Миграция настроек стартового сообщения из версии 1.
(function migrateStartCard() {
  if (getSetting('start_config')) return;
  const caption = getSetting('start_caption'), photo = getSetting('start_photo'), button = getSetting('start_button'), emoji = getSetting('start_emoji');
  if (!caption && !photo && !button && !emoji) return;
  const card = {};
  if (caption) card.text = caption;
  if (photo) card.media = { type: 'photo', file_id: photo };
  card.buttons = [[{ text: button || 'Открыть Lo-fi', kind: 'app', page: 'home', ...(/^\d+$/.test(emoji) ? { emoji } : {}) }]];
  setJson('start_config', card);
})();

function housekeeping() {
  const cutoff = now() - 120 * 864e5;
  sql('DELETE FROM events WHERE ts < ?').run(cutoff);
  sql('DELETE FROM lyrics_cache WHERE ts < ?').run(now() - 30 * 864e5);
  sql("DELETE FROM broadcast_messages WHERE broadcast_id IN (SELECT id FROM broadcasts WHERE finished_at < ?)").run(now() - 7 * 864e5);
}

module.exports = {
  db, sql, tx, now, getSetting, setSetting, deleteSetting, getJson, setJson,
  touchUser, getUser, setBlocked, setBanned, isBanned,
  isOwner, isAdmin, listAdmins, addAdmin, removeAdmin,
  library, libraryPut, libraryRemove, libraryClear, LIBRARY_LIMITS, logEvent, housekeeping,
};
},

"src/lyrics.js": function (exports, require, module, __filename, __dirname) {
'use strict';

// Тексты песен: свои LRC администратора, LRC из описания трека, LRCLIB, NetEase и lyrics.ovh.
// Поддерживается расширенный LRC с таймкодами слов <mm:ss.xx>.

const { LRU, memo, normQ, fetchRetry, statusError } = require('./util');
const { sql, now } = require('./db');
const { SC, trackView, plainText } = require('./soundcloud');

const TIME = String.raw`(\d{1,3}):([0-5]?\d)(?:[.:](\d{1,3}))?`;
const LINE_MARK = new RegExp(String.raw`\[${TIME}\]`, 'g');
const WORD_MARK = new RegExp(String.raw`<${TIME}>`, 'g');
const CREDIT_RE = /^\s*(?:作词|作曲|编曲|制作人|混音|母带|词|曲|lyrics?\s+by|written\s+by|composed\s+by)\s*[:：]/i;

const toMs = (min, sec, frac = '') => (Number(min) * 60 + Number(sec)) * 1000 + Number(String(frac).padEnd(3, '0').slice(0, 3) || 0);

function parseLrc(raw) {
  const text = String(raw || '').slice(0, 200000);
  const offset = Number(text.match(/\[offset:\s*([+-]?\d+)\]/i)?.[1] || 0);
  const lines = [];
  for (const source of text.split(/\r?\n/)) {
    const marks = [...source.matchAll(LINE_MARK)];
    if (!marks.length || marks[0].index > 2) continue;
    const last = marks.at(-1);
    const body = source.slice(last.index + last[0].length);
    const wordMarks = [...body.matchAll(WORD_MARK)];
    const clean = body.replace(WORD_MARK, '').replace(/\s+/g, ' ').trim();
    if (CREDIT_RE.test(clean)) continue;
    let words = null;
    if (wordMarks.length >= 2 && marks.length === 1) {
      words = [];
      const lead = body.slice(0, wordMarks[0].index).replace(/\s+/g, ' ');
      if (lead.trim()) words.push({ time: Math.max(0, toMs(marks[0][1], marks[0][2], marks[0][3]) + offset), text: lead });
      wordMarks.forEach((mark, i) => {
        const end = i + 1 < wordMarks.length ? wordMarks[i + 1].index : body.length;
        const piece = body.slice(mark.index + mark[0].length, end).replace(/\s+/g, ' ');
        if (piece.trim()) words.push({ time: Math.max(0, toMs(mark[1], mark[2], mark[3]) + offset), text: piece });
      });
      if (words.length < 1) words = null;
    }
    for (const mark of marks) {
      const line = { time: Math.max(0, toMs(mark[1], mark[2], mark[3]) + offset), text: clean };
      if (words) line.words = words;
      lines.push(line);
    }
  }
  lines.sort((a, b) => a.time - b.time);
  const unique = lines.filter((line, i) => !i || line.time !== lines[i - 1].time || line.text !== lines[i - 1].text);
  while (unique.length && !unique[0].text && unique.length > 1 && !unique[1].text) unique.shift();
  return unique.slice(0, 800);
}

function result(timed, plain, source) {
  const lines = parseLrc(timed);
  if (lines.filter(l => l.text).length >= 2) return { type: 'synced', lines, words: lines.some(l => l.words), source };
  const text = String(plain || '').replace(/\r/g, '').trim();
  if (text) return { type: 'plain', lines: text.split('\n').map(s => s.trim()).slice(0, 600), source };
  return null;
}

// ── сопоставление названий ──
const key = value => normQ(plainText(value)).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const NOISE_RE = /\s*[([](?:feat|ft|prod|with|official|audio|video|lyrics?|lyric\s+video|explicit|clean|remaster(?:ed)?|hq|cdq|visuali[sz]er|mv|clip|клип|премьера|prem)[^)\]]*[)\]]/gi;
function cleanTitle(title) {
  return plainText(title).replace(NOISE_RE, '')
    .replace(/\s+(?:feat|ft)\.?\s+.+$/i, '').replace(/\s+prod\.?\s+(?:by\s+)?.+$/i, '')
    .replace(/["«»“”]/g, '').replace(/\s+/g, ' ').trim();
}
const primaryArtist = artist => plainText(artist).split(/\s*(?:,|&|\+|\/|\sx\s|\sfeat\.?\s|\sft\.?\s|\sи\s|\sand\s)\s*/i)[0].trim();
function similar(a, b) {
  const x = key(a), y = key(b);
  if (!x || !y) return false;
  return x === y || (Math.min(x.length, y.length) >= 3 && (x.includes(y) || y.includes(x)));
}

async function getJson(url, params = {}) {
  const target = new URL(url);
  for (const [k, v] of Object.entries(params)) if (v !== '' && v !== undefined) target.searchParams.set(k, v);
  const response = await fetchRetry(target, { headers: { accept: 'application/json' } }, 1, 5000);
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    if (response.status === 404) return null;
    throw statusError(response);
  }
  return response.json();
}

async function fromLrclib(track) {
  const title = cleanTitle(track.title), artist = primaryArtist(track.artist);
  const variants = [[track.artist, track.title], [artist, title]].filter((v, i, all) => all.findIndex(x => x[0] === v[0] && x[1] === v[1]) === i);
  // Точные запросы и поиск идут параллельно: ответ за один сетевой круг.
  const [exact, found] = await Promise.all([
    Promise.all(variants.map(([a, t]) => getJson('https://lrclib.net/api/get', { artist_name: a, track_name: t, duration: track.dur || '' }).catch(() => null))),
    getJson('https://lrclib.net/api/search', { q: `${artist} ${title}` }).catch(() => null),
  ]);
  for (const item of exact) {
    if (item?.syncedLyrics) return result(item.syncedLyrics, item.plainLyrics, 'LRCLIB');
    if (item?.instrumental) return { type: 'instrumental', source: 'LRCLIB' };
  }
  const hits = found || [];
  const matches = hits.filter(h => similar(h.trackName, title) && (similar(h.artistName, artist) || similar(h.artistName, track.artist))
    && (!track.dur || Math.abs(h.duration - track.dur) <= 6))
    .sort((a, b) => Number(!!b.syncedLyrics) - Number(!!a.syncedLyrics) || Math.abs(a.duration - track.dur) - Math.abs(b.duration - track.dur));
  const best = matches[0];
  if (!best) return null;
  if (best.instrumental) return { type: 'instrumental', source: 'LRCLIB' };
  return result(best.syncedLyrics, best.plainLyrics, 'LRCLIB');
}

async function fromNetEase(track) {
  const title = cleanTitle(track.title), artist = primaryArtist(track.artist);
  const found = await getJson('https://music.163.com/api/search/get', { s: `${artist} ${title}`, type: 1, limit: 12 });
  const hit = found?.result?.songs?.find(song => similar(song.name, title)
    && song.artists?.some(a => similar(a.name, artist)) && (!track.dur || Math.abs(song.duration / 1000 - track.dur) <= 5));
  if (!hit) return null;
  const record = await getJson('https://music.163.com/api/song/lyric', { id: hit.id, lv: 1, kv: 1 });
  return result(record?.lrc?.lyric, null, 'NetEase');
}

async function fromOvh(track) {
  const data = await getJson('https://api.lyrics.ovh/v1/' + encodeURIComponent(primaryArtist(track.artist)) + '/' + encodeURIComponent(cleanTitle(track.title)));
  return result(null, data?.lyrics, 'lyrics.ovh');
}

const memory = new LRU(600, 30 * 60e3);

function readStored(id) {
  const row = sql('SELECT data, ts FROM lyrics_cache WHERE track_id = ?').get(id);
  if (!row) return null;
  try {
    const data = JSON.parse(row.data);
    const ttl = data.type === 'none' ? 3 * 864e5 : 30 * 864e5;
    return now() - row.ts < ttl ? data : null;
  } catch { return null; }
}
const store = (id, data) => sql('INSERT INTO lyrics_cache VALUES (?, ?, ?) ON CONFLICT(track_id) DO UPDATE SET data = excluded.data, ts = excluded.ts')
  .run(id, JSON.stringify(data), now());

/**
 * Описание трека часто содержит трек-лист микса («[00:02:50] Артист - Трек») — это не текст песни.
 * Принимаем таймкоды из описания, только если они похожи на настоящий LRC.
 */
function looksLikeLyrics(lines, durationSec) {
  const text = lines.filter(l => l.text);
  if (text.length < 4 || durationSec > 15 * 60) return false;
  const pairs = text.filter(l => /\S\s+[-–—]\s+\S/.test(l.text)).length;
  if (pairs / text.length > .35) return false;
  const span = text.at(-1).time - text[0].time;
  if (span / (text.length - 1) > 30000) return false;
  if (durationSec && (span < durationSec * 1000 * .3 || text.at(-1).time > durationSec * 1000 + 10000)) return false;
  return true;
}

async function lookup(id) {
  const raw = await SC.track(id);
  const embedded = result(raw.description, null, 'Описание трека');
  if (embedded?.type === 'synced' && looksLikeLyrics(embedded.lines, Math.round((raw.full_duration || raw.duration || 0) / 1000))) return embedded;
  const track = trackView(raw);
  const lrclib = fromLrclib(track).then(value => ({ status: 'fulfilled', value }), reason => ({ status: 'rejected', reason }));
  const netease = fromNetEase(track).then(value => ({ status: 'fulfilled', value }), reason => ({ status: 'rejected', reason }));
  const first = await lrclib;
  // Синхронный текст из LRCLIB — лучший результат, NetEase не ждём. Иначе даём ему не больше 2,5 с.
  if (first.value?.type === 'synced') return first.value;
  const second = await Promise.race([netease, new Promise(resolve => setTimeout(() => resolve({ status: 'rejected', reason: Error('timeout') }), 2500))]);
  const settled = [first, second];
  const records = settled.map(s => s.value).filter(Boolean);
  const best = records.find(r => r.type === 'synced' && r.words) || records.find(r => r.type === 'synced') || records.find(r => r.type === 'instrumental') || records[0];
  if (best) return best;
  const plain = await fromOvh(track).catch(error => { if (settled.every(s => s.status === 'rejected')) throw error; return null; });
  return plain || { type: 'none' };
}

function getLyrics(id) {
  id = String(id);
  const override = sql('SELECT lrc FROM lyrics WHERE track_id = ?').get(id);
  if (override) {
    const parsed = result(override.lrc, null, 'Lo-fi');
    if (parsed) return Promise.resolve(parsed);
  }
  return memo(memory, id, async () => {
    const stored = readStored(id);
    if (stored) return stored;
    const data = await lookup(id);
    store(id, data);
    return data;
  });
}

function setOverride(id, lrc) {
  sql('INSERT INTO lyrics VALUES (?, ?) ON CONFLICT(track_id) DO UPDATE SET lrc = excluded.lrc').run(String(id), lrc);
  memory.delete(String(id));
}
function removeOverride(id) {
  sql('DELETE FROM lyrics WHERE track_id = ?').run(String(id));
  sql('DELETE FROM lyrics_cache WHERE track_id = ?').run(String(id));
  memory.delete(String(id));
}
function clearCache() {
  sql('DELETE FROM lyrics_cache').run();
  memory.clear();
}
const overrideCount = () => sql('SELECT COUNT(*) AS n FROM lyrics').get().n;

module.exports = { parseLrc, looksLikeLyrics, getLyrics, setOverride, removeOverride, clearCache, overrideCount };
},

"src/main.js": function (exports, require, module, __filename, __dirname) {
'use strict';

const fs = require('node:fs');
const config = require('./config');
const db = require('./db');
const { createServer, reloadPublic } = require('./server');
const { runBot, stopBot } = require('./telegram/bot');

function main() {
  if (process.argv.includes('--init-db')) {
    db.db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    db.db.close();
    return;
  }
  db.housekeeping();
  setInterval(() => { try { db.housekeeping(); } catch (error) { console.warn('Обслуживание БД:', error.message); } }, 6 * 3600e3).unref();

  const server = createServer();
  server.listen(config.port, config.host, () => {
    console.info(`Lo-fi ${config.version}: http://localhost:${config.port}`);
    if (config.token && config.appUrl) void runBot();
    else if (config.token) console.info('Бот не запущен: задайте APP_URL (публичный HTTPS-адрес Mini App).');
    else console.info('Режим браузера: задайте BOT_TOKEN и APP_URL, чтобы запустить Telegram-бота.');
  });

  if (process.argv.includes('--dev') && !require('./assets').isEmbedded) {
    let timer;
    fs.watch(config.publicDir, { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => { try { reloadPublic(); console.info('public/ перечитан'); } catch {} }, 120);
    });
  }

  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => {
    stopBot();
    server.close(() => { db.db.close(); process.exit(0); });
    setTimeout(() => process.exit(0), 2500).unref();
  });
}

module.exports = { main };

// Разработка: node src/main.js --dev (читает public/ с диска и перечитывает при изменениях).
if (require.main === module) main();
},

"src/prefs.js": function (exports, require, module, __filename, __dirname) {
'use strict';

// Единая схема настроек. Клиент получает её как ES-модуль /js/schema.js,
// сервер проверяет по ней всё, что приходит от клиента.

const config = require('./config');

const CHOICES = Object.freeze({
  theme: ['system', 'dark', 'light'],
  quality: ['high', 'normal'],
  // Первое значение в списке — значение по умолчанию.
  lyricSize: ['m', 's', 'l', 'xl'],
  playerBg: ['cover', 'wave', 'plain'],
  motion: ['full', 'reduced'],
  textScale: ['m', 's', 'l'],
  waveMood: ['any', 'calm', 'energetic', 'happy', 'sad'],
  waveActivity: ['any', 'wake', 'work', 'workout', 'sleep', 'drive'],
  waveCharacter: ['default', 'favorite', 'discover', 'popular'],
});

const FLAGS = Object.freeze({
  glass: true, dynamicColor: true, autoplay: true, gapless: true, crossfade: false, normalize: false,
  originals: config.originalsByDefault, lyricBlur: true, lyricFollow: true, canvas: true, visualizer: true, haptics: true,
});

const RANGES = Object.freeze({
  volume: [0, 100, 80],
  crossfadeSec: [2, 12, 6],
  lyricOffset: [-5000, 5000, 0],
});

const TASTE = ['often', 'normal', 'rare', 'never'];

const DEFAULTS = Object.freeze({
  ...Object.fromEntries(Object.entries(CHOICES).map(([key, values]) => [key, values[0]])),
  ...FLAGS,
  ...Object.fromEntries(Object.entries(RANGES).map(([key, [, , value]]) => [key, value])),
  taste: {},
});

function cleanPrefs(value) {
  const prefs = { ...DEFAULTS, taste: {} };
  if (!value || typeof value !== 'object') return prefs;
  for (const [key, values] of Object.entries(CHOICES)) if (values.includes(value[key])) prefs[key] = value[key];
  for (const key of Object.keys(FLAGS)) if (typeof value[key] === 'boolean') prefs[key] = value[key];
  for (const [key, [min, max]] of Object.entries(RANGES)) {
    if (Number.isFinite(value[key])) prefs[key] = Math.round(Math.min(max, Math.max(min, value[key])));
  }
  if (value.taste && typeof value.taste === 'object') {
    prefs.taste = Object.fromEntries(Object.entries(value.taste)
      .filter(([artist, level]) => artist.length > 0 && artist.length <= 140 && TASTE.includes(level) && level !== 'normal')
      .slice(-80));
  }
  return prefs;
}

const schemaModule = () => [
  '// Сгенерировано сервером из src/prefs.js',
  'export const CHOICES = ' + JSON.stringify(CHOICES) + ';',
  'export const DEFAULTS = ' + JSON.stringify(DEFAULTS) + ';',
  'export const RANGES = ' + JSON.stringify(RANGES) + ';',
  'export const TASTE = ' + JSON.stringify(TASTE) + ';',
  '',
].join('\n');

module.exports = { CHOICES, FLAGS, RANGES, TASTE, DEFAULTS, cleanPrefs, schemaModule };
},

"src/server.js": function (exports, require, module, __filename, __dirname) {
'use strict';

// HTTP: статика Mini App из public/ и JSON API.

const path = require('node:path');
const http = require('node:http');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const config = require('./config');
const db = require('./db');
const { LRU, httpError } = require('./util');
const { DEFAULTS, cleanPrefs, schemaModule } = require('./prefs');
const catalog = require('./catalog');
const audioCache = require('./audio-cache');
const { getLyrics } = require('./lyrics');
const { waveBatch } = require('./wave');
const { SC, isPlayable, trackView } = require('./soundcloud');
const { bot } = require('./telegram/api');
const { listAssets, readAsset } = require('./assets');

// ── авторизация Telegram Mini App ──
const appSecret = config.token && crypto.createHmac('sha256', 'WebAppData').update(config.token).digest();
const authCache = new LRU(4000, 5 * 60e3);
const appSeen = new LRU(20000, 10 * 60e3);

function telegramUser(req) {
  const header = req.headers.authorization;
  if (!appSecret || !header?.startsWith('tma ')) return null;
  const raw = header.slice(4);
  const cached = authCache.get(raw);
  if (cached !== undefined) return cached;
  const params = new URLSearchParams(raw);
  const hash = params.get('hash');
  let result = null;
  if (/^[a-f0-9]{64}$/i.test(hash || '') && new Set(params.keys()).size === [...params.keys()].length) {
    params.delete('hash');
    params.sort();
    const fields = [...params].map(([key, value]) => key + '=' + value).join('\n');
    const check = crypto.createHmac('sha256', appSecret).update(fields).digest();
    const time = Number(params.get('auth_date')), now = Math.floor(Date.now() / 1000);
    if (crypto.timingSafeEqual(check, Buffer.from(hash, 'hex')) && Number.isInteger(time) && time > now - 7 * 86400 && time < now + 60) {
      try {
        const user = JSON.parse(params.get('user'));
        if (Number.isSafeInteger(user?.id) && user.id > 0) result = user;
      } catch { /* нет пользователя */ }
    }
  }
  authCache.set(raw, result);
  return result;
}

// ── ответы ──
function json(res, status, data) {
  const body = Buffer.from(JSON.stringify(data));
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'content-length': body.length });
  res.end(body);
}

async function bodyJson(req, limit = 65536) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > limit) throw httpError(413, 'Слишком большой запрос');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch { throw httpError(400, 'Неверный JSON'); }
}

const buckets = new LRU(8192, 60e3);
function rateLimit(req, uid, route, limit) {
  const key = route + ':' + (uid || req.socket.remoteAddress);
  const bucket = buckets.get(key) || { count: 0, until: Date.now() + 60e3 };
  if (++bucket.count > limit) throw httpError(429, 'Слишком много запросов. Попробуйте через минуту.');
  buckets.set(key, bucket, bucket.until - Date.now());
}

const trackId = value => /^\d{1,15}$/.test(String(value ?? '')) ? String(value) : null;
const page = (value, max) => Math.min(max, Math.max(0, parseInt(value, 10) || 0));

// ── API ──
async function api(req, res, url) {
  const route = url.pathname.slice(4);
  const q = url.searchParams;
  const user = telegramUser(req);
  const uid = user ? String(user.id) : null;
  if (uid) {
    if (db.isBanned(uid)) throw httpError(403, 'Доступ ограничен');
    if (!appSeen.has(uid)) { appSeen.set(uid, 1); db.touchUser(user, { via: 'app' }); }
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    if (route === '/config') {
      return json(res, 200, { moods: catalog.MOODS.map(({ query, ...m }) => m), genres: catalog.GENRES, defaults: DEFAULTS,
        bot: bot.username || '', cache: audioCache.enabled(), version: config.version });
    }
    if (route === '/state') {
      if (!uid) throw httpError(401, 'Откройте Lo-fi через Telegram для синхронизации');
      const prefs = db.sql('SELECT value FROM preferences WHERE uid = ?').get(uid);
      let preferences = null;
      try { preferences = prefs ? cleanPrefs(JSON.parse(prefs.value)) : null; } catch {}
      return json(res, 200, { preferences, favorites: db.library(uid, 'favorite'), recent: db.library(uid, 'recent'), dislikes: db.library(uid, 'dislike') });
    }
    const streamMatch = route.match(/^\/stream\/(\d{1,15})\/([\w.]{1,24})$/);
    if (streamMatch) {
      if (audioCache.serve(req, res, streamMatch[1], streamMatch[2])) return;
      throw httpError(404, 'Трека нет в кеше');
    }

    rateLimit(req, uid, route, uid ? 240 : 150);
    const id = trackId(q.get('id'));
    const originals = q.has('originals') ? q.get('originals') === '1' : config.originalsByDefault;
    switch (route) {
      case '/home': return json(res, 200, await catalog.home());
      case '/releases': return json(res, 200, await catalog.releases());
      case '/mood': return json(res, 200, await catalog.moodView(q.get('id'), page(q.get('page'), 16)));
      case '/search': {
        const query = (q.get('q') || '').trim();
        if (query.length < 2 || query.length > 220) throw httpError(400, 'Введите от 2 до 220 символов');
        const kind = ['a', 'u'].includes(q.get('kind')) ? q.get('kind') : 't';
        return json(res, 200, await catalog.listTracks(query, kind, page(q.get('page'), 16), originals));
      }
      case '/artist': {
        const name = (q.get('name') || '').trim().slice(0, 140);
        if (!id && !name) throw httpError(400, 'Укажите артиста');
        return json(res, 200, await catalog.artistView(name, id));
      }
      case '/album':
        if (!id) break;
        return json(res, 200, await catalog.albumTracks(id, page(q.get('page'), 999)));
      case '/track': {
        if (!id) break;
        const track = await SC.track(id);
        return json(res, 200, { track: trackView(track) });
      }
      case '/playback': {
        if (!id) break;
        const row = audioCache.lookup(id);
        if (row) {
          const track = await SC.track(id).then(trackView).catch(() => null);
          return json(res, 200, { track, ...audioCache.sourceOf(row), cached: true });
        }
        audioCache.missed();
        const data = await catalog.playback(id, q.get('quality') === 'normal' ? 'normal' : 'high');
        if (data.protocol !== 'widget') void audioCache.ensure(id, { priority: true });
        return json(res, 200, { ...data, cached: false });
      }
      case '/lyrics':
        if (!id) break;
        return json(res, 200, await getLyrics(id));
    }
  }

  if (req.method === 'POST') {
    rateLimit(req, uid, route, uid ? 240 : 120);
    if (route === '/prefetch') {
      const body = await bodyJson(req);
      const ids = (Array.isArray(body.ids) ? body.ids : []).map(trackId).filter(Boolean).slice(0, 3);
      for (const item of ids) void audioCache.ensure(item);
      return json(res, 202, { queued: ids.length, enabled: audioCache.enabled() });
    }
    if (route === '/wave') {
      const body = await bodyJson(req, 131072);
      return json(res, 200, await waveBatch(uid, body));
    }
    if (route === '/event') {
      const body = await bodyJson(req);
      const id = trackId(body.id);
      if (!id || !['play', 'skip', 'finish', 'like', 'dislike'].includes(body.kind)) throw httpError(400, 'Некорректное событие');
      const track = { id, title: String(body.title || ''), artist: String(body.artist || '') };
      db.logEvent(uid, track, body.kind, ['wave', 'search', 'album', 'artist', 'mood', 'library', 'home', 'queue'].includes(body.source) ? body.source : '');
      return json(res, 200, { ok: true });
    }
    if (['/preferences', '/favorite', '/dislike', '/recent', '/clear'].includes(route)) {
      if (!uid) throw httpError(401, 'Откройте Lo-fi через Telegram для синхронизации');
      const body = await bodyJson(req);
      if (route === '/preferences') {
        const prefs = cleanPrefs(body);
        db.sql('INSERT INTO preferences VALUES (?, ?) ON CONFLICT(uid) DO UPDATE SET value = excluded.value').run(uid, JSON.stringify(prefs));
        return json(res, 200, { preferences: prefs });
      }
      if (route === '/clear') {
        if (!['recent', 'dislike'].includes(body.kind)) throw httpError(400, 'Нельзя очистить');
        db.libraryClear(uid, body.kind);
        return json(res, 200, { ok: true });
      }
      const id = trackId(body.id);
      if (!id) throw httpError(400, 'Некорректный трек');
      const kind = route.slice(1);
      if (kind !== 'recent' && body.active === false) db.libraryRemove(uid, kind, id);
      else {
        const track = await SC.track(id);
        if (!isPlayable(track) && kind !== 'dislike') throw httpError(404, 'Трек недоступен');
        db.libraryPut(uid, kind, trackView(track));
      }
      return json(res, 200, { ok: true });
    }
  }
  throw httpError(404, 'Маршрут не найден');
}

// ── статика ──
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.svg', '.txt', '.json', '.webmanifest']);
const files = new Map();

function addFile(urlPath, body) {
  const ext = path.extname(urlPath);
  const entry = { type: TYPES[ext] || 'application/octet-stream', body, etag: '"' + crypto.createHash('sha1').update(body).digest('base64url').slice(0, 20) + '"' };
  if (COMPRESSIBLE.has(ext) && body.length > 1024) {
    entry.br = zlib.brotliCompressSync(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 10 } });
    entry.gzip = zlib.gzipSync(body, { level: 9 });
  }
  files.set(urlPath, entry);
}

function loadPublic() {
  for (const urlPath of listAssets()) {
    if (!TYPES[path.extname(urlPath)]) continue;
    const body = readAsset(urlPath);
    if (body) addFile(urlPath, body);
  }
  addFile('/js/schema.js', Buffer.from(schemaModule()));
}

const CSP = [
  "default-src 'self'",
  "script-src 'self' https://telegram.org https://w.soundcloud.com https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.sndcdn.com https://t.me https://*.telegram.org https://*.t.me",
  "font-src 'self'",
  "media-src 'self' blob: https://*.sndcdn.com https://*.soundcloud.cloud",
  "connect-src 'self' https://*.sndcdn.com https://*.soundcloud.cloud",
  "frame-src https://w.soundcloud.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'self' https://*.telegram.org https://telegram.org https://*.t.me https://t.me https://web.telegram.org",
].join('; ');

function serveStatic(req, res, url) {
  let key = url.pathname === '/' ? '/index.html' : url.pathname;
  // Клиентские маршруты (/search, /library…) отдают оболочку приложения.
  if (!files.has(key) && !path.extname(key)) key = '/index.html';
  const file = files.get(key);
  if (!file || !['GET', 'HEAD'].includes(req.method)) return json(res, 404, { error: 'Страница не найдена' });
  const headers = {
    'content-type': file.type, etag: file.etag, vary: 'accept-encoding',
    'cache-control': key === '/index.html' || key.endsWith('.js') || key.endsWith('.css') ? 'no-cache' : 'public, max-age=604800',
  };
  if (key === '/index.html') headers['content-security-policy'] = CSP;
  if (req.headers['if-none-match'] === file.etag) { res.writeHead(304, headers); return res.end(); }
  const accept = String(req.headers['accept-encoding'] || '');
  let body = file.body;
  if (file.br && /\bbr\b/.test(accept)) { body = file.br; headers['content-encoding'] = 'br'; }
  else if (file.gzip && /\bgzip\b/.test(accept)) { body = file.gzip; headers['content-encoding'] = 'gzip'; }
  headers['content-length'] = body.length;
  res.writeHead(200, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
}

async function handle(req, res) {
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('referrer-policy', 'no-referrer');
  let url;
  try {
    url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/healthz') return json(res, 200, { ok: true, version: config.version });
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    return serveStatic(req, res, url);
  } catch (error) {
    if (res.headersSent) return res.destroy();
    if (error.expose || [400, 401, 403, 404, 413, 429].includes(error.status)) {
      const message = error.expose ? error.message : error.status === 429 ? 'Каталог ограничил частоту запросов, попробуйте позже' :
        error.status === 404 ? 'Каталог не нашёл трек или подборку' : 'Запрос отклонён';
      return json(res, error.status, { error: message });
    }
    console.warn('API', url?.pathname || req.url, error.message);
    return json(res, 502, { error: url?.pathname.startsWith('/api/lyrics') ? 'Источник текстов временно недоступен' : 'Каталог временно недоступен' });
  }
}

function createServer() {
  loadPublic();
  return http.createServer(handle);
}

/** Перечитывает public/ (используется в режиме разработки). */
function reloadPublic() { files.clear(); loadPublic(); }

module.exports = { createServer, reloadPublic };
},

"src/soundcloud.js": function (exports, require, module, __filename, __dirname) {
'use strict';

// Клиент каталога SoundCloud: поиск, метаданные, фильтр оригиналов и выбор потока.

const config = require('./config');
const { LRU, memo, lc, normQ, fetchRetry, statusError, httpError } = require('./util');
const { getSetting, setSetting, deleteSetting } = require('./db');

const SC_API = 'https://api-v2.soundcloud.com';

const cache = {
  lists: new LRU(200, 15 * 60e3),
  track: new LRU(5000, 60 * 60e3),
  playlist: new LRU(240, 30 * 60e3),
  resolve: new LRU(400, 60 * 60e3),
  related: new LRU(600, 60 * 60e3),
  user: new LRU(240, 30 * 60e3),
  userInfo: new LRU(240, 60 * 60e3),
};

async function scrapeClientId() {
  const response = await fetchRetry('https://soundcloud.com/', { headers: { accept: 'text/html' } });
  const page = await response.text();
  const scripts = [...page.matchAll(/<script[^>]+src="(https:\/\/[^"]*sndcdn\.com\/assets\/[^"]+\.js)"/g)].map(m => m[1]).reverse();
  for (const src of scripts.slice(0, 14)) {
    if (new URL(src).hostname !== 'a-v2.sndcdn.com') continue;
    try {
      const js = await (await fetchRetry(src, { redirect: 'error' }, 1, 5000)).text();
      const match = js.match(/[^\w]client_id\s*:\s*"([0-9a-zA-Z]{32})"/) || js.match(/client_id=([0-9a-zA-Z]{32})/);
      if (match) return match[1];
    } catch { /* следующий скрипт */ }
  }
  throw Error('Не удалось получить client_id SoundCloud');
}

const SC = {
  cid: config.scClientId || null,
  cidPromise: null,
  cidAt: 0,

  async clientId() {
    if (this.cid) return this.cid;
    const saved = getSetting('sc_client_id');
    if (saved) return (this.cid = saved);
    return this.refreshClientId();
  },

  refreshClientId() {
    // Сайт SoundCloud иногда отвечает с перебоями — вторая попытка через секунду.
    this.cidPromise ??= scrapeClientId().catch(() => new Promise(resolve => setTimeout(resolve, 1000)).then(scrapeClientId))
      .then(id => { this.cid = id; this.cidAt = Date.now(); setSetting('sc_client_id', id); return id; })
      .finally(() => { this.cidPromise = null; });
    return this.cidPromise;
  },

  async api(pathname, params = {}, canRetry = true) {
    const cid = await this.clientId();
    const url = new URL(pathname, SC_API);
    if (url.origin !== SC_API || url.username || url.password) throw Error('Неизвестный адрес API SoundCloud');
    for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    url.searchParams.set('client_id', cid);
    const response = await fetchRetry(url.href, { headers: { accept: 'application/json' }, redirect: 'error' });
    if ((response.status === 401 || response.status === 403) && canRetry && Date.now() - this.cidAt > 30e3 && !config.scClientId) {
      await response.body?.cancel().catch(() => {});
      this.cid = null;
      deleteSetting('sc_client_id');
      await this.refreshClientId();
      return this.api(pathname, params, false);
    }
    if (!response.ok) { await response.body?.cancel().catch(() => {}); throw statusError(response); }
    return response.json();
  },

  /**
   * Выдача поиска ('t' — треки, 'a' — альбомы) порциями по 50 (до 250): только воспроизводимое,
   * а с фильтром — только оригиналы без дублей. Страницы нарезаются локально и всегда полные.
   */
  async searchList(kind, q, need, originals) {
    const key = `${kind}|${originals ? 1 : 0}|${normQ(q)}`;
    let state = cache.lists.get(key);
    if (!state) cache.lists.set(key, state = { items: [], keys: new Map(), raw: 0, hidden: 0, done: false, pending: null });
    while (state.items.length < need && !state.done) {
      state.pending ??= this.fetchListPage(kind, q, state, originals).finally(() => { state.pending = null; });
      await state.pending;
    }
    return state;
  },

  async fetchListPage(kind, q, state, originals) {
    const params = { q, limit: 50, offset: state.raw, linked_partitioning: 1 };
    let result;
    if (kind === 't') result = await this.api('/search/tracks', params);
    else {
      try { result = await this.api('/search/albums', params); }
      catch { result = await this.api('/search/playlists', params); }
    }
    const collection = Array.isArray(result) ? result : (result.collection || []);
    state.raw += 50;
    if (!result.next_href || !collection.length || state.raw >= 250) state.done = true;
    for (const item of collection) {
      if (kind === 't') {
        if (item?.kind !== 'track') continue;
        cache.track.set(item.id, Promise.resolve(item));
        if (!isPlayable(item)) continue;
        if (originals && !isOriginalTrack(item)) { state.hidden++; continue; }
      } else {
        if (item?.kind !== 'playlist') continue;
        if (originals && !isOriginalAlbum(item)) { state.hidden++; continue; }
      }
      if (!originals) { state.items.push(item); continue; }
      const dupKey = kind === 't' ? trackDupKey(item) : albumDupKey(item);
      const index = state.keys.get(dupKey);
      if (index === undefined) { state.keys.set(dupKey, state.items.length); state.items.push(item); continue; }
      state.hidden++;
      if (officialScore(item) > officialScore(state.items[index])) state.items[index] = item;
    }
  },

  track(id, fresh = false) {
    if (fresh) cache.track.delete(Number(id));
    return memo(cache.track, Number(id), () => this.api(`/tracks/${Number(id)}`));
  },

  /** Догружает полные карточки треков (в альбомах SoundCloud отдаёт заглушки). */
  async tracks(stubs) {
    const details = new Map(), missing = [];
    for (const item of stubs) {
      const id = Number(item.id);
      const known = item.title && item.media ? item : await cache.track.get(id)?.catch(() => null);
      if (known) details.set(id, known);
      else missing.push(id);
    }
    for (let offset = 0; offset < missing.length; offset += 50) {
      const chunk = missing.slice(offset, offset + 50);
      try {
        const response = await this.api('/tracks', { ids: chunk.join(',') });
        for (const t of (Array.isArray(response) ? response : response.collection || [])) details.set(Number(t.id), t);
      } catch { /* ниже добираем по одному */ }
      const absent = chunk.filter(id => !details.has(id));
      for (let i = 0; i < absent.length; i += 6) {
        await Promise.all(absent.slice(i, i + 6).map(async id => { try { details.set(id, await this.track(id)); } catch {} }));
      }
    }
    for (const [id, t] of details) cache.track.set(id, Promise.resolve(t));
    return stubs.map(stub => details.get(Number(stub.id)) || stub);
  },

  playlist(id) {
    return memo(cache.playlist, Number(id), () => this.api('/playlists/' + Number(id)));
  },

  related(id, limit = 20) {
    return memo(cache.related, Number(id) + ':' + limit, async () => {
      const result = await this.api(`/tracks/${Number(id)}/related`, { limit });
      const items = (result.collection || []).filter(t => t?.kind === 'track');
      for (const t of items) cache.track.set(t.id, Promise.resolve(t));
      return items;
    });
  },

  userTracks(userId) {
    return memo(cache.user, Number(userId), async () => {
      const result = await this.api(`/users/${Number(userId)}/tracks`, { limit: 80, linked_partitioning: 1 });
      const items = (result.collection || []).filter(t => t?.kind === 'track');
      for (const t of items) cache.track.set(t.id, Promise.resolve(t));
      return items.filter(isPlayable);
    });
  },

  user(userId) {
    return memo(cache.userInfo, Number(userId), () => this.api('/users/' + Number(userId)));
  },

  async resolve(raw) {
    const url = await expandUrl(raw);
    return memo(cache.resolve, url, () => this.api('/resolve', { url }));
  },

  async streamUrl(transcoding, track) {
    const result = await this.api(transcoding.url, { track_authorization: track.track_authorization });
    if (!result?.url) throw Error('SoundCloud не отдал ссылку на поток');
    return result.url;
  },
};

// ── ссылки ──
const SC_HOSTS = new Set(['soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com', 'on.soundcloud.com', 'soundcloud.app.goo.gl']);
function soundcloudUrl(value) {
  let raw = String(value ?? '').trim().replace(/[)\].,!?]+$/, '');
  if (!raw) return null;
  if (!/^[a-z]+:\/\//i.test(raw)) raw = 'https://' + raw;
  try {
    const url = new URL(raw);
    if (!['https:', 'http:'].includes(url.protocol) || !SC_HOSTS.has(url.hostname) || url.port || url.username || url.password || url.pathname === '/') return null;
    url.protocol = 'https:';
    return url;
  } catch { return null; }
}

async function expandUrl(raw) {
  let url = soundcloudUrl(raw);
  if (!url) throw httpError(400, 'Неверная ссылка каталога');
  for (let i = 0; i < 4 && ['on.soundcloud.com', 'soundcloud.app.goo.gl'].includes(url.hostname); i++) {
    const response = await fetchRetry(url, { redirect: 'manual' }, 1, 6000);
    await response.body?.cancel().catch(() => {});
    const location = response.headers.get('location');
    if (!location || response.status < 300 || response.status >= 400) throw statusError(response);
    url = soundcloudUrl(new URL(location, url).href);
    if (!url) throw httpError(400, 'Некорректная короткая ссылка');
  }
  if (!['soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com'].includes(url.hostname)) throw httpError(400, 'Не удалось раскрыть ссылку');
  url.hostname = 'soundcloud.com';
  url.search = '';
  url.hash = '';
  return url.href.replace(/\/$/, '');
}

/** Безопасный адрес медиа SoundCloud: только https на их CDN, без порта и учётных данных. */
function isMediaHost(url) {
  try {
    const u = url instanceof URL ? url : new URL(url);
    return u.protocol === 'https:' && !u.port && !u.username && !u.password
      && /(?:^|\.)(?:sndcdn\.com|soundcloud\.cloud)$/.test(u.hostname);
  } catch { return false; }
}

// ── метаданные ──
function meta(t) {
  const publisher = t?.publisher_metadata?.artist;
  let artist = publisher || t?.user?.username || 'Неизвестный артист';
  let title = t?.title || 'Без названия';
  if (!publisher) {
    const m = title.match(/^(.+?)\s+[-–—]\s+(.+)$/);
    if (m) { artist = m[1]; title = m[2]; }
  }
  return { artist: String(artist).trim(), title: String(title).trim(), dur: Math.round((t?.full_duration || t?.duration || 0) / 1000) };
}

function art(o, size = 't500x500') {
  const url = o?.artwork_url || (o?.kind === 'track' ? o?.user?.avatar_url : null);
  if (!url || /default_avatar/.test(url)) return null;
  return url.replace(/-(?:large|t\d+x\d+|crop|original|badge|small|tiny|mini)\.(?:jpe?g|png)$/i, `-${size}.jpg`);
}
function artUrl(o, size) {
  try {
    const url = new URL(art(o, size));
    return url.protocol === 'https:' && /\.sndcdn\.com$/.test(url.hostname) ? url.href : '';
  } catch { return ''; }
}

function yearOf(o) {
  const date = o?.release_date || o?.published_at || o?.display_date || o?.created_at;
  const year = date ? new Date(date).getFullYear() : 0;
  return year > 1990 ? year : '';
}

function fullTranscodings(t) {
  return (t?.media?.transcodings || []).filter(x => !x.snipped && x.url && x.format && !/encrypted/i.test(x.format.protocol || ''));
}

function isPlayable(t) {
  return !!t && t.kind === 'track' && t.policy !== 'BLOCK' && t.policy !== 'SNIP' && t.streamable !== false && fullTranscodings(t).length > 0;
}

// ── оригинал или пользовательский перезалив ──
// SoundCloud не помечает официальные релизы одним полем, поэтому решение складывается из признаков:
//  • сильные (сразу оригинал): ISRC/UPC от дистрибьютора, верифицированный автор, лейбл вместе с ℗;
//  • отбраковка: ускорения, ремиксы и каверы в названии, «канальный» ник, чужой артист в метаданных
//    или в названии вида «артист — трек», сборники и «фонк 2026»;
//  • одинаковые треки и альбомы от разных аккаунтов схлопываются, остаётся самый официальный.
const HARD_DERIV_RE = new RegExp([
  'sped[\\s-]*up', 'speed[\\s-]*up', 'slowed', 'reverb', 'nightcore', 'bass\\s*boost', '\\b8d\\b', 'type\\s*beat', 'karaoke',
  'tik\\s*tok', '\\b\\d+\\s*(?:hours?|hrs?)\\b', 're-?upload', 'snippet', '\\bleak', 'ускор', 'замедл', 'караоке', 'перезалив',
  'сниппет', 'слив', '\\(час\\)', '\\d+\\s*час', '\\sс\\s+тт(?:\\s|$)', 'из\\s+(?:тт|тик\\s*тока)',
].join('|'), 'i');
const SOFT_DERIV_RE = new RegExp([
  '\\bremix', '\\brmx\\b', 'mash[\\s-]*up', '\\bcover\\b', '\\bloop(?:ed)?\\b', '\\bextended\\b', '\\bedit\\b', '\\bbootleg',
  '\\bflip\\b', 'acapella', 'a\\s*cappella', '\\binstrumental', 'ремикс', 'кавер', 'минус', 'фонк', 'phonk', '\\blo-?fi\\b',
  '\\b(?:rock|piano|guitar|acoustic|orchestral|jazz|metal|8-?bit|rus|eng|russian|english)\\s+(?:version|ver\\.?)',
].join('|'), 'i');
const CHANNEL_RE = /\btunes\b|\bhq\b|lyrics|archive|\bleaks?\b|unreleased|re-?uploads?|fan\s*page|\bvault\b|slowed|sped\s*up|nightcore|\bremix(?:es)?\b|\bedits\b|playlist|перезалив|хиты|музыка\s+для|фонк|phonk/i;
const COMPILATION_RE = /сборник|compilation|playlist|плейлист|\bhits\b|хиты|best\s*of|лучшее|\btop\s*\d+|топ\s*\d+|для\s+(?:зала|машины|тренировок?|дрифта|сна|учёбы|учебы|работы)|\bvol\.?\s*\d/i;
const GENERIC_TITLE_RE = /^\s*(?:фонк|phonk|рэп|rap|музыка|music|бит|beat|трек|track|песня|song|хит|hit)(?:\s+(?:20\d\d|\d{1,2}))?\s*$/i;

/** «𝐒𝐩𝐞𝐝 𝐔𝐩» и прочие декоративные буквы → обычные, чтобы их не обходили проверкой. */
const plainText = s => String(s ?? '').normalize('NFKC');
const normName = s => lc(s).normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, '');

function sameArtist(artist, ...names) {
  const parts = lc(artist).split(/\s*(?:,|&|\+|\/|;|\sx\s|\sи\s|\sfeat\.?\s|\sft\.?\s|\sand\s|\swith\s)\s*/).map(normName).filter(Boolean);
  const candidates = names.filter(Boolean).map(normName).filter(Boolean);
  return parts.some(p => candidates.some(n => p === n || (p.length >= 3 && n.length >= 3 && (n.includes(p) || p.includes(n)))));
}

function isOfficialTrack(t) {
  const pm = t?.publisher_metadata || {}, user = t?.user || {};
  return !!(pm.isrc || pm.upc_or_ean || user.verified || user.badges?.verified || (t.label_name && pm.p_line));
}

function isOriginalTrack(t) {
  const title = plainText(t.title), uname = plainText(t.user?.username), pmArtist = t.publisher_metadata?.artist;
  if (HARD_DERIV_RE.test(title)) return false;
  if (t.user?.verified || t.user?.badges?.verified) return true;
  const prefix = title.match(/^(.+?)\s+[-–—]\s+.+$/)?.[1];
  const foreignPrefix = !!prefix && !sameArtist(prefix, uname, pmArtist);
  if (isOfficialTrack(t)) return !foreignPrefix;
  if (SOFT_DERIV_RE.test(title) || COMPILATION_RE.test(title) || GENERIC_TITLE_RE.test(title)) return false;
  if (CHANNEL_RE.test(uname)) return false;
  if (pmArtist && !sameArtist(pmArtist, uname)) return false;
  if (foreignPrefix) return false;
  const by = title.match(/\bby\s+([^\s()[\]]+)/i);
  if (by && !sameArtist(by[1], uname, pmArtist)) return false;
  return true;
}

function isOriginalAlbum(p) {
  const user = p?.user || {};
  const title = plainText(p.title), uname = plainText(user.username);
  if (HARD_DERIV_RE.test(title)) return false;
  if (user.verified || user.badges?.verified || p.label_name) return true;
  if (SOFT_DERIV_RE.test(title) || COMPILATION_RE.test(title) || GENERIC_TITLE_RE.test(title)) return false;
  if (CHANNEL_RE.test(uname)) return false;
  const m = title.match(/^(.+?)\s+[-–—]\s+.+$/);
  if (m && !sameArtist(m[1], uname)) return false;
  return true;
}

const officialScore = x => (isOfficialTrack(x) || x?.user?.verified ? 1e12 : 0) + (x?.user?.followers_count || 0);
const DUP_NOISE_RE = /\s*[([](?:feat|ft|prod|with|explicit|clean|official|audio|video|lyrics?|remaster|cdq|hq)[^)\]]*[)\]]/gi;
function trackDupKey(t) {
  const m = meta(t);
  let title = plainText(m.title).replace(DUP_NOISE_RE, ' ');
  const pre = title.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (pre && sameArtist(pre[1], m.artist)) title = pre[2];
  return `${normName(m.artist)}|${normName(title)}`;
}
const albumDupKey = p => `${normName(plainText(p.title).replace(/^.+?\s+[-–—]\s+/, '').replace(DUP_NOISE_RE, ' '))}|${p.track_count || 0}`;

function canvasUrl(track) {
  const value = track.visuals?.visuals?.find(item => /\.mp4(?:\?|$)/i.test(item.visual_url || ''))?.visual_url || '';
  return isMediaHost(value) ? value : '';
}

/** Компактное представление трека для клиента. */
function trackView(track) {
  const { title: rawTitle, artist, dur } = meta(track);
  const title = lc(rawTitle).startsWith(lc(artist) + ' - ') ? rawTitle.slice(artist.length + 3) : rawTitle;
  const own = normQ(artist) === normQ(track.user?.username);
  return {
    id: String(track.id), title, artist, dur, available: isPlayable(track),
    artistId: own && track.user?.id ? String(track.user.id) : '',
    userId: track.user?.id ? String(track.user.id) : '',
    avatar: own ? artUrl({ artwork_url: track.user.avatar_url }, 't200x200') : '',
    artwork: artUrl(track, 't500x500'),
    canvas: canvasUrl(track),
    url: soundcloudUrl(track.permalink_url || '')?.href || '',
    album: track.publisher_metadata?.album_title || '',
    genre: String(track.genre || '').slice(0, 40),
    explicit: !!track.publisher_metadata?.explicit,
  };
}

function albumView(album) {
  const artist = album.publisher_metadata?.artist || album.user?.username || 'Исполнитель';
  return {
    id: String(album.id), title: album.title || 'Без названия', artist,
    artistId: album.user?.id && (!album.publisher_metadata?.artist || normQ(artist) === normQ(album.user.username)) ? String(album.user.id) : '',
    count: album.track_count || 0, year: yearOf(album), artwork: artUrl(album, 't500x500'),
    url: soundcloudUrl(album.permalink_url || '')?.href || '',
  };
}

const playables = (tracks, originals = false) => tracks.filter(t => isPlayable(t) && (!originals || isOriginalTrack(t))).map(trackView);

module.exports = {
  SC, cache, soundcloudUrl, expandUrl, isMediaHost, meta, art, artUrl, yearOf, fullTranscodings, isPlayable,
  isOriginalTrack, isOriginalAlbum, isOfficialTrack, sameArtist, normName, plainText, trackDupKey,
  HARD_DERIV_RE, trackView, albumView, playables,
};
},

"src/telegram/admin.js": function (exports, require, module, __filename, __dirname) {
'use strict';

// Админ-панель бота: статистика, пользователи, стартовое сообщение с редактором кнопок,
// рассылки, тексты песен, кеш, настройки бота и администраторы.

const config = require('../config');
const db = require('../db');
const { sql, now, isAdmin, isOwner } = db;
const { html, plural, formatBytes } = require('../util');
const { tg, send, inline, cb, downloadFile, bot } = require('./api');
const start = require('./start');
const bc = require('./broadcast');
const audioCache = require('../audio-cache');
const lyrics = require('../lyrics');
const { SC, soundcloudUrl, trackView } = require('../soundcloud');

const sessions = new Map();
const session = uid => {
  let s = sessions.get(uid);
  if (!s) sessions.set(uid, s = { wait: null, draft: null });
  return s;
};
const startedAt = Date.now();

const back = (to = 'a:home', label = '← Назад') => [cb(label, to)];
const cancelRow = to => [cb('Отмена', to)];
const n = value => Number(value || 0).toLocaleString('ru-RU');

async function show(ctx, text, rows) {
  const payload = { text, parse_mode: 'HTML', reply_markup: inline(rows), link_preview_options: { is_disabled: true } };
  if (ctx.messageId) {
    try {
      await tg('editMessageText', { chat_id: ctx.chatId, message_id: ctx.messageId, ...payload });
      return;
    } catch (error) {
      if (/not modified/i.test(error.description || '')) return;
      if (error.status !== 400) throw error;
    }
  }
  const sent = await tg('sendMessage', { chat_id: ctx.chatId, ...payload });
  ctx.messageId = sent.message_id;
}

async function ask(ctx, wait, text, cancelTo) {
  await show(ctx, text, [cancelRow(cancelTo)]);
  session(ctx.uid).wait = { ...wait, panel: ctx.messageId, cancelTo };
}

// ── главное меню ──
function count(query, ...args) { return sql(query).get(...args).n; }

async function home(ctx) {
  const day = 864e5, t = now();
  const text = [
    '<b>Lo-fi · панель управления</b>',
    '',
    `Пользователей: <b>${n(count('SELECT COUNT(*) AS n FROM users'))}</b> · новых за сутки ${n(count('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?', t - day))}`,
    `Открывали приложение за сутки: ${n(count('SELECT COUNT(*) AS n FROM users WHERE app_seen_at >= ?', t - day))}`,
    `Прослушиваний за сутки: ${n(count("SELECT COUNT(*) AS n FROM events WHERE kind = 'play' AND ts >= ?", t - day))}`,
    `Кеш треков: ${html(audioCache.summary().text)}`,
  ].join('\n');
  const rows = [
    [cb('📊 Статистика', 'a:stats'), cb('👥 Пользователи', 'a:users')],
    [cb('✉️ Стартовое сообщение', 'a:st')],
    [cb('📣 Рассылки', 'a:bc'), cb('🎤 Тексты песен', 'a:ly')],
    [cb('🗄 Кеш', 'a:cache'), cb('⚙️ Бот', 'a:bot')],
  ];
  if (isOwner(ctx.uid)) rows.push([cb('👮 Администраторы', 'a:adm')]);
  await show(ctx, text, rows);
}

// ── статистика ──
async function stats(ctx) {
  const day = 864e5, t = now();
  const plays7 = count("SELECT COUNT(*) AS n FROM events WHERE kind = 'play' AND ts >= ?", t - 7 * day);
  const skips7 = count("SELECT COUNT(*) AS n FROM events WHERE kind = 'skip' AND ts >= ?", t - 7 * day);
  const wave7 = count("SELECT COUNT(*) AS n FROM events WHERE kind = 'play' AND source = 'wave' AND ts >= ?", t - 7 * day);
  const top = sql("SELECT title, artist, COUNT(*) AS n FROM events WHERE kind = 'play' AND ts >= ? GROUP BY track_id ORDER BY n DESC LIMIT 7").all(t - 7 * day);
  const artists = sql("SELECT artist, COUNT(*) AS n FROM events WHERE kind = 'play' AND ts >= ? AND artist != '' GROUP BY artist ORDER BY n DESC LIMIT 5").all(t - 7 * day);
  const sources = sql("SELECT source, COUNT(*) AS n FROM users WHERE source != '' GROUP BY source ORDER BY n DESC LIMIT 5").all();
  const mem = process.memoryUsage().rss;
  const up = Math.round((Date.now() - startedAt) / 3600e3);
  const lines = [
    '<b>📊 Статистика</b>',
    '',
    '<b>Аудитория</b>',
    `Всего: ${n(count('SELECT COUNT(*) AS n FROM users'))} · запускали бота: ${n(count('SELECT COUNT(*) AS n FROM users WHERE bot_seen_at IS NOT NULL'))}`,
    `Новые: сутки ${n(count('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?', t - day))} · неделя ${n(count('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?', t - 7 * day))} · месяц ${n(count('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?', t - 30 * day))}`,
    `В приложении: сутки ${n(count('SELECT COUNT(*) AS n FROM users WHERE app_seen_at >= ?', t - day))} · неделя ${n(count('SELECT COUNT(*) AS n FROM users WHERE app_seen_at >= ?', t - 7 * day))} · месяц ${n(count('SELECT COUNT(*) AS n FROM users WHERE app_seen_at >= ?', t - 30 * day))}`,
    `Заблокировали бота: ${n(count('SELECT COUNT(*) AS n FROM users WHERE blocked = 1'))} · в бане: ${n(count('SELECT COUNT(*) AS n FROM users WHERE banned = 1'))}`,
    '',
    '<b>Прослушивания за 7 дней</b>',
    `Запусков: ${n(plays7)} · из «Моей волны»: ${plays7 ? Math.round(wave7 / plays7 * 100) : 0}%`,
    `Пропусков: ${plays7 ? Math.round(skips7 / plays7 * 100) : 0}% · лайков: ${n(count("SELECT COUNT(*) AS n FROM events WHERE kind = 'like' AND ts >= ?", t - 7 * day))}`,
  ];
  if (top.length) lines.push('', '<b>Топ треков недели</b>', ...top.map((r, i) => `${i + 1}. ${html(r.artist)} — ${html(r.title)} · ${n(r.n)}`));
  if (artists.length) lines.push('', '<b>Топ артистов</b>', artists.map(r => `${html(r.artist)} (${n(r.n)})`).join(', '));
  if (sources.length) lines.push('', '<b>Источники</b> (/start src_…)', sources.map(r => `${html(r.source)}: ${n(r.n)}`).join(' · '));
  lines.push('', `<b>Сервер</b>: ${up} ч без перезапуска · память ${formatBytes(mem)}`, `Кеш треков: ${html(audioCache.summary().text)}`);
  await show(ctx, lines.join('\n'), [[cb('🔄 Обновить', 'a:stats')], back()]);
}

// ── пользователи ──
async function users(ctx) {
  const last = sql('SELECT * FROM users ORDER BY created_at DESC LIMIT 6').all();
  const text = [
    '<b>👥 Пользователи</b>',
    '',
    `Всего: ${n(count('SELECT COUNT(*) AS n FROM users'))} · Premium: ${n(count('SELECT COUNT(*) AS n FROM users WHERE premium = 1'))}`,
    '',
    '<b>Новые</b>',
    ...last.map(u => `• ${userName(u)} · <code>${u.id}</code>`),
    '',
    'Найти можно по ID, @username или пересланному сообщению.',
  ].join('\n');
  await show(ctx, text, [[cb('🔎 Найти', 'a:us:find'), cb('⬇️ Экспорт CSV', 'a:us:csv')], back()]);
}

const userName = u => html([u.first_name, u.last_name].filter(Boolean).join(' ') || 'Без имени') + (u.username ? ' @' + html(u.username) : '');
const date = ts => ts ? bc.fmtTime(ts) : '—';

async function userCard(ctx, id) {
  const u = db.getUser(id);
  if (!u) return show(ctx, 'Пользователь не найден.', [back('a:users')]);
  const plays = count("SELECT COUNT(*) AS n FROM events WHERE uid = ? AND kind = 'play'", u.id);
  const favs = count("SELECT COUNT(*) AS n FROM library WHERE uid = ? AND kind = 'favorite'", u.id);
  const status = u.banned ? '🚫 в бане' : u.blocked ? '⛔️ заблокировал бота' : '✅ активен';
  const text = [
    `<b>${userName(u)}</b>`,
    `ID: <code>${u.id}</code>${u.premium ? ' · ⭐️ Premium' : ''}${u.lang ? ' · ' + html(u.lang) : ''}`,
    `Статус: ${status}${isAdmin(u.id) ? ' · администратор' : ''}`,
    '',
    `Впервые: ${date(u.created_at)}`,
    `Бот: ${date(u.bot_seen_at)} · приложение: ${date(u.app_seen_at)}`,
    `Прослушиваний: ${n(plays)} · в избранном: ${n(favs)}`,
    u.source ? `Источник: ${html(u.source)}` : '',
  ].filter(line => line !== '').join('\n');
  await show(ctx, text, [
    [cb(u.banned ? '✅ Разбанить' : '🚫 Забанить', `a:uc:${u.id}:ban`), cb('✉️ Написать', `a:uc:${u.id}:msg`)],
    back('a:users'),
  ]);
}

async function exportUsers(ctx) {
  const rows = sql('SELECT * FROM users ORDER BY created_at').all();
  const head = ['id', 'username', 'first_name', 'last_name', 'lang', 'premium', 'created', 'bot_seen', 'app_seen', 'blocked', 'banned', 'source'];
  const iso = ts => ts ? new Date(ts).toISOString() : '';
  const cell = v => /[",\n;]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
  const csv = '﻿' + [head.join(','), ...rows.map(u => [u.id, u.username, u.first_name, u.last_name, u.lang, u.premium, iso(u.created_at),
    iso(u.bot_seen_at), iso(u.app_seen_at), u.blocked, u.banned, u.source].map(cell).join(','))].join('\n');
  const form = new FormData();
  form.append('chat_id', String(ctx.chatId));
  form.append('caption', `Пользователи Lo-fi: ${rows.length}`);
  form.append('document', new Blob([csv], { type: 'text/csv' }), `lofi-users-${new Date().toISOString().slice(0, 10)}.csv`);
  await tg('sendDocument', form, { timeout: 60000 });
}

// ── стартовое сообщение ──
async function startScreen(ctx) {
  const card = start.getCard();
  const media = { default: 'стандартная обложка', none: 'без медиа', photo: 'фото', video: 'видео', animation: 'GIF' }[card.media.type] || card.media.type;
  const premium = card.entities.filter(e => e.type === 'custom_emoji').length;
  const text = [
    '<b>✉️ Стартовое сообщение</b>',
    'Его получает каждый, кто отправляет /start.',
    '',
    '<b>Текст</b>' + (premium ? ` · премиум-эмодзи: ${premium}` : ''),
    `<blockquote expandable>${html(card.text.slice(0, 700))}${card.text.length > 700 ? '…' : ''}</blockquote>`,
    `<b>Медиа:</b> ${media}`,
    `<b>Кнопки:</b> ${card.buttons.flat().length ? '' : 'нет'}`,
    ...card.buttons.map((row, r) => `${r + 1}. ` + row.map(b => html(b.text)).join(' │ ')),
    card.media.type !== 'none' && card.text.length > 1024 ? '\n⚠️ Текст длиннее 1024 символов: он придёт отдельным сообщением после медиа.' : '',
  ].filter(Boolean).join('\n');
  await show(ctx, text, [
    [cb('✏️ Текст', 'a:st:text'), cb('🖼 Медиа', 'a:st:media')],
    [cb('🔘 Кнопки', 'a:sb')],
    [cb('👁 Предпросмотр', 'a:st:prev'), cb('♻️ Сбросить', 'a:st:reset')],
    back(),
  ]);
}

async function buttonsScreen(ctx) {
  const card = start.getCard();
  const rows = card.buttons.flatMap((row, r) => [row.map((b, c) => cb(`${b.emoji ? '✦ ' : ''}${b.text}`, `a:sb:${r}.${c}`))]);
  const text = [
    '<b>🔘 Кнопки стартового сообщения</b>',
    '',
    'Нажмите на кнопку, чтобы изменить текст, действие, премиум-эмодзи, цвет или положение. Ряды повторяют раскладку в сообщении.',
    card.buttons.length ? '' : '\nКнопок пока нет.',
  ].join('\n');
  await show(ctx, text, [...rows, [cb('➕ Добавить кнопку', 'a:sb:add')], back('a:st', '← К сообщению')]);
}

function buttonAt(card, pos) {
  const [r, c] = String(pos).split('.').map(Number);
  const button = card.buttons[r]?.[c];
  return button ? { button, r, c } : null;
}

async function buttonCard(ctx, pos) {
  const card = start.getCard();
  const found = buttonAt(card, pos);
  if (!found) return buttonsScreen(ctx);
  const { button: b } = found;
  const action = b.kind === 'url' ? `ссылка ${html(b.url)}` : `открыть Mini App · ${start.PAGES[b.page] || start.PAGES.home}`;
  const text = [
    `<b>Кнопка «${html(b.text)}»</b>`,
    '',
    `Действие: ${action}`,
    `Премиум-эмодзи: ${b.emoji ? '<tg-emoji emoji-id="' + html(b.emoji) + '">⭐️</tg-emoji>' : 'нет'}`,
    `Цвет: ${start.STYLE_NAMES[b.style || '']}`,
    '',
    'Цвет и эмодзи на кнопке поддерживают свежие версии Telegram. Если клиент их не умеет, кнопка будет обычной.',
  ].join('\n');
  await show(ctx, text, [
    [cb('✏️ Текст', `a:sbt:${pos}`), cb('🔗 Действие', `a:sba:${pos}`)],
    [cb('😀 Эмодзи', `a:sbe:${pos}`), cb('🎨 Цвет: ' + start.STYLE_NAMES[b.style || ''], `a:sbs:${pos}`)],
    [cb('⬆️', `a:sbm:${pos}:u`), cb('⬇️', `a:sbm:${pos}:d`), cb('⬅️', `a:sbm:${pos}:l`), cb('➡️', `a:sbm:${pos}:r`)],
    [cb('🗑 Удалить', `a:sbd:${pos}`)],
    back('a:sb', '← К кнопкам'),
  ]);
}

function locate(rows, target) {
  for (let r = 0; r < rows.length; r++) {
    const c = rows[r].indexOf(target);
    if (c >= 0) return `${r}.${c}`;
  }
  return null;
}

function moveButton(card, pos, dir) {
  const found = buttonAt(card, pos);
  if (!found) return pos;
  const { button, r, c } = found;
  const rows = card.buttons;
  if (dir === 'l' && c > 0) [rows[r][c - 1], rows[r][c]] = [rows[r][c], rows[r][c - 1]];
  else if (dir === 'r' && c < rows[r].length - 1) [rows[r][c + 1], rows[r][c]] = [rows[r][c], rows[r][c + 1]];
  else if (dir === 'u' || dir === 'd') {
    rows[r].splice(c, 1);
    const target = dir === 'u' ? r - 1 : r + 1;
    if (rows[target] && rows[target].length < 8) rows[target].push(button);
    else if (dir === 'u') rows.splice(Math.max(0, r), 0, [button]);
    else rows.splice(r + 1, 0, [button]);
  }
  card.buttons = rows.filter(row => row.length);
  return locate(card.buttons, button);
}

/** Текст кнопки и премиум-эмодзи из сообщения: первый custom_emoji становится иконкой. */
function labelFrom(message) {
  const text = message.text || '';
  const emoji = (message.entities || []).find(e => e.type === 'custom_emoji');
  let label = text;
  if (emoji) label = text.slice(0, emoji.offset) + text.slice(emoji.offset + emoji.length);
  label = label.replace(/\s+/g, ' ').trim();
  return { label, emoji: emoji?.custom_emoji_id || '' };
}

// ── рассылки ──
async function broadcastsScreen(ctx) {
  const list = bc.active();
  const reach = bc.countAudience('all');
  const text = [
    '<b>📣 Рассылки</b>',
    '',
    `Можно отправить: <b>${n(reach)}</b> ${plural(reach, 'пользователю', 'пользователям', 'пользователям')}`,
    'Бот копирует ваше сообщение целиком: текст с форматированием, премиум-эмодзи, фото, видео, GIF, документ или голосовое.',
    list.length ? '\n<b>Сейчас</b>\n' + list.map(b => bc.summaryLine(b)).join('\n') : '',
  ].join('\n');
  await show(ctx, text, [
    [cb('📝 Новая рассылка', 'a:bc:new')],
    ...list.map(b => [cb(`${b.status === 'scheduled' ? '🕒' : '⏳'} #${b.id} · подробнее`, `a:bh:${b.id}`)]),
    [cb('📜 История', 'a:bc:hist')],
    back(),
  ]);
}

async function draftScreen(ctx) {
  const draft = session(ctx.uid).draft;
  if (!draft) return broadcastsScreen(ctx);
  const o = draft.options;
  const reach = bc.countAudience(o.audience);
  const text = [
    '<b>📝 Черновик рассылки</b>',
    '',
    `Аудитория: <b>${html(bc.AUDIENCES[o.audience])}</b> · ${n(reach)} чел.`,
    `Кнопки: ${o.buttons.length ? '\n' + o.buttons.map(row => '   ' + row.map(b => html(b.text)).join(' │ ')).join('\n') : 'нет'}`,
    `Отправка: ${o.at ? bc.fmtTime(o.at) : 'сразу'}`,
    `Без звука: ${o.silent ? 'да' : 'нет'} · защита от пересылки: ${o.protect ? 'да' : 'нет'} · закрепить: ${o.pin ? 'да' : 'нет'}`,
    '',
    'Проверьте сообщение кнопкой «Предпросмотр»: копия придёт сюда.',
  ].join('\n');
  const mark = v => v ? ' ✓' : '';
  await show(ctx, text, [
    [cb('👥 ' + bc.AUDIENCES[o.audience], 'a:bd:aud')],
    [cb('🔘 Кнопки', 'a:bd:btn'), cb('🕒 Время', 'a:bd:time')],
    [cb('🔕 Без звука' + mark(o.silent), 'a:bd:silent'), cb('🛡 Защита' + mark(o.protect), 'a:bd:protect'), cb('📌 Закреп' + mark(o.pin), 'a:bd:pin')],
    [cb('👁 Предпросмотр', 'a:bd:prev')],
    [cb(o.at ? '🕒 Запланировать' : '🚀 Отправить', 'a:bd:go'), cb('🗑 Удалить черновик', 'a:bd:drop')],
  ]);
}

async function historyScreen(ctx) {
  const list = bc.recent(10);
  await show(ctx, '<b>📜 История рассылок</b>\n\n' + (list.length ? list.map(b => bc.summaryLine(b)).join('\n') : 'Рассылок ещё не было.'), [
    ...list.map(b => [cb(bc.summaryLine(b), `a:bh:${b.id}`)]),
    back('a:bc'),
  ]);
}

async function broadcastCard(ctx, id) {
  const b = bc.get(id);
  if (!b) return historyScreen(ctx);
  const delivered = bc.deliveredCount(id);
  const rows = [];
  if (['running', 'scheduled'].includes(b.status)) rows.push([cb('⏹ Остановить', `a:bh:${id}:stop`)]);
  if (delivered && Date.now() - (b.started_at || b.created_at) < 47 * 3600e3) rows.push([cb(`🗑 Удалить у получателей (${n(delivered)})`, `a:bh:${id}:del`)]);
  rows.push([cb('🔁 Повторить как черновик', `a:bh:${id}:dup`)], [cb('🔄 Обновить', `a:bh:${id}`)], back('a:bc:hist'));
  await show(ctx, bc.statusText(b), rows);
}

// ── тексты песен ──
async function lyricsScreen(ctx) {
  await show(ctx, [
    '<b>🎤 Тексты песен</b>',
    '',
    `Своих синхронизированных текстов: ${n(lyrics.overrideCount())}`,
    'Пришлите ссылку на трек, затем LRC с таймкодами вида [00:12.34]. Поддерживается расширенный LRC с таймкодами слов &lt;00:12.34&gt;.',
  ].join('\n'), [
    [cb('➕ Добавить или заменить', 'a:ly:add'), cb('🗑 Удалить свой', 'a:ly:del')],
    [cb('🧹 Сбросить кеш найденных текстов', 'a:ly:flush')],
    back(),
  ]);
}

async function resolveTrack(input) {
  const value = String(input || '').trim();
  if (/^\d{1,15}$/.test(value)) return SC.track(value);
  if (!soundcloudUrl(value)) return null;
  const found = await SC.resolve(value);
  return found?.kind === 'track' ? found : null;
}

// ── кеш ──
async function cacheScreen(ctx) {
  const s = audioCache.summary();
  await show(ctx, [
    '<b>🗄 Кеш</b>',
    '',
    `Треки: ${html(s.text)}`,
    `Отдано из кеша: ${n(s.hits)} · скачано за сеанс: ${n(s.downloads)} · ошибок: ${n(s.errors)}`,
    `Очередь загрузки: ${s.queue} · сейчас качается: ${s.active}`,
    audioCache.enabled() ? '' : '\nКеш выключен: AUDIO_CACHE_MB=0.',
  ].join('\n'), [
    [cb('🧹 Очистить кеш треков', 'a:ca:clear')],
    [cb('🔄 Обновить', 'a:cache')],
    back(),
  ]);
}

// ── настройки бота ──
async function botScreen(ctx) {
  await show(ctx, [
    '<b>⚙️ Бот</b>',
    '',
    `@${html(bot.username || '—')} · Bot API`,
    'Кнопка меню открывает Mini App из поля ввода. Описание видно в пустом чате до /start.',
  ].join('\n'), [
    [cb('📱 Кнопка меню', 'a:bt:menu'), cb('↩️ Меню по умолчанию', 'a:bt:menureset')],
    [cb('📝 Описание', 'a:bt:desc'), cb('🏷 Короткое описание', 'a:bt:short')],
    back(),
  ]);
}

// ── администраторы ──
async function adminsScreen(ctx) {
  const extra = db.listAdmins();
  await show(ctx, [
    '<b>👮 Администраторы</b>',
    '',
    'Владельцы (ADMIN_IDS): ' + ([...config.owners].map(id => `<code>${id}</code>`).join(', ') || '—'),
    'Добавленные: ' + (extra.length ? extra.map(a => `<code>${a.id}</code>`).join(', ') : 'нет'),
    '',
    'Добавленные администраторы видят панель, но не управляют этим списком.',
  ].join('\n'), [
    ...extra.map(a => [cb(`✖️ Убрать ${a.id}`, `a:ad:rm:${a.id}`)]),
    [cb('➕ Добавить', 'a:ad:add')],
    back(),
  ]);
}

// ── обработка нажатий ──
async function onCallback(query) {
  const uid = String(query.from.id);
  const chat = query.message?.chat;
  const allowed = chat?.type === 'private' && isAdmin(uid);
  if (!allowed) return tg('answerCallbackQuery', { callback_query_id: query.id, text: 'Доступ закрыт' }).catch(() => {});
  const ctx = { uid, chatId: chat.id, messageId: query.message.message_id };
  const toast = text => tg('answerCallbackQuery', { callback_query_id: query.id, text, show_alert: false }).catch(() => {});
  const parts = (query.data || '').split(':').slice(1);
  const [screen, arg, extra] = parts;
  const s = session(uid);
  if (!['bd'].includes(screen)) s.wait = null;
  let answered = false;
  const answer = async text => { answered = true; await toast(text); };

  try {
    switch (screen) {
      case 'home': await home(ctx); break;
      case 'stats': await stats(ctx); break;
      case 'users':
        await users(ctx); break;
      case 'us':
        if (arg === 'find') await ask(ctx, { type: 'user_find' }, 'Пришлите ID, @username или перешлите сообщение пользователя.', 'a:users');
        if (arg === 'csv') { await answer('Готовлю файл…'); await exportUsers(ctx); }
        break;
      case 'uc': {
        const u = db.getUser(arg);
        if (extra === 'ban' && u) {
          if (isAdmin(u.id)) { await answer('Администратора нельзя забанить'); break; }
          db.setBanned(u.id, !u.banned);
          await answer(u.banned ? 'Разбанен' : 'Забанен');
        }
        if (extra === 'msg' && u) { await ask(ctx, { type: 'user_msg', target: u.id }, `Пришлите сообщение для ${userName(u)}. Бот скопирует его как есть.`, `a:uc:${u.id}`); break; }
        await userCard(ctx, arg);
        break;
      }
      case 'st':
        if (!arg) await startScreen(ctx);
        else if (arg === 'text') await ask(ctx, { type: 'start_text' }, 'Пришлите новый текст. Жирный, курсив, ссылки, спойлеры, цитаты и <b>премиум-эмодзи</b> сохранятся. До 4096 символов (с медиа подпись — до 1024).', 'a:st');
        else if (arg === 'media') await ask(ctx, { type: 'start_media' }, 'Пришлите фото, видео или GIF. Слово «нет» — без медиа, «стандарт» — обложка Lo-fi.', 'a:st');
        else if (arg === 'prev') { await answer('Отправляю предпросмотр'); await start.sendCard(ctx.chatId); ctx.messageId = null; await startScreen(ctx); }
        else if (arg === 'reset') await show(ctx, 'Вернуть стандартные текст, медиа и кнопки?', [[cb('Да, вернуть', 'a:st:reset!'), cb('Отмена', 'a:st')]]);
        else if (arg === 'reset!') { start.resetCard(); await answer('Сброшено'); await startScreen(ctx); }
        break;
      case 'sb':
        if (!arg) await buttonsScreen(ctx);
        else if (arg === 'add') await ask(ctx, { type: 'btn_new' }, 'Пришлите текст новой кнопки (до 64 символов). Премиум-эмодзи в тексте станет иконкой кнопки.', 'a:sb');
        else await buttonCard(ctx, arg);
        break;
      case 'sbt': await ask(ctx, { type: 'btn_text', pos: arg }, 'Пришлите новый текст кнопки. Премиум-эмодзи в тексте станет иконкой.', `a:sb:${arg}`); break;
      case 'sba': await ask(ctx, { type: 'btn_action', pos: arg }, 'Пришлите ссылку (https://… или t.me/…) либо раздел приложения: «главная», «волна», «поиск», «медиатека».', `a:sb:${arg}`); break;
      case 'sbe': await ask(ctx, { type: 'btn_emoji', pos: arg }, 'Пришлите один премиум-эмодзи. Слово «нет» уберёт иконку.\n\nПремиум-эмодзи на кнопках работают, если у владельца бота есть Telegram Premium.', `a:sb:${arg}`); break;
      case 'sbs': {
        const card = start.getCard();
        const found = buttonAt(card, arg);
        if (found) {
          const i = start.STYLES.indexOf(found.button.style || '');
          found.button.style = start.STYLES[(i + 1) % start.STYLES.length];
          if (!found.button.style) delete found.button.style;
          start.saveCard(card);
        }
        await buttonCard(ctx, arg);
        break;
      }
      case 'sbm': {
        const card = start.getCard();
        const pos = moveButton(card, arg, extra);
        start.saveCard(card);
        await buttonCard(ctx, pos || arg);
        break;
      }
      case 'sbd': {
        const card = start.getCard();
        const found = buttonAt(card, arg);
        if (found) { card.buttons[found.r].splice(found.c, 1); card.buttons = card.buttons.filter(row => row.length); start.saveCard(card); await answer('Кнопка удалена'); }
        await buttonsScreen(ctx);
        break;
      }
      case 'bc':
        if (!arg) await broadcastsScreen(ctx);
        else if (arg === 'new') await ask(ctx, { type: 'bc_message' }, 'Пришлите сообщение для рассылки: текст, фото, видео, GIF, документ или голосовое. Форматирование и премиум-эмодзи сохранятся.\n\nАльбомы из нескольких фото не поддерживаются: бот скопирует только одно.', 'a:bc');
        else if (arg === 'hist') await historyScreen(ctx);
        break;
      case 'bd': {
        const draft = s.draft;
        if (!draft) { await broadcastsScreen(ctx); break; }
        s.wait = null;
        const o = draft.options;
        if (arg === 'aud') o.audience = bc.AUDIENCE_ORDER[(bc.AUDIENCE_ORDER.indexOf(o.audience) + 1) % bc.AUDIENCE_ORDER.length];
        if (arg === 'silent') o.silent = !o.silent;
        if (arg === 'protect') o.protect = !o.protect;
        if (arg === 'pin') o.pin = !o.pin;
        if (arg === 'btn') { await ask(ctx, { type: 'bc_buttons' }, 'Пришлите кнопки, по строке на ряд. Кнопки в ряду разделяйте « | ».\n\n<code>Открыть Lo-fi - app\nМоя волна - app:wave | Канал - https://t.me/channel</code>\n\nПремиум-эмодзи в начале текста станет иконкой кнопки. Слово «нет» уберёт кнопки.', 'a:bd'); break; }
        if (arg === 'time') { await ask(ctx, { type: 'bc_time' }, `Когда отправить? Например «25.11 20:00», «20:00», «через 2ч» или «сейчас». Время по UTC${config.tzOffset >= 0 ? '+' : '−'}${Math.abs(config.tzOffset / 60)}.`, 'a:bd'); break; }
        if (arg === 'prev') {
          await answer('Отправляю копию');
          await tg('copyMessage', { chat_id: ctx.chatId, from_chat_id: draft.chat, message_id: draft.message,
            reply_markup: o.buttons.length ? { inline_keyboard: o.buttons.map(row => row.map(b => start.toButton(b))) } : undefined }).catch(error =>
            tg('copyMessage', { chat_id: ctx.chatId, from_chat_id: draft.chat, message_id: draft.message,
              reply_markup: o.buttons.length ? { inline_keyboard: o.buttons.map(row => row.map(b => start.toButton(b, { plain: true }))) } : undefined }).catch(() => { throw error; }));
          ctx.messageId = null;
        }
        if (arg === 'go') {
          const reach = bc.countAudience(o.audience);
          if (!reach) { await answer('В этой аудитории никого нет'); break; }
          await show(ctx, `${o.at ? 'Запланировать на ' + bc.fmtTime(o.at) : 'Отправить сейчас'} для <b>${n(reach)}</b> ${plural(reach, 'пользователя', 'пользователей', 'пользователей')}?`,
            [[cb('✅ Да', 'a:bd:go!'), cb('Назад', 'a:bd')]]);
          break;
        }
        if (arg === 'go!') {
          const id = bc.create(draft, uid, ctx.chatId, ctx.messageId);
          s.draft = null;
          await answer(o.at ? 'Запланировано' : 'Рассылка запущена');
          await show(ctx, bc.statusText(bc.get(id)), [[cb('⏹ Остановить', `a:bh:${id}:stop`)], [cb('← Рассылки', 'a:bc')]]);
          break;
        }
        if (arg === 'drop') { s.draft = null; await answer('Черновик удалён'); await broadcastsScreen(ctx); break; }
        await draftScreen(ctx);
        break;
      }
      case 'bh': {
        if (extra === 'stop') { await answer(bc.stop(arg) ? 'Останавливаю' : 'Уже не идёт'); }
        if (extra === 'dup') {
          const b = bc.get(arg);
          if (b) { s.draft = { chat: b.source_chat, message: b.source_message, options: { ...b.options, at: null } }; await draftScreen(ctx); break; }
        }
        if (extra === 'del') {
          await answer('Удаляю…');
          const result = await bc.deleteEverywhere(arg, (done, total) => show(ctx, `Удаляю сообщения рассылки #${arg}: ${n(done)} из ${n(total)}…`, []));
          await show(ctx, `Рассылка #${arg}: удалено ${n(result.deleted)} из ${n(result.total)}.${result.failed ? ` Не удалось: ${n(result.failed)} (старше 48 часов или чат недоступен).` : ''}`, [back(`a:bh:${arg}`)]);
          break;
        }
        await broadcastCard(ctx, arg);
        break;
      }
      case 'ly':
        if (!arg) await lyricsScreen(ctx);
        if (arg === 'add') await ask(ctx, { type: 'lyrics_track' }, 'Пришлите ссылку на трек SoundCloud или его ID.', 'a:ly');
        if (arg === 'del') await ask(ctx, { type: 'lyrics_del' }, 'Пришлите ссылку на трек или ID, для которого нужно удалить свой текст.', 'a:ly');
        if (arg === 'flush') { lyrics.clearCache(); await answer('Кеш текстов сброшен'); await lyricsScreen(ctx); }
        break;
      case 'cache': await cacheScreen(ctx); break;
      case 'ca':
        if (arg === 'clear') await show(ctx, 'Удалить все скачанные треки с диска?', [[cb('Да, очистить', 'a:ca:clear!'), cb('Отмена', 'a:cache')]]);
        if (arg === 'clear!') { audioCache.clear(); await answer('Кеш очищен'); await cacheScreen(ctx); }
        break;
      case 'bot':
        await botScreen(ctx); break;
      case 'bt':
        if (arg === 'menu') await ask(ctx, { type: 'menu_text' }, 'Пришлите текст кнопки меню (до 32 символов), например «Lo-fi».', 'a:bot');
        if (arg === 'menureset') { await tg('setChatMenuButton', { menu_button: { type: 'default' } }); await answer('Кнопка меню сброшена'); await botScreen(ctx); }
        if (arg === 'desc') await ask(ctx, { type: 'bot_desc' }, 'Пришлите описание бота (до 512 символов). Его видно в пустом чате. «нет» — очистить.', 'a:bot');
        if (arg === 'short') await ask(ctx, { type: 'bot_short' }, 'Пришлите короткое описание (до 120 символов) для профиля бота. «нет» — очистить.', 'a:bot');
        break;
      case 'adm':
        if (!isOwner(uid)) { await answer('Только для владельцев'); break; }
        await adminsScreen(ctx); break;
      case 'ad':
        if (!isOwner(uid)) { await answer('Только для владельцев'); break; }
        if (arg === 'add') await ask(ctx, { type: 'admin_add' }, 'Пришлите числовой ID пользователя или перешлите его сообщение.', 'a:adm');
        if (arg === 'rm') { db.removeAdmin(extra); await answer('Удалён'); await adminsScreen(ctx); }
        break;
      default: await home(ctx);
    }
  } catch (error) {
    console.warn('Админ-панель:', error.message);
    if (!answered) await answer('Не получилось: ' + (error.description || error.message).slice(0, 150));
    return;
  }
  if (!answered) await toast();
}

// ── ввод от администратора ──
async function onInput(message) {
  const uid = String(message.from.id);
  const s = session(uid);
  const wait = s.wait;
  if (!wait) return false;
  const ctx = { uid, chatId: message.chat.id, messageId: null };
  const text = (message.text || message.caption || '').trim();
  const word = text.toLowerCase();
  const fail = async problem => {
    const sent = await send(ctx.chatId, problem, { reply_markup: inline([cancelRow(wait.cancelTo || 'a:home')]) });
    wait.panel = sent.message_id;
    return true;
  };
  // Удаляем старую панель, чтобы новая появилась под сообщением администратора.
  if (wait.panel) tg('deleteMessage', { chat_id: ctx.chatId, message_id: wait.panel }).catch(() => {});

  try {
    switch (wait.type) {
      case 'start_text': {
        if (!text) return fail('Нужен текст. Попробуйте ещё раз.');
        const card = start.getCard();
        card.text = message.text ?? message.caption ?? '';
        card.entities = message.entities || message.caption_entities || [];
        start.saveCard(card);
        s.wait = null;
        await startScreen(ctx);
        break;
      }
      case 'start_media': {
        const card = start.getCard();
        if (message.photo) card.media = { type: 'photo', file_id: message.photo.at(-1).file_id };
        else if (message.animation) card.media = { type: 'animation', file_id: message.animation.file_id };
        else if (message.video) card.media = { type: 'video', file_id: message.video.file_id };
        else if (word === 'нет') card.media = { type: 'none' };
        else if (word === 'стандарт') card.media = { type: 'default' };
        else return fail('Пришлите фото, видео, GIF или слово «нет» / «стандарт».');
        start.saveCard(card);
        s.wait = null;
        await startScreen(ctx);
        break;
      }
      case 'btn_new':
      case 'btn_text': {
        const { label, emoji } = labelFrom(message);
        if (!label || label.length > 64 || /\n/.test(message.text || '')) return fail('Текст кнопки — одна строка до 64 символов.');
        const card = start.getCard();
        let pos = wait.pos;
        if (wait.type === 'btn_new') {
          if (card.buttons.flat().length >= 30) return fail('Не больше 30 кнопок.');
          card.buttons.push([{ text: label, kind: 'app', page: 'home', ...(emoji ? { emoji } : {}) }]);
          pos = `${card.buttons.length - 1}.0`;
        } else {
          const found = buttonAt(card, pos);
          if (!found) break;
          found.button.text = label;
          if (emoji) found.button.emoji = emoji;
        }
        start.saveCard(card);
        s.wait = null;
        await buttonCard(ctx, pos);
        break;
      }
      case 'btn_action': {
        const card = start.getCard();
        const found = buttonAt(card, wait.pos);
        if (!found) break;
        const page = { 'главная': 'home', 'волна': 'wave', 'моя волна': 'wave', 'поиск': 'search', 'медиатека': 'library' }[word];
        if (page) { Object.assign(found.button, { kind: 'app', page }); delete found.button.url; }
        else {
          const url = bc.normalizeUrl(text);
          if (!url) return fail('Нужна ссылка https://…, t.me/… или раздел: главная, волна, поиск, медиатека.');
          Object.assign(found.button, { kind: 'url', url });
          delete found.button.page;
        }
        start.saveCard(card);
        s.wait = null;
        await buttonCard(ctx, wait.pos);
        break;
      }
      case 'btn_emoji': {
        const card = start.getCard();
        const found = buttonAt(card, wait.pos);
        if (!found) break;
        const id = (message.entities || []).find(e => e.type === 'custom_emoji')?.custom_emoji_id
          || (message.sticker?.type === 'custom_emoji' ? message.sticker.custom_emoji_id : '');
        if (word === 'нет') delete found.button.emoji;
        else if (id) found.button.emoji = id;
        else return fail('Это не премиум-эмодзи. Пришлите эмодзи из набора (с Telegram Premium) или «нет».');
        start.saveCard(card);
        s.wait = null;
        await buttonCard(ctx, wait.pos);
        break;
      }
      case 'bc_message': {
        if (message.media_group_id) await send(ctx.chatId, 'Это альбом: в рассылку попадёт только это сообщение.');
        if (message.poll || message.dice || message.location && !message.venue) return fail('Такое сообщение нельзя разослать. Пришлите текст или медиа.');
        s.draft = { chat: message.chat.id, message: message.message_id, options: { audience: 'all', buttons: [], silent: false, protect: false, pin: false, at: null } };
        s.wait = null;
        await draftScreen(ctx);
        break;
      }
      case 'bc_buttons': {
        if (!s.draft) break;
        try { s.draft.options.buttons = word === 'нет' ? [] : bc.parseButtons(message.text || '', message.entities || []); }
        catch (error) { return fail(error.message); }
        s.wait = null;
        await draftScreen(ctx);
        break;
      }
      case 'bc_time': {
        if (!s.draft) break;
        try { s.draft.options.at = bc.parseWhen(text); }
        catch (error) { return fail(error.message); }
        s.wait = null;
        await draftScreen(ctx);
        break;
      }
      case 'user_find': {
        let u;
        const forwarded = message.forward_origin?.type === 'user' ? message.forward_origin.sender_user?.id : null;
        if (forwarded) u = db.getUser(forwarded);
        else if (/^\d{1,15}$/.test(text)) u = db.getUser(text);
        else if (/^@?\w{3,32}$/.test(text)) u = sql('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(text.replace(/^@/, ''));
        if (!u) return fail('Не нашёл. Пользователь должен хотя бы раз написать боту или открыть приложение.');
        s.wait = null;
        await userCard(ctx, u.id);
        break;
      }
      case 'user_msg': {
        try {
          await tg('copyMessage', { chat_id: wait.target, from_chat_id: message.chat.id, message_id: message.message_id });
          await send(ctx.chatId, 'Доставлено.');
        } catch (error) {
          if (error.status === 403) db.setBlocked(wait.target, true);
          await send(ctx.chatId, 'Не доставлено: ' + (error.description || error.message));
        }
        s.wait = null;
        await userCard(ctx, wait.target);
        break;
      }
      case 'lyrics_track':
      case 'lyrics_del': {
        const track = await resolveTrack(text).catch(() => null);
        if (!track) return fail('Не нашёл трек. Пришлите ссылку SoundCloud на трек или его ID.');
        const view = trackView(track);
        if (wait.type === 'lyrics_del') {
          lyrics.removeOverride(view.id);
          s.wait = null;
          await send(ctx.chatId, `Свой текст для «${view.title}» удалён.`);
          await lyricsScreen(ctx);
          break;
        }
        await ask(ctx, { type: 'lyrics_lrc', track: view.id }, `Трек: <b>${html(view.artist)} — ${html(view.title)}</b>\n\nПришлите текст LRC или файл .lrc до 64 КБ. «сброс» — удалить свой текст.`, 'a:ly');
        break;
      }
      case 'lyrics_lrc': {
        let raw = message.text || '';
        if (message.document) {
          try { raw = (await downloadFile(message.document.file_id, 65536)).toString('utf8'); }
          catch (error) { return fail(error.message); }
        }
        if (raw.trim().toLowerCase() === 'сброс') lyrics.removeOverride(wait.track);
        else if (raw.length > 65536 || lyrics.parseLrc(raw).filter(l => l.text).length < 2) return fail('Нужен LRC с таймкодами [00:12.34] (не меньше двух строк) или файл до 64 КБ.');
        else lyrics.setOverride(wait.track, raw);
        s.wait = null;
        await send(ctx.chatId, 'Сохранено. Текст появится в караоке при следующем открытии трека.');
        await lyricsScreen(ctx);
        break;
      }
      case 'menu_text': {
        if (!text || text.length > 32) return fail('До 32 символов.');
        if (!config.appUrl) return fail('Сначала задайте APP_URL.');
        await tg('setChatMenuButton', { menu_button: { type: 'web_app', text, web_app: { url: config.appUrl + '/' } } });
        s.wait = null;
        await send(ctx.chatId, 'Кнопка меню обновлена.');
        await botScreen(ctx);
        break;
      }
      case 'bot_desc':
      case 'bot_short': {
        const limit = wait.type === 'bot_desc' ? 512 : 120;
        const value = word === 'нет' ? '' : text;
        if (value.length > limit) return fail(`До ${limit} символов.`);
        await tg(wait.type === 'bot_desc' ? 'setMyDescription' : 'setMyShortDescription', wait.type === 'bot_desc' ? { description: value } : { short_description: value });
        s.wait = null;
        await send(ctx.chatId, 'Сохранено.');
        await botScreen(ctx);
        break;
      }
      case 'admin_add': {
        if (!isOwner(uid)) break;
        const id = message.forward_origin?.type === 'user' ? String(message.forward_origin.sender_user.id) : /^\d{1,15}$/.test(text) ? text : '';
        if (!id) return fail('Нужен числовой ID или пересланное сообщение пользователя.');
        db.addAdmin(id, uid);
        s.wait = null;
        await adminsScreen(ctx);
        break;
      }
      default: return false;
    }
  } catch (error) {
    console.warn('Админ-ввод:', error.message);
    await send(ctx.chatId, 'Не получилось: ' + (error.description || error.message));
  }
  return true;
}

async function onCommand(message, command, args) {
  const uid = String(message.from.id);
  const ctx = { uid, chatId: message.chat.id, messageId: null };
  const s = session(uid);
  switch (command) {
    case 'admin': case 'cancel': s.wait = null; await home(ctx); return true;
    case 'stats': await stats(ctx); return true;
    case 'broadcast': await ask(ctx, { type: 'bc_message' }, 'Пришлите сообщение для рассылки. Форматирование и премиум-эмодзи сохранятся.', 'a:bc'); return true;
    case 'user': {
      if (!args) { await users(ctx); return true; }
      const value = args.trim().replace(/^@/, '');
      const u = /^\d+$/.test(value) ? db.getUser(value) : sql('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(value);
      if (u) await userCard(ctx, u.id); else await send(ctx.chatId, 'Не нашёл пользователя.');
      return true;
    }
    case 'lyrics': {
      if (!args) { await lyricsScreen(ctx); return true; }
      const track = await resolveTrack(args).catch(() => null);
      if (!track) { await send(ctx.chatId, 'Формат: /lyrics <ссылка на трек или ID>.'); return true; }
      const view = trackView(track);
      await ask(ctx, { type: 'lyrics_lrc', track: view.id }, `Трек: <b>${html(view.artist)} — ${html(view.title)}</b>\n\nПришлите текст LRC или файл .lrc до 64 КБ. «сброс» — удалить свой текст.`, 'a:ly');
      return true;
    }
    default: return false;
  }
}

const hasPending = uid => !!sessions.get(String(uid))?.wait;

module.exports = { onCallback, onInput, onCommand, hasPending };
},

"src/telegram/api.js": function (exports, require, module, __filename, __dirname) {
'use strict';

const config = require('../config');
const { sleep } = require('../util');

const bot = { username: '', id: '' };

async function tg(method, data = {}, { signal, timeout = 20000 } = {}) {
  if (!config.token) throw Error('BOT_TOKEN не задан');
  const multipart = data instanceof FormData;
  const response = await fetch(`https://api.telegram.org/bot${config.token}/${method}`, {
    method: 'POST',
    headers: multipart ? {} : { 'content-type': 'application/json' },
    body: multipart ? data : JSON.stringify(data),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(timeout)]) : AbortSignal.timeout(timeout),
  });
  let result;
  try { result = await response.json(); }
  catch { throw Object.assign(Error(`${method}: HTTP ${response.status}`), { status: response.status }); }
  if (!result.ok) {
    throw Object.assign(Error(`${method}: ${result.description || 'ошибка Telegram API'}`), {
      status: result.error_code || response.status, retryAfter: result.parameters?.retry_after, description: result.description || '',
    });
  }
  return result.result;
}

/** Вызов с ожиданием при 429 (для рассылок и массовых операций). */
async function tgPatient(method, data, tries = 4) {
  for (let attempt = 0; ; attempt++) {
    try { return await tg(method, data); }
    catch (error) {
      if (error.status === 429 && attempt < tries) { await sleep((error.retryAfter || 1) * 1000 + 250); continue; }
      throw error;
    }
  }
}

async function downloadFile(fileId, maxBytes = 65536) {
  const file = await tg('getFile', { file_id: fileId });
  if (!file.file_path || (file.file_size && file.file_size > maxBytes)) throw Error('Файл слишком большой');
  const response = await fetch(`https://api.telegram.org/file/bot${config.token}/${file.file_path}`, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw Error('Не удалось скачать файл');
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > maxBytes) throw Error('Файл слишком большой');
  return buffer;
}

const send = (chatId, text, extra = {}) => tg('sendMessage', { chat_id: chatId, text, link_preview_options: { is_disabled: true }, ...extra });
const inline = rows => ({ inline_keyboard: rows.filter(row => row?.length) });
const cb = (text, data) => ({ text, callback_data: data });

module.exports = { tg, tgPatient, downloadFile, send, inline, cb, bot };
},

"src/telegram/bot.js": function (exports, require, module, __filename, __dirname) {
'use strict';

// Long polling и маршрутизация обновлений Telegram.

const config = require('../config');
const db = require('../db');
const { sleep } = require('../util');
const { tg, send, bot } = require('./api');
const start = require('./start');
const admin = require('./admin');
const broadcast = require('./broadcast');
const { soundcloudUrl } = require('../soundcloud');

const polling = new AbortController();

const USER_HELP = 'Отправьте название трека или ссылку SoundCloud, и я открою её в Lo-fi. /start — главное меню.';
const ADMIN_HELP = [
  'Команды администратора:',
  '/admin — панель управления',
  '/stats — статистика',
  '/broadcast — новая рассылка',
  '/user <ID или @username> — карточка пользователя',
  '/lyrics <ссылка> — свой синхронизированный текст',
  '/cancel — отменить ввод',
].join('\n');

async function handleUpdate(update) {
  if (update.my_chat_member) {
    const m = update.my_chat_member;
    if (m.chat?.type === 'private') {
      db.touchUser(m.from, { via: 'none' });
      db.setBlocked(m.from.id, m.new_chat_member?.status === 'kicked');
    }
    return;
  }
  if (update.callback_query) {
    const query = update.callback_query;
    if (query.message?.chat?.type === 'private') db.touchUser(query.from, { via: 'bot' });
    if (db.isBanned(query.from.id)) return tg('answerCallbackQuery', { callback_query_id: query.id }).catch(() => {});
    if ((query.data || '').startsWith('a:')) return admin.onCallback(query);
    return tg('answerCallbackQuery', { callback_query_id: query.id }).catch(() => {});
  }

  const message = update.message;
  if (message?.chat?.type !== 'private' || !message.from || message.from.is_bot) return;
  const uid = String(message.from.id), chatId = message.chat.id;
  const command = (message.text || '').match(/^\/(\w+)(?:@\w+)?(?:\s+([\s\S]*))?$/);
  const name = command?.[1]?.toLowerCase();
  const args = command?.[2]?.trim() || '';

  if (name === 'start') {
    const source = args.match(/^src_([\w-]{1,48})$/)?.[1] || '';
    db.touchUser(message.from, { via: 'bot', started: true, source });
  } else db.touchUser(message.from, { via: 'bot' });
  if (db.isBanned(uid)) return;

  if (name === 'start') return start.sendCard(chatId, { payload: args });
  const isAdmin = db.isAdmin(uid);
  if (name === 'help') return send(chatId, isAdmin ? USER_HELP + '\n\n' + ADMIN_HELP : USER_HELP);
  if (isAdmin && name && await admin.onCommand(message, name, args)) return;
  if (isAdmin && !command && admin.hasPending(uid) && await admin.onInput(message)) return;

  // Обычный текст: открыть поиск или ссылку прямо в Mini App.
  const text = (message.text || '').trim();
  if (!command && text && config.appUrl) {
    const isLink = !!soundcloudUrl(text.split(/\s+/).find(part => soundcloudUrl(part)) || '');
    const query = isLink ? text.split(/\s+/).find(part => soundcloudUrl(part)) : text.slice(0, 200);
    return send(chatId, isLink ? 'Открыть в Lo-fi:' : `Найти «${query}» в Lo-fi:`, {
      reply_markup: { inline_keyboard: [[{ text: isLink ? 'Открыть' : 'Найти', web_app: { url: start.appLink({ q: query }) } }]] },
    });
  }
}

async function runBot() {
  let offset = Math.max(0, Number(db.getSetting('tg_offset', '0')) || 0);
  let ready = false, delay = 1000;
  while (!polling.signal.aborted) {
    try {
      if (!ready) {
        const me = await tg('getMe', {}, { signal: polling.signal });
        Object.assign(bot, { username: me.username, id: String(me.id) });
        await tg('deleteWebhook', { drop_pending_updates: false }, { signal: polling.signal });
        await tg('setMyCommands', { commands: [{ command: 'start', description: 'Открыть Lo-fi' }, { command: 'help', description: 'Помощь' }] }).catch(() => {});
        for (const id of config.owners) {
          await tg('setMyCommands', {
            scope: { type: 'chat', chat_id: Number(id) },
            commands: [
              { command: 'start', description: 'Открыть Lo-fi' }, { command: 'admin', description: 'Панель управления' },
              { command: 'stats', description: 'Статистика' }, { command: 'broadcast', description: 'Новая рассылка' },
              { command: 'help', description: 'Все команды' },
            ],
          }).catch(() => {});
        }
        ready = true;
        console.info('Telegram: @' + me.username);
        broadcast.startScheduler();
      }
      const updates = await tg('getUpdates', { timeout: 25, offset, allowed_updates: ['message', 'callback_query', 'my_chat_member'] },
        { signal: polling.signal, timeout: 35000 });
      delay = 1000;
      for (const update of updates) {
        if (polling.signal.aborted) return;
        try { await handleUpdate(update); }
        catch (error) {
          console.warn('Telegram update:', error.message);
          const from = update.message?.from;
          if (from && db.isAdmin(from.id)) await send(update.message.chat.id, 'Не удалось выполнить действие: ' + (error.description || error.message)).catch(() => {});
        }
        offset = update.update_id + 1;
        db.setSetting('tg_offset', String(offset));
      }
    } catch (error) {
      if (polling.signal.aborted) break;
      console.warn('Telegram:', error.message);
      await sleep(error.retryAfter ? 1000 * error.retryAfter : delay);
      delay = Math.min(delay * 2, 30000);
    }
  }
}

module.exports = { runBot, stopBot: () => polling.abort() };
},

"src/telegram/broadcast.js": function (exports, require, module, __filename, __dirname) {
'use strict';

// Рассылки: копия сообщения администратора (copyMessage сохраняет форматирование и премиум-эмодзи),
// аудитории, отложенный запуск, прогресс, остановка, возобновление после перезапуска и удаление у получателей.

const config = require('../config');
const { sql, now, setBlocked, listAdmins } = require('../db');
const { sleep, html, plural } = require('../util');
const { tg, tgPatient, inline, cb } = require('./api');
const { toButton } = require('./start');

const AUDIENCES = {
  all: 'Все',
  active7: 'Активные за 7 дней',
  active30: 'Активные за 30 дней',
  app: 'Открывали приложение',
  test: 'Только администраторы',
};
const AUDIENCE_ORDER = Object.keys(AUDIENCES);
const BATCH = 20;

const controls = new Map();

function audienceWhere(audience) {
  const base = 'bot_seen_at IS NOT NULL AND blocked = 0 AND banned = 0';
  const day = 864e5;
  if (audience === 'active7') return { where: `${base} AND MAX(COALESCE(app_seen_at, 0), COALESCE(bot_seen_at, 0)) >= ?`, args: [now() - 7 * day] };
  if (audience === 'active30') return { where: `${base} AND MAX(COALESCE(app_seen_at, 0), COALESCE(bot_seen_at, 0)) >= ?`, args: [now() - 30 * day] };
  if (audience === 'app') return { where: `${base} AND app_seen_at IS NOT NULL`, args: [] };
  if (audience === 'test') {
    const ids = [...new Set([...config.owners, ...listAdmins().map(a => a.id)])];
    return { where: `id IN (${ids.map(() => '?').join(',') || "''"})`, args: ids };
  }
  return { where: base, args: [] };
}

function countAudience(audience) {
  const { where, args } = audienceWhere(audience);
  return sql(`SELECT COUNT(*) AS n FROM users WHERE ${where}`).get(...args).n;
}

const get = id => {
  const row = sql('SELECT * FROM broadcasts WHERE id = ?').get(Number(id));
  if (row) row.options = JSON.parse(row.options || '{}');
  return row;
};
const recent = (limit = 10) => sql('SELECT * FROM broadcasts ORDER BY id DESC LIMIT ?').all(limit).map(r => ({ ...r, options: JSON.parse(r.options || '{}') }));
const active = () => sql("SELECT * FROM broadcasts WHERE status IN ('running', 'scheduled') ORDER BY id").all();

function create(draft, adminId, statusChat, statusMessage) {
  const scheduled = draft.options.at && draft.options.at > now() + 30e3 ? draft.options.at : null;
  const info = sql(`INSERT INTO broadcasts (admin_id, source_chat, source_message, options, status, scheduled_at, created_at, total, status_chat, status_message)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(String(adminId), String(draft.chat), draft.message, JSON.stringify(draft.options), scheduled ? 'scheduled' : 'running',
      scheduled, now(), countAudience(draft.options.audience), statusChat ? String(statusChat) : null, statusMessage || null);
  const id = Number(info.lastInsertRowid);
  if (!scheduled) void run(id);
  return id;
}

const bar = (done, total) => {
  const width = 14, filled = total ? Math.round(done / total * width) : width;
  return '▰'.repeat(filled) + '▱'.repeat(width - filled);
};

const fmtTime = ts => {
  const d = new Date(ts + config.tzOffset * 60e3);
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
};

function statusText(b) {
  const done = b.sent + b.failed + b.blocked;
  const state = { running: '⏳ Идёт рассылка', scheduled: '🕒 Запланирована на ' + fmtTime(b.scheduled_at || now()), done: '✅ Рассылка завершена',
    cancelled: '⏹ Рассылка остановлена', draft: 'Черновик' }[b.status] || b.status;
  const lines = [
    `<b>${state}</b> · #${b.id}`,
    '',
    `${bar(done, b.total)} ${b.total ? Math.round(done / b.total * 100) : 100}%`,
    `Доставлено: <b>${b.sent}</b> из ${b.total}`,
    `Заблокировали бота: ${b.blocked}`,
    `Ошибки: ${b.failed}`,
    `Аудитория: ${html(AUDIENCES[b.options.audience] || AUDIENCES.all)}`,
  ];
  if (b.started_at && b.finished_at) {
    const sec = Math.max(1, Math.round((b.finished_at - b.started_at) / 1000));
    lines.push(`Время: ${sec < 90 ? sec + ' с' : Math.round(sec / 60) + ' мин'}`);
  }
  return lines.join('\n');
}

async function updateStatus(b, final = false) {
  if (!b.status_chat || !b.status_message) return;
  const rows = [];
  if (!final && ['running', 'scheduled'].includes(b.status)) rows.push([cb('⏹ Остановить', `a:bh:${b.id}:stop`)]);
  rows.push([cb('Подробнее', `a:bh:${b.id}`), cb('← Рассылки', 'a:bc')]);
  await tg('editMessageText', { chat_id: b.status_chat, message_id: b.status_message, text: statusText(b), parse_mode: 'HTML', reply_markup: inline(rows) })
    .catch(() => {});
}

async function deliverOne(b, chatId) {
  const options = b.options;
  const reply_markup = options.buttons?.length ? { inline_keyboard: options.buttons.map(row => row.map(button => toButton(button))) } : undefined;
  const payload = {
    chat_id: chatId, from_chat_id: b.source_chat, message_id: b.source_message,
    disable_notification: !!options.silent, protect_content: !!options.protect, reply_markup,
  };
  let message;
  try { message = await tgPatient('copyMessage', payload); }
  catch (error) {
    // Telegram отклонил оформление кнопок (премиум-эмодзи/цвет) — повторяем с обычными.
    if (error.status === 400 && reply_markup && /button|emoji|style/i.test(error.description)) {
      message = await tgPatient('copyMessage', { ...payload, reply_markup: { inline_keyboard: options.buttons.map(row => row.map(button => toButton(button, { plain: true }))) } });
    } else throw error;
  }
  if (options.pin) await tg('pinChatMessage', { chat_id: chatId, message_id: message.message_id, disable_notification: true }).catch(() => {});
  return message.message_id;
}

async function run(id) {
  if (controls.has(id)) return;
  const control = { stop: false };
  controls.set(id, control);
  try {
    let b = get(id);
    if (!b || !['running', 'scheduled'].includes(b.status)) return;
    if (b.status === 'scheduled') {
      sql("UPDATE broadcasts SET status = 'running', total = ? WHERE id = ?").run(countAudience(b.options.audience), id);
      b = get(id);
    }
    if (!b.started_at) sql('UPDATE broadcasts SET started_at = ? WHERE id = ?').run(now(), id);
    const { where, args } = audienceWhere(b.options.audience);
    let lastStatus = 0;
    while (!control.stop) {
      const batch = sql(`SELECT id FROM users WHERE ${where} AND id > ? ORDER BY id LIMIT ?`).all(...args, b.cursor, BATCH);
      if (!batch.length) break;
      const started = Date.now();
      const results = await Promise.all(batch.map(async ({ id: chatId }) => {
        try { return { chatId, messageId: await deliverOne(b, chatId) }; }
        catch (error) { return { chatId, error }; }
      }));
      let sent = 0, failed = 0, blocked = 0;
      for (const r of results) {
        if (r.messageId) {
          sent++;
          sql('INSERT OR REPLACE INTO broadcast_messages VALUES (?, ?, ?)').run(id, r.chatId, r.messageId);
        } else if (r.error.status === 403) { blocked++; setBlocked(r.chatId, true); }
        else failed++;
      }
      const cursor = batch.at(-1).id;
      sql('UPDATE broadcasts SET sent = sent + ?, failed = failed + ?, blocked = blocked + ?, cursor = ? WHERE id = ?').run(sent, failed, blocked, cursor, id);
      b = get(id);
      if (Date.now() - lastStatus > 3000) { lastStatus = Date.now(); await updateStatus(b); }
      const spent = Date.now() - started;
      if (spent < 1050) await sleep(1050 - spent);
    }
    sql('UPDATE broadcasts SET status = ?, finished_at = ? WHERE id = ?').run(control.stop ? 'cancelled' : 'done', now(), id);
    await updateStatus(get(id), true);
  } catch (error) {
    console.warn('Рассылка', id + ':', error.message);
    sql("UPDATE broadcasts SET status = 'cancelled', finished_at = ? WHERE id = ?").run(now(), id);
  } finally {
    controls.delete(id);
  }
}

function stop(id) {
  const b = get(id);
  if (!b) return false;
  if (b.status === 'scheduled') {
    sql("UPDATE broadcasts SET status = 'cancelled', finished_at = ? WHERE id = ?").run(now(), id);
    return true;
  }
  const control = controls.get(Number(id));
  if (control) control.stop = true;
  return !!control;
}

async function deleteEverywhere(id, onProgress) {
  const rows = sql('SELECT chat_id, message_id FROM broadcast_messages WHERE broadcast_id = ?').all(Number(id));
  let deleted = 0, failed = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const started = Date.now();
    const results = await Promise.allSettled(rows.slice(i, i + BATCH).map(r => tgPatient('deleteMessage', { chat_id: r.chat_id, message_id: r.message_id })));
    for (const r of results) r.status === 'fulfilled' ? deleted++ : failed++;
    if (onProgress && i % (BATCH * 10) === 0) await onProgress(deleted, rows.length);
    const spent = Date.now() - started;
    if (spent < 1050) await sleep(1050 - spent);
  }
  sql('DELETE FROM broadcast_messages WHERE broadcast_id = ?').run(Number(id));
  return { deleted, failed, total: rows.length };
}

const deliveredCount = id => sql('SELECT COUNT(*) AS n FROM broadcast_messages WHERE broadcast_id = ?').get(Number(id)).n;

/** Каждые 15 секунд запускает наступившие отложенные рассылки. */
function startScheduler() {
  for (const b of active()) if (b.status === 'running') void run(b.id);
  setInterval(() => {
    for (const b of sql("SELECT id FROM broadcasts WHERE status = 'scheduled' AND scheduled_at <= ?").all(now())) void run(b.id);
  }, 15000).unref();
}

/**
 * Разбор кнопок рассылки. Каждая строка — ряд, кнопки в ряду разделены «|».
 * Формат кнопки: «Текст - https://ссылка» или «Текст - app[:wave|search|library]».
 * Премиум-эмодзи в начале текста кнопки становится её иконкой.
 */
function parseButtons(text, entities = []) {
  const rows = [];
  let offset = 0;
  for (const line of text.split('\n')) {
    const row = [];
    let segStart = offset;
    for (const segment of line.split('|')) {
      const start = segStart;
      segStart += segment.length + 1;
      const sep = segment.lastIndexOf(' - ');
      if (sep < 0) throw Error(`Не понял кнопку «${segment.trim()}». Нужен формат «Текст - ссылка».`);
      let label = segment.slice(0, sep);
      const target = segment.slice(sep + 3).trim();
      const emoji = entities.find(e => e.type === 'custom_emoji' && e.offset >= start && e.offset + e.length <= start + sep);
      if (emoji) label = label.slice(0, emoji.offset - start) + label.slice(emoji.offset - start + emoji.length);
      label = label.trim();
      if (!label || label.length > 64) throw Error('Текст кнопки должен быть от 1 до 64 символов.');
      const button = { text: label };
      const app = target.match(/^app(?::(home|wave|search|library))?$/i);
      if (app) Object.assign(button, { kind: 'app', page: (app[1] || 'home').toLowerCase() });
      else {
        const url = normalizeUrl(target);
        if (!url) throw Error(`Ссылка «${target}» не подходит. Нужна https://…, t.me/… или app.`);
        Object.assign(button, { kind: 'url', url });
      }
      if (emoji) button.emoji = emoji.custom_emoji_id;
      row.push(button);
    }
    offset += line.length + 1;
    if (row.length > 8) throw Error('В одном ряду не больше 8 кнопок.');
    if (row.length) rows.push(row);
  }
  if (rows.flat().length > 30) throw Error('Слишком много кнопок.');
  return rows;
}

function normalizeUrl(value) {
  let raw = String(value || '').trim();
  if (/^t\.me\//i.test(raw)) raw = 'https://' + raw;
  if (/^tg:\/\/\w+/i.test(raw)) return raw.slice(0, 512);
  try {
    const url = new URL(raw);
    return ['https:', 'http:'].includes(url.protocol) && url.hostname.includes('.') ? url.href.slice(0, 512) : null;
  } catch { return null; }
}

/** «25.11 20:00», «25.11.2026 20:00», «20:00», «через 30м», «через 2ч», «сейчас». */
function parseWhen(text) {
  const value = text.trim().toLowerCase();
  if (['сейчас', 'now', '0'].includes(value)) return null;
  const rel = value.match(/^через\s+(\d{1,4})\s*(м|мин|минут|ч|час|часа|часов|д|дн|дней|дня)\.?$/);
  if (rel) {
    const n = Number(rel[1]), unit = rel[2][0];
    return now() + n * (unit === 'м' ? 60e3 : unit === 'ч' ? 3600e3 : 864e5);
  }
  const abs = value.match(/^(?:(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?\s+)?(\d{1,2})[:.](\d{2})$/);
  if (!abs) throw Error('Не понял время. Примеры: «25.11 20:00», «20:00», «через 2ч», «сейчас».');
  const shifted = new Date(now() + config.tzOffset * 60e3);
  let year = abs[3] ? Number(abs[3].length === 2 ? '20' + abs[3] : abs[3]) : shifted.getUTCFullYear();
  const month = abs[2] ? Number(abs[2]) - 1 : shifted.getUTCMonth();
  const day = abs[1] ? Number(abs[1]) : shifted.getUTCDate();
  let ts = Date.UTC(year, month, day, Number(abs[4]), Number(abs[5])) - config.tzOffset * 60e3;
  if (!abs[1] && ts < now()) ts += 864e5;
  if (abs[1] && !abs[3] && ts < now() - 60e3) { year++; ts = Date.UTC(year, month, day, Number(abs[4]), Number(abs[5])) - config.tzOffset * 60e3; }
  if (!Number.isFinite(ts) || Number(abs[4]) > 23 || Number(abs[5]) > 59) throw Error('Некорректное время.');
  if (ts < now() - 60e3) throw Error('Это время уже прошло.');
  if (ts > now() + 60 * 864e5) throw Error('Можно запланировать не дальше чем на 60 дней.');
  return ts;
}

const summaryLine = b => `#${b.id} · ${fmtTime(b.created_at)} · ${{ done: '✅', running: '⏳', scheduled: '🕒', cancelled: '⏹' }[b.status] || '·'} ${b.sent}/${b.total}`;

module.exports = {
  AUDIENCES, AUDIENCE_ORDER, countAudience, create, get, recent, active, run, stop, deleteEverywhere, deliveredCount,
  startScheduler, parseButtons, parseWhen, normalizeUrl, statusText, fmtTime, summaryLine, plural,
};
},

"src/telegram/start.js": function (exports, require, module, __filename, __dirname) {
'use strict';

// Стартовое сообщение /start: текст с форматированием и премиум-эмодзи, медиа и набор кнопок.

const config = require('../config');
const { readAsset } = require('../assets');
const { getJson, setJson, getSetting, setSetting, deleteSetting } = require('../db');
const { tg } = require('./api');

const PAGES = { home: 'Главная', wave: 'Моя волна', search: 'Поиск', library: 'Медиатека' };
const STYLES = ['', 'primary', 'success', 'danger'];
const STYLE_NAMES = { '': 'обычный', primary: 'синий', success: 'зелёный', danger: 'красный' };

const DEFAULT_CARD = Object.freeze({
  text: 'Lo-fi — музыка под настроение.\n\nВключите «Мою волну»: она подстроится под ваш вкус и не закончится.',
  entities: [],
  media: { type: 'default' },
  buttons: [
    [{ text: 'Открыть Lo-fi', kind: 'app', page: 'home', style: 'primary' }],
    [{ text: 'Моя волна', kind: 'app', page: 'wave' }],
  ],
});

function getCard() {
  const saved = getJson('start_config', null) || {};
  return {
    text: typeof saved.text === 'string' ? saved.text : DEFAULT_CARD.text,
    entities: Array.isArray(saved.entities) ? saved.entities : (typeof saved.text === 'string' ? [] : DEFAULT_CARD.entities),
    media: saved.media?.type ? saved.media : DEFAULT_CARD.media,
    buttons: Array.isArray(saved.buttons) ? saved.buttons : structuredClone(DEFAULT_CARD.buttons),
  };
}
const saveCard = card => setJson('start_config', card);
const resetCard = () => { deleteSetting('start_config'); };

function appLink(params = {}) {
  const url = new URL(config.appUrl + '/');
  for (const [key, value] of Object.entries(params)) if (value) url.searchParams.set(key, value);
  return url.href;
}

/** Сериализует кнопку в InlineKeyboardButton. */
function toButton(button, { payload = {}, plain = false } = {}) {
  const result = { text: String(button.text || 'Открыть').slice(0, 64) };
  if (button.kind === 'url' && button.url) result.url = button.url;
  else result.web_app = { url: appLink({ page: button.page && button.page !== 'home' ? button.page : '', ...payload }) };
  if (!plain) {
    if (button.emoji) result.icon_custom_emoji_id = button.emoji;
    if (STYLES.includes(button.style) && button.style) result.style = button.style;
  }
  return result;
}
const markup = (rows, options) => ({ inline_keyboard: rows.map(row => row.map(b => toButton(b, options))).filter(row => row.length) });

function welcomeFile() {
  for (const name of ['welcome.png', 'welcome.jpg']) {
    const body = readAsset('/media/' + name);
    if (body) return { body, name };
  }
  return null;
}

/** Параметры deep link: /start t_123 — открыть трек, /start w — волну. */
function payloadParams(payload = '') {
  const track = payload.match(/^t_(\d{1,15})$/)?.[1];
  if (track) return { track };
  if (payload === 'w' || payload === 'wave') return { page: 'wave' };
  return {};
}

async function sendCard(chatId, { payload = '', card = getCard() } = {}) {
  const params = payloadParams(payload);
  const attempts = [{}, { plain: true }, { plain: true, noCustomEmoji: true }, { plain: true, noCustomEmoji: true, noMedia: true }];
  let lastError;
  for (const attempt of attempts) {
    try { return await deliver(chatId, card, params, attempt); }
    catch (error) {
      if (error.status !== 400) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

async function deliver(chatId, card, params, { plain = false, noCustomEmoji = false, noMedia = false }) {
  const entities = (card.entities || []).filter(e => !noCustomEmoji || e.type !== 'custom_emoji');
  const reply_markup = card.buttons?.length && config.appUrl ? markup(card.buttons, { payload: params, plain }) : undefined;
  const media = noMedia ? { type: 'none' } : card.media;
  const text = card.text || ' ';

  if (media.type === 'none' || (media.type === 'default' && !welcomeFile())) {
    return tg('sendMessage', { chat_id: chatId, text, entities, reply_markup, link_preview_options: { is_disabled: true } });
  }
  const captionFits = text.length <= 1024;
  const caption = captionFits ? { caption: text, caption_entities: entities } : {};
  const markupOnMedia = captionFits ? { reply_markup } : {};
  let sent;
  if (media.type === 'default') {
    const cached = getSetting('start_default_photo_v3');
    if (cached) sent = await tg('sendPhoto', { chat_id: chatId, photo: cached, ...caption, ...markupOnMedia });
    else {
      const { body, name } = welcomeFile();
      const form = new FormData();
      form.append('chat_id', String(chatId));
      if (captionFits) {
        form.append('caption', text);
        form.append('caption_entities', JSON.stringify(entities));
        if (reply_markup) form.append('reply_markup', JSON.stringify(reply_markup));
      }
      form.append('photo', new Blob([body], { type: name.endsWith('.png') ? 'image/png' : 'image/jpeg' }), name);
      sent = await tg('sendPhoto', form, { timeout: 30000 });
      if (sent?.photo?.length) setSetting('start_default_photo_v3', sent.photo.at(-1).file_id);
    }
  } else {
    const method = { photo: 'sendPhoto', video: 'sendVideo', animation: 'sendAnimation' }[media.type] || 'sendPhoto';
    sent = await tg(method, { chat_id: chatId, [media.type in { photo: 1, video: 1, animation: 1 } ? media.type : 'photo']: media.file_id, ...caption, ...markupOnMedia });
  }
  if (!captionFits) return tg('sendMessage', { chat_id: chatId, text, entities, reply_markup, link_preview_options: { is_disabled: true } });
  return sent;
}

function describeButton(button) {
  const action = button.kind === 'url' ? 'ссылка ' + button.url : 'Mini App → ' + (PAGES[button.page] || PAGES.home);
  return `${button.text} · ${action}${button.emoji ? ' · эмодзи' : ''}${button.style ? ' · ' + STYLE_NAMES[button.style] : ''}`;
}

module.exports = { getCard, saveCard, resetCard, sendCard, markup, toButton, appLink, describeButton, PAGES, STYLES, STYLE_NAMES, DEFAULT_CARD };
},

"src/util.js": function (exports, require, module, __filename, __dirname) {
'use strict';

const config = require('./config');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const lc = value => String(value ?? '').toLocaleLowerCase('ru-RU');
const normQ = value => lc(value).replace(/\s+/g, ' ').trim();
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Ошибка с HTTP-статусом: сервер отдаёт её сообщение клиенту. */
const httpError = (status, message) => Object.assign(Error(message), { status, expose: true });

/** Экранирование для parse_mode HTML в сообщениях бота. */
const html = value => String(value ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

class LRU {
  constructor(max, ttl) { this.max = max; this.ttl = ttl; this.map = new Map(); }
  get(key) {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.exp < Date.now()) { this.map.delete(key); return undefined; }
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }
  set(key, value, ttl = this.ttl) {
    this.map.delete(key);
    this.map.set(key, { value, exp: Date.now() + Math.max(0, ttl) });
    while (this.map.size > this.max) this.map.delete(this.map.keys().next().value);
    return value;
  }
  has(key) { return this.get(key) !== undefined; }
  delete(key) { this.map.delete(key); }
  clear() { this.map.clear(); }
  get size() { return this.map.size; }
}

/** Кеширует промис по ключу; неудачные результаты сразу удаляются из кеша. */
function memo(cache, key, fn, ttl) {
  const hit = cache.get(key);
  if (hit) return hit;
  const promise = Promise.resolve().then(fn);
  cache.set(key, promise, ttl);
  promise.catch(() => { if (cache.get(key) === promise) cache.delete(key); });
  return promise;
}

function statusError(response) {
  return Object.assign(Error('HTTP ' + response.status), { status: response.status });
}

/** fetch с таймаутом и повтором при 429/5xx и сетевых сбоях. */
async function fetchRetry(url, options = {}, tries = 2, timeout = 10000) {
  let error;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: { 'user-agent': config.userAgent, ...options.headers },
        signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(timeout)]) : AbortSignal.timeout(timeout),
      });
      if (response.status !== 429 && response.status < 500) return response;
      error = statusError(response);
      await response.body?.cancel().catch(() => {});
    } catch (cause) {
      error = cause;
      if (options.signal?.aborted) break;
    }
    if (attempt + 1 < tries) await sleep(350 * (attempt + 1));
  }
  throw error;
}

function weightedPick(items, weight) {
  const total = items.reduce((sum, item) => sum + Math.max(0, weight(item)), 0);
  if (!total) return items[Math.floor(Math.random() * items.length)];
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= Math.max(0, weight(item));
    if (roll <= 0) return item;
  }
  return items.at(-1);
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const plural = (n, one, few, many) => {
  const a = Math.abs(n) % 100, b = a % 10;
  return a > 10 && a < 20 ? many : b > 1 && b < 5 ? few : b === 1 ? one : many;
};

const formatBytes = bytes => {
  const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
  let value = bytes, unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
  return (unit ? value.toFixed(value < 10 ? 1 : 0) : value) + ' ' + units[unit];
};

module.exports = { sleep, lc, normQ, clamp, httpError, html, LRU, memo, statusError, fetchRetry, weightedPick, shuffle, plural, formatBytes };
},

"src/wave.js": function (exports, require, module, __filename, __dirname) {
'use strict';

// «Моя волна»: бесконечный персональный поток. Зерна — лайки сессии, избранное и история,
// кандидаты — похожие треки SoundCloud, поиск под занятие и настроение, треки любимых артистов.
// Дальше фильтр (дизлайки, повторы, ускорения) и скоринг с учётом вкуса и характера волны.

const { SC, isPlayable, trackView, trackDupKey, meta, HARD_DERIV_RE, normName } = require('./soundcloud');
const { library } = require('./db');
const { shuffle } = require('./util');

const MOOD_RE = {
  calm: /chill|lo-?fi|ambient|acoustic|soft|sleep|jazz|piano|calm|relax|downtempo|chillhop|chillwave|dream|bossa|спокой|медлен/i,
  energetic: /phonk|drill|trap|edm|house|techno|dnb|drum|bass|rock|hard|workout|hype|rage|dubstep|electro|energ|бодр|gym/i,
  happy: /happy|summer|dance|pop|funk|disco|sunny|feel ?good|groove|tropical|upbeat|летн|весел|солнц/i,
  sad: /sad|melanch|emo|lonely|heartbreak|broken|cry|грус|печал|dark|depress|alone|одинок|slow/i,
};
const OPPOSITE = { calm: 'energetic', energetic: 'calm', happy: 'sad', sad: 'happy' };
// Стоковая и «бесплатная» музыка, сборники битов — не то, что ждут от волны.
const JUNK_RE = /royalty[\s-]*free|no[\s-]*copyright|copyright[\s-]*free|free\s*(?:beat|dl|download|for\s+profit)|stock\s*music|background\s*music|\bncs\b|\bbeats?\s+for\s+|\bhip\s*hop\s+beat\b|\btype\s*beat|instrumental\s+beat|\|\s*p\d|multilingual/i;
const ACTIVITY = {
  wake: { mood: 'happy', query: 'morning chill indie' },
  work: { mood: 'calm', query: 'focus lofi hip hop' },
  workout: { mood: 'energetic', query: 'energetic hip hop' },
  sleep: { mood: 'calm', query: 'sleep ambient piano' },
  drive: { mood: 'energetic', query: 'night drive synthwave' },
};
const MOOD_QUERY = { calm: 'chill lofi hip hop', energetic: 'energetic hip hop', happy: 'feel good indie pop', sad: 'sad indie' };
const COLD = ['lofi hip hop beats', 'chillhop', 'chill indie', 'jazzhop', 'chill r&b'];

const ids = (value, max) => Array.isArray(value) ? [...new Set(value.map(String).filter(id => /^\d{1,15}$/.test(id)))].slice(0, max) : [];
const names = (value, max) => Array.isArray(value) ? value.map(v => String(v).slice(0, 140)).filter(Boolean).slice(0, max) : [];
const refs = (value, max) => Array.isArray(value) ? value.filter(v => v && /^\d{1,15}$/.test(String(v.id))).slice(0, max)
  .map(v => ({ id: String(v.id), artist: String(v.artist || '').slice(0, 140), userId: /^\d{1,15}$/.test(String(v.userId || '')) ? String(v.userId) : '', dur: Number(v.dur) || 0 })) : [];
const MIX_SECONDS = 20 * 60;

function pickWeighted(pool, count) {
  const chosen = [], left = [...pool];
  while (chosen.length < count && left.length) {
    const total = left.reduce((sum, item) => sum + item.w, 0);
    let roll = Math.random() * total, index = 0;
    for (; index < left.length - 1; index++) { roll -= left[index].w; if (roll <= 0) break; }
    chosen.push(left.splice(index, 1)[0]);
  }
  return chosen;
}

function moodOf(track) {
  const text = `${track.genre || ''} ${track.tag_list || ''} ${track.title || ''}`;
  return Object.fromEntries(Object.entries(MOOD_RE).map(([mood, re]) => [mood, re.test(text)]));
}

async function waveBatch(uid, body = {}) {
  const character = ['favorite', 'discover', 'popular'].includes(body.character) ? body.character : 'default';
  const activity = ACTIVITY[body.activity] ? body.activity : '';
  const mood = MOOD_RE[body.mood] ? body.mood : (activity ? ACTIVITY[activity].mood : '');
  const count = Math.min(20, Math.max(4, Number(body.count) || 10));
  const seedId = ids([body.seed], 1)[0] || '';
  const liked = ids(body.liked, 24);
  const played = new Set(ids(body.played, 400));
  const skipped = names(body.skipped, 40).map(normName);
  const taste = body.taste && typeof body.taste === 'object' ? body.taste : {};

  let favorites, recent, dislikes;
  if (uid) {
    favorites = library(uid, 'favorite', 120).map(t => ({ id: t.id, artist: t.artist, userId: t.userId || t.artistId || '', dur: t.dur || 0 }));
    recent = library(uid, 'recent', 60).map(t => ({ id: t.id, artist: t.artist, userId: t.userId || t.artistId || '', dur: t.dur || 0 }));
    dislikes = new Set(library(uid, 'dislike', 1000).map(t => t.id));
  } else {
    favorites = refs(body.favorites, 120);
    recent = refs(body.recent, 60);
    dislikes = new Set(ids(body.dislikes, 1000));
  }
  for (const id of ids(body.dislikes, 1000)) dislikes.add(id);
  for (const item of recent.slice(0, 25)) played.add(item.id);

  const tasteOf = artist => taste[artist] || 'normal';
  const known = new Set([...favorites, ...recent].map(t => normName(t.artist)).filter(Boolean));
  const likedArtists = new Set();

  // ── зерна ──
  const pool = [];
  if (seedId) pool.push({ id: seedId, w: 14 });
  liked.forEach((id, i) => pool.push({ id, w: 7 / (1 + i / 8) }));
  favorites.slice(0, 80).forEach((t, i) => { if (tasteOf(t.artist) !== 'never' && t.dur <= MIX_SECONDS) pool.push({ id: t.id, w: 3 / (1 + i / 15) * (tasteOf(t.artist) === 'often' ? 2 : tasteOf(t.artist) === 'rare' ? .4 : 1) }); });
  recent.slice(0, 40).forEach((t, i) => { if (tasteOf(t.artist) !== 'never' && t.dur <= MIX_SECONDS) pool.push({ id: t.id, w: 2 / (1 + i / 10) }); });
  const unique = [...new Map(pool.map(s => [s.id, s])).values()];
  const seeds = seedId ? [unique[0], ...pickWeighted(unique.slice(1), 2)] : pickWeighted(unique, 4);

  // ── кандидаты ──
  const candidates = new Map();
  const add = (track, hits, from) => {
    if (track?.kind !== 'track') return;
    const entry = candidates.get(track.id) || { track, hits: 0, from: new Set() };
    entry.hits += hits;
    entry.from.add(from);
    candidates.set(track.id, entry);
  };
  const related = await Promise.allSettled(seeds.map(seed => SC.related(seed.id, 25)));
  related.forEach((r, i) => { if (r.status === 'fulfilled') for (const t of r.value) add(t, seeds[i].w > 6 ? 1.6 : 1, 'related'); });

  const anchors = await Promise.allSettled([seedId, ...liked.slice(0, 10)].filter(Boolean).map(id => SC.track(id)));
  for (const r of anchors) if (r.status === 'fulfilled') likedArtists.add(normName(meta(r.value).artist));

  if (character === 'favorite') {
    const artists = [...new Map(favorites.filter(f => f.userId && tasteOf(f.artist) !== 'never').map(f => [f.userId, f])).values()];
    const picks = shuffle(artists).slice(0, 2);
    const lists = await Promise.allSettled(picks.map(a => SC.userTracks(a.userId)));
    for (const r of lists) if (r.status === 'fulfilled') for (const t of shuffle(r.value).slice(0, 12)) add(t, .9, 'artist');
    const favIds = shuffle(favorites).slice(0, 3).map(f => f.id).filter(id => !played.has(id));
    const favTracks = await Promise.allSettled(favIds.map(id => SC.track(id)));
    for (const r of favTracks) if (r.status === 'fulfilled') add(r.value, 1.2, 'favorite');
  }

  const steer = activity ? ACTIVITY[activity].query : mood ? MOOD_QUERY[mood] : '';
  if (steer || candidates.size < 24) {
    const query = steer || COLD[Math.floor(Math.random() * COLD.length)];
    try {
      const list = await SC.searchList('t', query, 60, true);
      for (const t of shuffle(list.items).slice(0, steer && candidates.size >= 24 ? 18 : 40)) add(t, steer ? .7 : .8, 'search');
    } catch { /* остаёмся на похожих */ }
  }

  // ── фильтр и скоринг ──
  // Если волна запущена от ускоренного трека — такие версии не отбрасываем.
  const seedDerivative = !!seedId && anchors[0]?.status === 'fulfilled' && HARD_DERIV_RE.test(String(anchors[0].value.title || '').normalize('NFKC'));
  const rank = () => {
  const dupKeys = new Set();
  const scored = [];
  for (const { track, hits, from } of candidates.values()) {
    const id = String(track.id);
    if (played.has(id) || dislikes.has(id) || !isPlayable(track)) continue;
    const ms = track.full_duration || track.duration || 0;
    if (ms < 50e3 || ms > 15 * 60e3) continue;
    const plainTitle = String(track.title || '').normalize('NFKC');
    if (!seedDerivative && HARD_DERIV_RE.test(plainTitle)) continue;
    if (JUNK_RE.test(plainTitle) || JUNK_RE.test(String(track.user?.username || ''))) continue;
    const { artist } = meta(track);
    const level = tasteOf(artist);
    if (level === 'never') continue;
    const dup = trackDupKey(track);
    if (dupKeys.has(dup)) continue;
    dupKeys.add(dup);
    const artistKey = normName(artist);
    const plays = track.playback_count || 0;
    let score = Math.log2(1 + hits) * 1.4 + Math.random() * 1.1;
    if (level === 'often') score += 1.2;
    if (level === 'rare') score -= 1.2;
    score -= Math.min(3, skipped.filter(s => s === artistKey).length * 1.4);
    if (likedArtists.has(artistKey)) score += .6;
    const isKnown = known.has(artistKey);
    if (character === 'favorite') score += isKnown ? 1 : 0;
    else if (character === 'discover') score += (isKnown ? -1.6 : .5) + (plays < 50000 ? .4 : 0);
    else if (character === 'popular') score += Math.log10(plays + 10) * .35;
    else score += Math.log10(plays + 10) * .1;
    if (mood) {
      const moods = moodOf(track);
      if (moods[mood]) score += 1.3;
      if (moods[OPPOSITE[mood]]) score -= .7;
    }
    if (from.has('favorite')) score -= .3;
    scored.push({ track, score, artistKey });
  }
  return scored.sort((a, b) => b.score - a.score);
  };

  let scored = rank();
  // Похожие оказались миксами, дублями или уже звучали — добираем кандидатов поиском.
  if (scored.length < count * 2) {
    const queries = [steer, COLD[Math.floor(Math.random() * COLD.length)]].filter(Boolean);
    for (const query of queries) {
      try {
        const list = await SC.searchList('t', query, 80, true);
        for (const t of shuffle(list.items).slice(0, 40)) add(t, .6, 'search');
      } catch { /* что есть, то и отдаём */ }
      scored = rank();
      if (scored.length >= count * 2) break;
    }
  }

  const perArtist = new Map(), picked = [];
  for (const item of scored) {
    if (picked.length >= count) break;
    const n = perArtist.get(item.artistKey) || 0;
    if (n >= 2) continue;
    if (picked.at(-1)?.artistKey === item.artistKey) continue;
    perArtist.set(item.artistKey, n + 1);
    picked.push(item);
  }
  if (picked.length < count) {
    for (const item of scored) {
      if (picked.length >= count) break;
      if (!picked.includes(item) && picked.at(-1)?.artistKey !== item.artistKey) picked.push(item);
    }
  }
  return { items: picked.map(p => trackView(p.track)), seeds: seeds.length, mood, character };
}

module.exports = { waveBatch };
}
};

const __cache = Object.create(null);
function __load(id) {
  if (__cache[id]) return __cache[id].exports;
  const factory = __sources[id];
  if (!factory) throw Error('Модуль не найден: ' + id);
  const module = { exports: {} };
  __cache[id] = module;
  const dir = __path.posix.dirname(id);
  const local = spec => {
    if (!spec.startsWith('.')) return require(spec);
    let target = __path.posix.normalize(__path.posix.join(dir, spec));
    if (!target.endsWith('.js')) target += '.js';
    return __load(target);
  };
  factory.call(module.exports, module.exports, local, module, __path.join(__dirname, id), __path.join(__dirname, dir));
  return module.exports;
}

__load('src/main.js').main();
