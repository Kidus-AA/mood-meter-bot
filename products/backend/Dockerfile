FROM node:24.3.0-alpine

LABEL org.opencontainers.image.source=https://github.com/kidus-aa/mood-meter-bot
LABEL org.opencontainers.image.description="Mood Meter Twitch Extension Backend"

WORKDIR /app

COPY . .
RUN npm install --production

CMD ["node", "src/server.js"]