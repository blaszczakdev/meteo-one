import { getWeatherByCity, WeatherApiError } from './apiService.js';
import { mapListToDOMElements } from './DOMActions.js';

const LAST_KEY = 'weather_last_v1';

const isCoords = (q) => /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test((q || '').trim());
const normCoords = (q) =>
  isCoords(q)
    ? q
        .split(',')
        .map((n) => Number(n).toFixed(3))
        .join(',')
    : q;
const isMyLocation = (s) => /my location/i.test((s || '').trim());
const deg = (n) => `${Math.round(Number(n))}\u00A0°C`;
const css = () => getComputedStyle(document.documentElement);
const rgba = (rgb, a) => `rgba(${rgb}, ${a})`;

class App {
  constructor() {
    this.view = {};
    this.charts = { temp: null, uv: null };
    this._spinnerDelay = null;
    this.last = this.loadLast();
    this.init();
  }

  init = () => {
    const ids = Array.from(document.querySelectorAll('[id]')).map(
      (el) => el.id
    );
    this.view = mapListToDOMElements(ids);
    this.bind();
    this.paintLastChip();
    this.setChartDefaults();
  };

  bind = () => {
    this.view.searchInput.addEventListener(
      'keydown',
      (e) => e.key === 'Enter' && this.search()
    );
    this.view.searchButton.addEventListener('click', () => this.search());
    this.view.chipUseLocation.addEventListener('click', this.useLocation);
    this.view.lastChip.addEventListener(
      'click',
      () =>
        this.last?.q &&
        ((this.view.searchInput.value = this.last.label),
        this.search(this.last.q))
    );
    this.view.returnToSearchBtn.addEventListener('click', this.back);
    this.view.searchInput.addEventListener('input', this.hideError);
  };

  loadLast = () => {
    try {
      return JSON.parse(localStorage.getItem(LAST_KEY) || 'null');
    } catch {
      return null;
    }
  };
  saveLast = () => {
    try {
      localStorage.setItem(LAST_KEY, JSON.stringify(this.last));
    } catch {}
  };
  setLast = (label, q) => {
    if (label && q) {
      this.last = { label, q: normCoords(q) };
      this.saveLast();
      this.paintLastChip();
    }
  };
  paintLastChip = () => {
    const b = this.view.lastChip;
    if (this.last?.label && this.last?.q) {
      b.textContent = this.last.label;
      b.hidden = false;
    } else b.hidden = true;
  };

  useLocation = () => {
    if (!('geolocation' in navigator))
      return this.showError('Geolocation is not supported by your browser.');
    const btn = this.view.chipUseLocation,
      prev = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Locating…';
    const done = () => {
      btn.disabled = false;
      btn.textContent = prev;
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const q = normCoords(`${pos.coords.latitude},${pos.coords.longitude}`);
        this.view.searchInput.value = 'My location';
        this.search(q);
        done();
      },
      (err) => {
        this.showError(
          err?.code === 1
            ? 'Permission denied. Enable location access.'
            : err?.code === 2
            ? 'Position unavailable.'
            : 'Timed out. Try again.'
        );
        done();
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
    );
  };

  showError = (msg) => {
    if (!this.view.searchError) {
      const p = document.createElement('p');
      p.id = 'searchError';
      p.className = 'error-banner';
      p.setAttribute('role', 'alert');
      p.setAttribute('aria-live', 'polite');
      this.view.weatherSearchView.appendChild(p);
      this.view.searchError = p;
    }
    this.view.searchError.textContent = msg;
    this.view.searchError.style.display = 'block';
  };
  hideError = () => {
    if (this.view.searchError) {
      this.view.searchError.textContent = '';
      this.view.searchError.style.display = 'none';
    }
    this.view.searchInput.style.borderColor = 'black';
  };

  setLoading = (on) => {
    const btn = this.view.searchButton,
      spin = this.view.searchButtonSpinner,
      lab = this.view.searchButtonLabel;
    if (on) {
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      lab.textContent = 'Searching…';
      clearTimeout(this._spinnerDelay);
      this._spinnerDelay = setTimeout(() => (spin.hidden = false), 200);
    } else {
      btn.disabled = false;
      btn.setAttribute('aria-busy', 'false');
      lab.textContent = 'Search';
      clearTimeout(this._spinnerDelay);
      spin.hidden = true;
    }
  };

