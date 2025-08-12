# Meteo One (Vanilla JS)

**Live demo:** https://meteo-one-blaszczakdevs-projects.vercel.app/

Meteo One is a modern, mobile-first weather application built with plain **HTML/CSS/JS**.  
It fetches current conditions and an hourly forecast from **WeatherAPI.com**, visualizes data with **Chart.js**, and offers a clean UX focused on the essentials: location, current temperature, min/max, feels-like, UV, astronomy and air quality.

## Features

- City search (e.g., "London") or coordinates (e.g., "51.5,-0.1").
- “Use my location” via browser Geolocation API.
- Last searched location chip (persisted in `localStorage`) for quick recall.
- Current conditions: temperature (rounded), feels-like, min/max (day), UV index, condition text + icon (hi-DPI via `srcset`), dynamic favicon.
- Astronomy: sunrise, sunset, moon phase.
- Air Quality: US EPA index (when available).
- Hourly charts (same day) powered by Chart.js (Temperature vs. Feels-like, UV index).
- Robust error handling (empty input, not found, rate limit, network, invalid API key).
- Mobile-first, dark theme; CSS variables and breakpoint-specific styles.

## Tech Stack

- Vanilla JavaScript ES modules
- Chart.js (via CDN)
- WeatherAPI.com `forecast.json`
- CSS: custom, mobile-first (reset, variables, main + tablet/laptop/desktop overrides)
- Vite (recommended) for local development and environment injection

## Directory Structure

```text
.
├── index.html
├── public/
│   └── css/
│       ├── reset.css
│       ├── variables.css
│       ├── main.css
│       ├── tablet.css         (≥768px)
│       ├── laptop.css         (≥1024px)
│       └── desktop.css        (≥1280px)
└── src/
    ├── apiService.js          # WeatherAPI client + response shaping
    ├── DOMActions.js          # DOM id mapping helper
    └── main.js                # App logic, state, rendering, charts
```

## Environment Variables

The API key is read in `src/apiService.js` from `import.meta.env.VITE_WEATHER_API_KEY`.

Create a file named **`.env.local`** (or `.env`) in the project root and add:

```env
VITE_WEATHER_API_KEY=your_weatherapi_key_here
```

Notes:

- Obtain a free key from your WeatherAPI.com dashboard.
- After editing env files, **restart the dev server** so Vite injects the value.
- This is a client-side app; your key is visible in the browser. Restrict it by domain referrer in your WeatherAPI account.

## Getting Started

Prerequisites: Node.js and npm.

```bash
npm install
npm run dev
```

Build & preview production:

```bash
npm run build
npm run preview
```

Open the printed local URL for dev (e.g., `http://localhost:5173`) or the preview URL after build.

## Usage

- Enter a city name or coordinates and press **Enter** or click **Search**.
- **Use my location** resolves the forecast via geolocation (permission required).
- Click the **last location** chip to quickly re-load your previous successful search.
- Switch charts via the tabs (Temperature / UV).

## License

MIT
