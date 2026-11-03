FROM node:24.19.0-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATA_DIR=/var/lib/mvn
WORKDIR /app
COPY --chown=node:node package.json server.mjs staging.mjs staging-server.mjs lib.mjs commerce.mjs integrations.mjs manage.mjs orders.mjs ./
COPY --chown=node:node public ./public
COPY --chown=node:node data ./data
COPY --chown=node:node deploy/backup.mjs ./deploy/backup.mjs
RUN mkdir -p /var/lib/mvn && chown node:node /var/lib/mvn
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
