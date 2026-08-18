FROM node:22-slim
WORKDIR /app

COPY api/package*.json ./
RUN npm ci --omit=dev

COPY api/server.js api/valid-words.txt ./
COPY dictionary.js ./

EXPOSE 3000
CMD ["node", "server.js"]
