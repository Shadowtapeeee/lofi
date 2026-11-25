FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080
RUN mkdir -p /app/data && chown node:node /app/data
COPY --chown=node:node bot.js ./bot.js
USER node
EXPOSE 8080
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "bot.js"]