  search = (qOverride) => {
    const raw = this.view.searchInput.value || '';
    const typed = raw.replace(/\s+/g, ' ').trim();

    let q = null;
    if (typeof qOverride === 'string' && qOverride.trim()) q = qOverride.trim();
    else if (!typed) return this.showError('Type a city name.');
    else if (isMyLocation(typed)) {
      if (this.last?.q) q = this.last.q;
      else return this.showError('No saved location yet.');
    } else if (
      this.last?.label &&
      typed.toLowerCase() === this.last.label.toLowerCase()
    )
      q = this.last.q;
    else q = typed;

    this.hideError();
    this.setLoading(true);
    this.fade();

    getWeatherByCity(q)
      .then((data) => {
        this.render(data);
        const exact = normCoords(`${data.lat},${data.lon}`);
        this.setLast(data.title, exact);
      })
      .catch((err) => {
        this.fade();
        this.view.searchInput.style.borderColor = 'red';
        this.showError(this.msg(err));
      })
      .finally(() => this.setLoading(false));
  };

  msg = (e) =>
    e instanceof WeatherApiError
      ? {
          NOT_FOUND:
            'City not found. Try a different spelling or include country (e.g., "Paris, FR").',
          UNAUTHORIZED: 'Invalid or missing API key.',
          RATE_LIMIT: 'Rate limit reached. Try again later.',
          NETWORK: 'Network error. Check your connection.',
          DATA: 'No forecast data for this location.',
          VALIDATION: 'City name is required.',
        }[e.code] || 'Something went wrong.'
      : 'Something went wrong.';

  back = () => {
    this.fade();
    setTimeout(() => {
      this.toggle();
      this.view.searchInput.value = '';
      this.hideError();
      this.view.searchInput.blur();
      this.fade();
    }, 500);
  };

  fade = () => {
    const el = this.view.mainContainer;
    el.style.opacity = el.style.opacity === '0' ? '1' : '0';
  };
  toggle = () => {
    const s = this.view.weatherSearchView,
      f = this.view.weatherForecastView;
    if (s.style.display !== 'none') {
      s.style.display = 'none';
      f.style.display = 'flex';
    } else {
      f.style.display = 'none';
      s.style.display = 'flex';
    }
  };

  render = (data) => {
    this.toggle();
    this.fade();

    const iconUrl = data.current.iconUrl || '';
    const icon128 = iconUrl ? iconUrl.replace('/64x64/', '/128x128/') : '';
    this.view.weatherIcon.src = icon128 || iconUrl || '';
    if (iconUrl)
      this.view.weatherIcon.srcset = `${iconUrl} 1x, ${icon128 || iconUrl} 2x`;
    else this.view.weatherIcon.removeAttribute('srcset');
    this.view.weatherIcon.sizes = '(min-width: 768px) 144px, 96px';
    this.view.weatherIcon.alt = data.current.conditionText || 'weather icon';

    // favicon
    const fav = document.getElementById('favicon');
    if (fav) {
      fav.type = 'image/png';
      fav.href =
        icon128 ||
        iconUrl ||
        'https://cdn.weatherapi.com/weather/128x128/day/113.png';
    }

    this.view.weatherCity.textContent = data.title;

    this.view.weatherCurrentTempValue.textContent = Math.round(
      Number(data.current.temp)
    );
    this.view.weatherMaxTemp.textContent = deg(data.day.max);
    this.view.weatherMinTemp.textContent = deg(data.day.min);
    this.view.weatherFeelsLike.textContent = deg(data.current.feelsLike);
    this.view.weatherUV.textContent = String(data.current.uv);
    this.view.weatherCondition.textContent = data.current.conditionText || '';

    this.view.sunrise.textContent = `Sunrise: ${data.astro.sunrise || '-'}`;
    this.view.sunset.textContent = `Sunset: ${data.astro.sunset || '-'}`;
    this.view.moonPhase.textContent = `Moon phase: ${
      data.astro.moonPhase || '-'
    }`;
    this.view.aqiIndex.textContent = `Air Quality (US EPA): ${
      data.aqi.usEpaIndex ?? '-'
    }`;

    this.chartsFrom(data.hourly);
  };

