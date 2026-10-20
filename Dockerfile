FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY backend ./backend
COPY frontend ./frontend
COPY database ./database
RUN mkdir -p /app/storage/uploads && chown -R node:node /app/storage
USER node
EXPOSE 3000
CMD ["node", "backend/src/server.js"]
