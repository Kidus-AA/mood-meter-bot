# Mood Meter Frontend

This is the frontend for the Mood Meter Twitch extension, built with React and Vite.

## Structure

- `public/` — All static HTML entry points (`panel.html`, `overlay.html`, `config.html`) and static assets
- `src/panel/` — Twitch panel UI React code
- `src/overlay/` — Overlay UI React code
- `src/config/` — Configuration UI React code
- `src/common/` — Shared code (e.g., socket)
- `src/assets/` — Static assets (images, styles)

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
   - Panel: [http://localhost:5173/panel.html](http://localhost:5173/panel.html)
   - Overlay: [http://localhost:5173/overlay.html](http://localhost:5173/overlay.html)
   - Config: [http://localhost:5173/config.html](http://localhost:5173/config.html)

## Building for Twitch

1. Build the static assets:
   ```bash
   npm run build
   ```
2. Upload the contents of the `dist/` folder to your Twitch Extension assets.

## Environment Variables

- Set `VITE_BACKEND_URL` in a `.env` file to point to your backend API (e.g., `https://mood-meter-b5150035734c.herokuapp.com`).
- Set `VITE_APP_ENV` in a `.env` file to `local` for local development

## Notes

- The panel is designed for a 300px wide Twitch iframe.
- The overlay is designed for a 320x180px overlay.
- For best results, use the latest version of Chrome or Edge.

# Mood Meter Backend

This is the backend for the Mood Meter Twitch extension, built with Node.js and Express.

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
   - The API will be available at [http://localhost:4000](http://localhost:4000)

## Environment Variables

- Create a `.env` file in the root with any required environment variables (e.g., Redis URL, JWT secrets).

## Deployment (Heroku)

1. Make sure you are logged in to the Heroku CLI and have Docker installed.
2. Deploy using the provided script:
   ```bash
   npm run deploy
   ```
   - This will build the Docker image and push it to Heroku.

## Structure

- `src/server.js` — Main server entry point
- `src/config.js` — Configuration
- `src/sentimentEngine.js` — Sentiment analysis logic

## Notes

- The backend is designed to be stateless and scalable.
- All API endpoints are prefixed with `/api`.