  setChartDefaults = () => {
    const t = (css().getPropertyValue('--text') || '#e7eefc').trim();
    const f = (css().getPropertyValue('--font') || '').trim();
    Chart.defaults.color = t;
    if (f) Chart.defaults.font.family = f;
    Chart.defaults.plugins.legend.labels.color = t;
    Chart.defaults.scale = Chart.defaults.scale || {};
    Chart.defaults.scale.ticks = Chart.defaults.scale.ticks || {};
    Chart.defaults.scale.ticks.color = t;
  };

  chartsFrom = (hourly) => {
    if (!Array.isArray(hourly) || hourly.length === 0) return;

    const labels = hourly.map((h) => h.hhmm || '');
    const temps = hourly.map((h) => Math.round(Number(h.temp)));
    const feels = hourly.map((h) => Math.round(Number(h.feelsLike)));
    const uvs = hourly.map((h) => Number(h.uv));

    this.charts.temp?.destroy();
    this.charts.uv?.destroy();

    const s = css();
    const rgbTemp = (
      s.getPropertyValue('--accent-rgb') || '111,178,255'
    ).trim();
    const rgbFeel = (
      s.getPropertyValue('--magenta-rgb') || '255,117,195'
    ).trim();
    const rgbUv = (s.getPropertyValue('--violet-rgb') || '158,123,255').trim();

    const make = (ctx, sets, yFmt) =>
      new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: sets },
        options: {
          responsive: true,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              display: true,
              labels: { usePointStyle: true, boxWidth: 14, boxHeight: 10 },
            },
          },
          scales: {
            x: {
              grid: { color: 'rgba(255,255,255,.06)' },
              ticks: { color: 'rgba(255,255,255,.7)' },
            },
            y: {
              grid: { color: 'rgba(255,255,255,.06)' },
              ticks: { color: 'rgba(255,255,255,.7)', callback: yFmt },
            },
          },
        },
      });

    this.charts.temp = make(
      document.getElementById('tempChart').getContext('2d'),
      [
        {
          label: 'Temp (°C)',
          data: temps,
          tension: 0.25,
          borderWidth: 2,
          fill: true,
          pointStyle: 'rectRounded',
          borderColor: rgba(rgbTemp, 0.95),
          backgroundColor: rgba(rgbTemp, 0.14),
          pointBackgroundColor: rgba(rgbTemp, 1),
          pointBorderColor: rgba(rgbTemp, 1),
          pointRadius: 3,
          pointHoverRadius: 4,
        },
        {
          label: 'Feels like (°C)',
          data: feels,
          tension: 0.25,
          borderWidth: 2,
          fill: true,
          pointStyle: 'rectRounded',
          borderColor: rgba(rgbFeel, 0.95),
          backgroundColor: rgba(rgbFeel, 0.16),
          pointBackgroundColor: rgba(rgbFeel, 1),
          pointBorderColor: rgba(rgbFeel, 1),
          pointRadius: 3,
          pointHoverRadius: 4,
        },
      ],
      (v) => `${v}°`
    );

    this.charts.uv = make(
      document.getElementById('uvChart').getContext('2d'),
      [
        {
          label: 'UV index',
          data: uvs,
          tension: 0.25,
          borderWidth: 2,
          fill: true,
          pointStyle: 'rectRounded',
          borderColor: rgba(rgbUv, 0.95),
          backgroundColor: rgba(rgbUv, 0.16),
          pointBackgroundColor: rgba(rgbUv, 1),
          pointBorderColor: rgba(rgbUv, 1),
          pointRadius: 3,
          pointHoverRadius: 4,
        },
      ],
      (v) => v
    );
  };
}

document.addEventListener('DOMContentLoaded', () => new App());
