const API_KEY = import.meta.env.VITE_WEATHER_API_KEY?.trim();
if (!API_KEY)
  throw new WeatherApiError('Invalid or missing API key.', 'UNAUTHORIZED');
const BASE = 'https://api.weatherapi.com/v1';

class WeatherApiError extends Error {
  constructor(message, code = 'UNKNOWN', details = null) {
    super(message);
    this.name = 'WeatherApiError';
    this.code = code;
    this.details = details;
  }
}

const fetchJson = async (url) => {
  let r;
  try {
    r = await fetch(url);
  } catch (e) {
    throw new WeatherApiError('Network error.', 'NETWORK', e);
  }
  let data;
  try {
    data = await r.json();
  } catch (e) {
    throw new WeatherApiError('Invalid response.', 'PARSE', e);
  }
  return { ok: r.ok, status: r.status, data };
};

export const getWeatherByCity = async (cityOrCoords) => {
  if (!cityOrCoords || typeof cityOrCoords !== 'string') {
    throw new WeatherApiError('City name is required.', 'VALIDATION');
  }

  const url = `${BASE}/forecast.json?key=${API_KEY}&q=${encodeURIComponent(
    cityOrCoords
  )}&days=1&aqi=yes&lang=en`;
  const { ok, status, data } = await fetchJson(url);

  if (!ok || data?.error) {
    const wa = data?.error || {};
    const map = new Map([
      [1006, 'NOT_FOUND'],
      [2006, 'UNAUTHORIZED'],
      [2007, 'UNAUTHORIZED'],
      [2008, 'UNAUTHORIZED'],
    ]);
    const code =
      map.get(wa.code) ||
      (status === 401
        ? 'UNAUTHORIZED'
        : status === 429
        ? 'RATE_LIMIT'
        : `HTTP_${status}`);
    throw new WeatherApiError(wa.message || `HTTP ${status}`, code, {
      status,
      waCode: wa.code,
    });
  }

  const f = data.forecast?.forecastday?.[0];
  if (!f) throw new WeatherApiError('No forecast data.', 'DATA');

  return {
    title: `${data.location.name}, ${data.location.country}`,
    tzId: data.location.tz_id,
    lat: data.location.lat,
    lon: data.location.lon,
    current: {
      temp: data.current.temp_c,
      feelsLike: data.current.feelslike_c,
      uv: data.current.uv,
      conditionText: data.current.condition?.text || '',
      iconUrl: data.current.condition?.icon
        ? data.current.condition.icon.startsWith('//')
          ? `https:${data.current.condition.icon}`
          : data.current.condition.icon
        : '',
    },
    day: { max: f.day?.maxtemp_c, min: f.day?.mintemp_c, uv: f.day?.uv },
    astro: {
      sunrise: f.astro?.sunrise,
      sunset: f.astro?.sunset,
      moonPhase: f.astro?.moon_phase,
    },
    aqi: { usEpaIndex: data.current?.air_quality?.['us-epa-index'] ?? null },
    hourly: (f.hour || []).map((h) => ({
      time: h.time,
      hhmm: h.time?.split(' ')?.[1] || '',
      temp: h.temp_c,
      feelsLike: h.feelslike_c,
      uv: h.uv,
    })),
  };
};

export { WeatherApiError };
