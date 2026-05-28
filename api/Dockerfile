FROM node:22-slim
WORKDIR /app

COPY api/package*.json ./
RUN npm ci --omit=dev

COPY api/server.js ./
COPY dictionary.js ./

EXPOSE 3000
CMD ["node", "server.js"]
