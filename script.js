let isCelsius = true;
let lastLat = null;
let lastLon = null;

// ───────────────────────────────────────────────────────────
//  FETCH HELPERS  (call OUR Vercel API routes, not OWM directly)
// ───────────────────────────────────────────────────────────

async function fetchByCity(city) {
  showLoading();
  try {
    const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "City not found");
    lastLat = data.coord.lat;
    lastLon = data.coord.lon;
    renderCurrent(data);
    fetchForecast(lastLat, lastLon);
  } catch (err) {
    showError(err.message);
  }
}

async function fetchByCoords(lat, lon) {
  showLoading();
  try {
    const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.error || "Could not get weather for this location");
    lastLat = lat;
    lastLon = lon;
    renderCurrent(data);
    fetchForecast(lat, lon);
  } catch (err) {
    showError(err.message);
  }
}

async function fetchForecast(lat, lon) {
  try {
    const res = await fetch(`/api/forecast?lat=${lat}&lon=${lon}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Forecast unavailable");
    renderForecast(data);
  } catch {
    document.getElementById("weeklyGrid").innerHTML =
      '<p style="color:var(--muted);font-size:.85rem">Forecast unavailable</p>';
  }
}

// ───────────────────────────────────────────────────────────
//  RENDER — CURRENT WEATHER
// ───────────────────────────────────────────────────────────

function renderCurrent(d) {
  hideLoading();
  hideError();
  hide("bigEmptyState");
  hide("placeholderState");

  const isDay = d.dt > d.sys.sunrise && d.dt < d.sys.sunset;
  const icon = weatherIcon(d.weather[0].id, isDay);
  const dp = calcDewPoint(d.main.temp, d.main.humidity);

  // Sidebar
  setText("currentCity", d.name);
  setText("currentCountry", d.sys.country);
  setText("mainIcon", icon);
  setText("mainTemp", Math.round(isCelsius ? d.main.temp : toF(d.main.temp)));
  setText("mainUnit", isCelsius ? "C" : "F");
  setText("mainCondition", d.weather[0].description);
  setText("feelsLike", fmtTemp(d.main.feels_like));
  setText("tempMin", fmtTemp(d.main.temp_min));
  setText("tempMax", fmtTemp(d.main.temp_max));
  setText("humidity", `${d.main.humidity}%`);
  setText("wind", fmtWind(d.wind.speed));
  setText("visibility", `${(d.visibility / 1000).toFixed(1)} km`);
  setText("pressure", `${d.main.pressure} hPa`);
  setText("sunrise", unixToTime(d.sys.sunrise, d.timezone));
  setText("sunset", unixToTime(d.sys.sunset, d.timezone));

  show("locationDisplay");
  show("mainWeather");
  show("sidebarStats");

  // Header
  setText("mainCityTitle", `${d.name}, ${d.sys.country}`);
  setText(
    "countryLabel",
    `${d.weather[0].description} · ` +
      new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
  );

  // Detail cards
  setText("d-feelsLike", fmtTemp(d.main.feels_like));
  setText("d-humidity", `${d.main.humidity}%`);
  setWidth("d-humidityBar", d.main.humidity);
  setText("d-wind", fmtWind(d.wind.speed));
  setText("d-windDir", `${degToCompass(d.wind.deg)} (${d.wind.deg}°)`);
  setText("d-visibility", `${(d.visibility / 1000).toFixed(1)} km`);
  setText("d-pressure", `${d.main.pressure} hPa`);
  setText("d-clouds", `${d.clouds.all}%`);
  setWidth("d-cloudsBar", d.clouds.all);
  setText("d-dewPoint", fmtTemp(dp));
  setText("d-coords", `${d.coord.lat.toFixed(4)}°, ${d.coord.lon.toFixed(4)}°`);

  show("weatherContent");
}

// ───────────────────────────────────────────────────────────
//  RENDER — FORECAST (5-day + hourly)
// ───────────────────────────────────────────────────────────

function renderForecast(data) {
  const list = data.list;
  const today = new Date().toDateString();

  // --- HOURLY (first 10 entries ~30 hrs) ---
  const strip = document.getElementById("hourlyStrip");
  strip.innerHTML = "";

  const firstDay = new Date(list[0].dt * 1000).toDateString();
  const hourlyItems = list
    .filter(
      (item) =>
        new Date(item.dt * 1000).toDateString() === today ||
        new Date(item.dt * 1000).toDateString() === firstDay,
    )
    .slice(0, 10);

  hourlyItems.forEach((item, i) => {
    const hour = new Date(item.dt * 1000).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const card = document.createElement("div");
    card.className = `hour-card${i === 0 ? " now" : ""}`;
    card.innerHTML = `
      <div class="hour-time">${i === 0 ? "Now" : hour}</div>
      <div class="hour-icon">${weatherIcon(item.weather[0].id)}</div>
      <div class="hour-temp">${fmtTemp(item.main.temp)}</div>
      ${item.pop > 0 ? `<div class="hour-rain">💧${Math.round(item.pop * 100)}%</div>` : ""}
    `;
    strip.appendChild(card);
  });

  // --- 5-DAY (group by calendar date) ---
  const grid = document.getElementById("weeklyGrid");
  grid.innerHTML = "";

  const days = {};
  list.forEach((item) => {
    const key = new Date(item.dt * 1000).toDateString();
    if (!days[key]) days[key] = [];
    days[key].push(item);
  });

  Object.entries(days)
    .slice(0, 5)
    .forEach(([dayStr, items]) => {
      // pick midday entry for representative condition
      const rep =
        items.find((i) => new Date(i.dt * 1000).getHours() === 12) ||
        items[Math.floor(items.length / 2)];
      const high = Math.max(...items.map((i) => i.main.temp_max));
      const low = Math.min(...items.map((i) => i.main.temp_min));
      const maxPop = Math.max(...items.map((i) => i.pop || 0));
      const dayName = new Date(dayStr).toLocaleDateString("en-GB", {
        weekday: "short",
      });

      const card = document.createElement("div");
      card.className = "day-card";
      card.innerHTML = `
      <div class="day-name">${dayName}</div>
      <div class="day-icon">${weatherIcon(rep.weather[0].id)}</div>
      <div class="day-desc">${rep.weather[0].description}</div>
      <div class="day-high">${fmtTemp(high)}</div>
      <div class="day-low">${fmtTemp(low)}</div>
      ${maxPop > 0 ? `<div class="day-rain">💧${Math.round(maxPop * 100)}%</div>` : ""}
    `;
      grid.appendChild(card);
    });
}

// ───────────────────────────────────────────────────────────
//  EVENTS
// ───────────────────────────────────────────────────────────

// Search form
document.getElementById("searchForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const city = document.getElementById("searchInput").value.trim();
  if (city) {
    fetchByCity(city);
    document.getElementById("searchInput").value = "";
  }
});

// Geolocation
document.getElementById("locationBtn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    showError("Geolocation is not supported by your browser.");
    return;
  }
  showLoading();
  navigator.geolocation.getCurrentPosition(
    (pos) => fetchByCoords(pos.coords.latitude, pos.coords.longitude),
    () => showError("Location access denied. Please search manually."),
  );
});

// °C / °F toggle
document.getElementById("celsiusBtn").addEventListener("click", () => {
  if (isCelsius) return;
  isCelsius = true;
  document.getElementById("celsiusBtn").classList.add("active");
  document.getElementById("fahrenheitBtn").classList.remove("active");
  if (lastLat !== null) fetchByCoords(lastLat, lastLon);
});
document.getElementById("fahrenheitBtn").addEventListener("click", () => {
  if (!isCelsius) return;
  isCelsius = false;
  document.getElementById("fahrenheitBtn").classList.add("active");
  document.getElementById("celsiusBtn").classList.remove("active");
  if (lastLat !== null) fetchByCoords(lastLat, lastLon);
});

// ───────────────────────────────────────────────────────────
//  UI HELPERS
// ───────────────────────────────────────────────────────────

function showLoading() {
  document.getElementById("loading").style.display = "flex";
  hide("errorMsg");
  hide("weatherContent");
  hide("bigEmptyState");
}
function hideLoading() {
  hide("loading");
}

function showError(msg) {
  hideLoading();
  const el = document.getElementById("errorMsg");
  el.textContent = `⚠️ ${msg}`;
  el.style.display = "block";
  show("bigEmptyState");
}
function hideError() {
  hide("errorMsg");
}

function hide(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
}
function show(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "";
}
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
function setWidth(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = pct + "%";
}

// ───────────────────────────────────────────────────────────
//  MATH & FORMATTING
// ───────────────────────────────────────────────────────────

function toF(c) {
  return (c * 9) / 5 + 32;
}
function fmtTemp(c) {
  return isCelsius ? `${Math.round(c)}°C` : `${Math.round(toF(c))}°F`;
}
function fmtWind(ms) {
  return isCelsius
    ? `${(ms * 3.6).toFixed(1)} km/h`
    : `${(ms * 2.237).toFixed(1)} mph`;
}

function degToCompass(deg) {
  const dirs = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  return dirs[Math.round(deg / 22.5) % 16];
}

function calcDewPoint(tempC, humidity) {
  const a = 17.27,
    b = 237.7;
  const alpha = (a * tempC) / (b + tempC) + Math.log(humidity / 100);
  return (b * alpha) / (a - alpha);
}

function unixToTime(unix, tzOffset) {
  return new Date((unix + tzOffset) * 1000).toUTCString().slice(17, 22);
}

function weatherIcon(id, isDay = true) {
  if (id >= 200 && id < 300) return "⛈️";
  if (id >= 300 && id < 400) return "🌦️";
  if (id === 500) return "🌧️";
  if (id >= 501 && id < 600) return "⛈️";
  if (id >= 600 && id < 700) return "❄️";
  if (id >= 700 && id < 800) return "🌫️";
  if (id === 800) return isDay ? "☀️" : "🌙";
  if (id === 801) return "🌤️";
  if (id === 802) return "⛅";
  if (id >= 803) return "☁️";
  return "🌡️";
}

// ───────────────────────────────────────────────────────────
//  INIT
// ───────────────────────────────────────────────────────────

// Set sidebar date
document.getElementById("sidebarDate").textContent =
  new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// Auto-detect location on load
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (pos) => fetchByCoords(pos.coords.latitude, pos.coords.longitude),
    () => {}, // silent — user can search manually
  );
}
