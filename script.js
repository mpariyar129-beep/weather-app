const API_KEY = typeof CONFIG !== 'undefined' ? CONFIG.API_KEY : "YOUR_API_KEY_HERE";
const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";

// DOM Elements
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const locBtn = document.getElementById("current-location-btn");
const initialMsg = document.getElementById("initial-msg");
const weatherAll = document.getElementById("weather-all");

// Hero
const cityNameEl = document.getElementById("city-name");
const tempEl = document.getElementById("temperature");
const descEl = document.getElementById("weather-description");
const minMaxEl = document.getElementById("min-max-temp");

// Hourly
const hourlyScroll = document.getElementById("hourly-scroll");
const hourlySummary = document.getElementById("hourly-summary");

// Forecast
const forecastList = document.getElementById("forecast-list");

// Detail cards
const sunriseEl = document.getElementById("sunrise-time");
const sunsetEl = document.getElementById("sunset-time");
const windSpeedEl = document.getElementById("wind-speed");
const windGustEl = document.getElementById("wind-gust");
const feelsLikeEl = document.getElementById("feels-like");
const feelsLikeDescEl = document.getElementById("feels-like-desc");
const humidityEl = document.getElementById("humidity");
const humidityDescEl = document.getElementById("humidity-desc");
const visibilityEl = document.getElementById("visibility");
const visibilityDescEl = document.getElementById("visibility-desc");
const pressureEl = document.getElementById("pressure");
const pressureDescEl = document.getElementById("pressure-desc");

// ============ EVENT LISTENERS ============
searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (city) fetchWeatherByCity(city);
});

cityInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    const city = cityInput.value.trim();
    if (city) fetchWeatherByCity(city);
  }
});

locBtn.addEventListener("click", () => {
  if (navigator.geolocation) {
    showLoading("Getting your location...");
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
      (err) => {
        const msg = err.code === err.PERMISSION_DENIED
          ? "Geolocation permission denied. Please enable location services."
          : "Unable to retrieve your location.";
        showError(msg);
      }
    );
  } else {
    showError("Geolocation is not supported by your browser.");
  }
});

// ============ API CALLS ============
async function fetchWeatherByCity(city) {
  showLoading("Fetching weather data...");
  try {
    const res = await fetch(`${BASE_URL}?q=${city}&units=metric&appid=${API_KEY}`);
    const data = await res.json();
    if (data.cod !== 200) throw new Error(data.message || "City not found.");
    updateCurrentUI(data);
    fetchForecastByCity(city);
  } catch (err) {
    showError(err.message);
  }
}

