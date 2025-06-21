FROM node:18-alpine

LABEL org.opencontainers.image.source=https://github.com/kidus-aa/mood-meter-bot
LABEL org.opencontainers.image.description="Mood MeterTwitch Extension Backend"

WORKDIR /app

COPY package.json ./
RUN npm install --production
COPY . .

ENTRYPOINT ["node", "src/server.js"]