async function fetchWeatherByCoords(lat, lon) {
  showLoading("Fetching weather data...");
  try {
    const res = await fetch(`${BASE_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
    const data = await res.json();
    if (data.cod !== 200) throw new Error(data.message || "Location not found.");
    updateCurrentUI(data);
    fetchForecastByCoords(lat, lon);
  } catch (err) {
    showError(err.message);
  }
}

async function fetchForecastByCity(city) {
  try {
    const res = await fetch(`${FORECAST_URL}?q=${city}&units=metric&appid=${API_KEY}`);
    const data = await res.json();
    if (data.cod === "200") renderForecastData(data);
  } catch (err) {
    console.error("Forecast error:", err);
  }
}

async function fetchForecastByCoords(lat, lon) {
  try {
    const res = await fetch(`${FORECAST_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
    const data = await res.json();
    if (data.cod === "200") renderForecastData(data);
  } catch (err) {
    console.error("Forecast error:", err);
  }
}

// ============ RENDER: CURRENT WEATHER ============
function updateCurrentUI(data) {
  initialMsg.classList.add("hidden");
  weatherAll.classList.remove("hidden");

  // Hero
  cityNameEl.textContent = data.name;
  tempEl.textContent = `${Math.round(data.main.temp)}°`;
  descEl.textContent = data.weather[0].description;
  minMaxEl.textContent = `H:${Math.round(data.main.temp_max)}°  L:${Math.round(data.main.temp_min)}°`;

  // Detail cards
  const sunrise = new Date(data.sys.sunrise * 1000);
  const sunset = new Date(data.sys.sunset * 1000);
  sunriseEl.textContent = formatTime(sunrise);
  sunsetEl.textContent = formatTime(sunset);

  const ws = data.wind.speed;
  windSpeedEl.innerHTML = `${ws} <span class="detail-unit">m/s</span>`;
  windGustEl.textContent = data.wind.gust ? data.wind.gust.toFixed(1) : ws.toFixed(1);

  const fl = Math.round(data.main.feels_like);
  feelsLikeEl.textContent = `${fl}°`;
  const diff = fl - Math.round(data.main.temp);
  feelsLikeDescEl.textContent = diff === 0
    ? "Similar to the actual temperature."
    : diff > 0
      ? "Humidity is making it feel warmer."
      : "Wind is making it feel cooler.";

  humidityEl.textContent = `${data.main.humidity}%`;
  const dp = data.main.humidity > 70 ? "High" : data.main.humidity > 40 ? "Comfortable" : "Low";
  humidityDescEl.textContent = `The dew point is ${dp} right now.`;

  const visKm = (data.visibility / 1000).toFixed(1);
  visibilityEl.textContent = `${visKm} km`;
  visibilityDescEl.textContent = data.visibility >= 10000
    ? "Perfectly clear view."
    : data.visibility >= 5000
      ? "Moderate visibility."
      : "Low visibility.";

  pressureEl.innerHTML = `${data.main.pressure} <span class="detail-unit">hPa</span>`;
  pressureDescEl.textContent = data.main.pressure > 1020
    ? "High pressure — fair weather expected."
    : data.main.pressure < 1000
      ? "Low pressure — unsettled weather possible."
      : "Standard atmospheric pressure.";

  cityInput.value = "";
}

// ============ RENDER: FORECAST DATA ============
function renderForecastData(data) {
  renderHourlyStrip(data);
  renderDailyForecast(data);
}

// — Hourly strip (next 8 entries = next 24 hours) —
function renderHourlyStrip(data) {
  hourlyScroll.innerHTML = "";
  const items = data.list.slice(0, 8);

  // Short summary from first item
  const firstDesc = items[0].weather[0].description;
  hourlySummary.textContent = `${capitalize(firstDesc)} expected in the coming hours.`;

  items.forEach((item, idx) => {
    const date = new Date(item.dt * 1000);
    const label = idx === 0 ? "Now" : formatHour(date);
    const iconCode = item.weather[0].icon;
    const temp = Math.round(item.main.temp);

    const el = document.createElement("div");
    el.className = "hourly-item";
    el.innerHTML = `
      <span class="hourly-time">${label}</span>
      <img class="hourly-icon" src="https://openweathermap.org/img/wn/${iconCode}.png" alt="icon">
      <span class="hourly-temp">${temp}°</span>
    `;
    hourlyScroll.appendChild(el);
  });
}

// — Daily forecast (aggregate 3-hour data into daily min/max) —
function renderDailyForecast(data) {
  forecastList.innerHTML = "";

  // Group data by day
  const dayMap = {};
  const today = new Date().toDateString();

  for (const item of data.list) {
    const date = new Date(item.dt * 1000);
    const dayKey = date.toDateString();
    if (dayKey === today) continue; // skip today

    if (!dayMap[dayKey]) {
      dayMap[dayKey] = {
        date,
        temps: [],
        icon: item.weather[0].icon,
        noonItem: null,
      };
    }
    dayMap[dayKey].temps.push(item.main.temp);

    // Prefer icon closest to noon
    const hours = date.getHours();
    if (hours >= 11 && hours <= 15) {
      dayMap[dayKey].icon = item.weather[0].icon;
      dayMap[dayKey].noonItem = item;
    }
  }

  const days = Object.values(dayMap).slice(0, 5);
  if (days.length === 0) return;

  // Global min/max across all forecast days (for the bar range)
  let globalMin = Infinity, globalMax = -Infinity;
  days.forEach(d => {
    const lo = Math.min(...d.temps);
    const hi = Math.max(...d.temps);
    if (lo < globalMin) globalMin = lo;
    if (hi > globalMax) globalMax = hi;
  });
  const range = globalMax - globalMin || 1;

  days.forEach(d => {
    const dayName = d.date.toLocaleDateString('en-US', { weekday: 'short' });
    const lo = Math.round(Math.min(...d.temps));
    const hi = Math.round(Math.max(...d.temps));

    // Position of bar within global range
    const leftPct = ((Math.min(...d.temps) - globalMin) / range) * 100;
    const rightPct = ((globalMax - Math.max(...d.temps)) / range) * 100;

    const row = document.createElement("div");
    row.className = "forecast-row";
    row.innerHTML = `
      <span class="forecast-day">${dayName}</span>
      <img class="forecast-icon" src="https://openweathermap.org/img/wn/${d.icon}.png" alt="icon">
      <span class="forecast-lo">${lo}°</span>
      <div class="forecast-bar-container">
        <div class="forecast-bar" style="left:${leftPct}%;right:${rightPct}%"></div>
      </div>
      <span class="forecast-hi">${hi}°</span>
    `;
    forecastList.appendChild(row);
  });
}

// ============ HELPERS ============
function showLoading(msg) {
  weatherAll.classList.add("hidden");
  initialMsg.classList.remove("hidden", "error-msg");
  initialMsg.textContent = msg;
}

function showError(msg) {
  weatherAll.classList.add("hidden");
  initialMsg.classList.remove("hidden");
  initialMsg.classList.add("error-msg");

  if (msg.includes("Invalid API key") || msg.includes("401")) {
    initialMsg.textContent = "Please set your OpenWeather API key in config.js";
  } else {
    initialMsg.textContent = capitalize(msg);
  }
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatHour(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
