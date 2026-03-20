const API_KEY = "27a7be235d59e2eb6d98cac75958454d"; // MUST REPLACE with actual OpenWeather API key
const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

// DOM Elements
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const locBtn = document.getElementById("current-location-btn");
const initialMsg = document.querySelector(".initial-msg");
const weatherCard = document.getElementById("weather-card");

const cityNameEl = document.getElementById("city-name");
const tempEl = document.getElementById("temperature");
const iconEl = document.getElementById("weather-icon");
const descEl = document.getElementById("weather-description");
const minMaxEl = document.getElementById("min-max-temp");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind-speed");

// Event Listeners for search functionality
searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (city) {
    fetchWeatherByCity(city);
  }
});

cityInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    const city = cityInput.value.trim();
    if (city) fetchWeatherByCity(city);
  }
});

// Event Listener for Geolocation (Current Location Weather)
locBtn.addEventListener("click", () => {
  if (navigator.geolocation) {
    // Show loading state
    showLoading("Getting your location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetchWeatherByCoords(latitude, longitude);
      },
      (error) => {
        let msg = "Unable to retrieve your location.";
        if (error.code === error.PERMISSION_DENIED) {
          msg =
            "Geolocation permission denied. Please enable location services.";
        }
        showError(msg);
      },
    );
  } else {
    showError("Geolocation is not supported by your browser.");
  }
});

// API Calls
async function fetchWeatherByCity(city) {
  showLoading("Fetching weather data...");
  try {
    const res = await fetch(
      `${BASE_URL}?q=${city}&units=metric&appid=${API_KEY}`,
    );
    const data = await res.json();

    if (data.cod !== 200) {
      throw new Error(data.message || "Failed to fetch weather data.");
    }

    updateUI(data);
  } catch (err) {
    showError(`Error: ${err.message}`);
  }
}

async function fetchWeatherByCoords(lat, lon) {
  showLoading("Fetching weather data...");
  try {
    const res = await fetch(
      `${BASE_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`,
    );
    const data = await res.json();

    if (data.cod !== 200) {
      throw new Error(data.message || "Failed to fetch weather data.");
    }

    updateUI(data);
  } catch (err) {
    showError(`Error: ${err.message}`);
  }
}

// UI Update functions
function updateUI(data) {
  // Hide initial message and show weather card
  initialMsg.classList.add("hidden");
  weatherCard.classList.remove("hidden");

  // Re-trigger CSS animation
  weatherCard.style.animation = "none";
  weatherCard.offsetHeight; /* trigger reflow */
  weatherCard.style.animation = null;

  // Update main current weather details
  cityNameEl.textContent = `${data.name}, ${data.sys.country}`;
  tempEl.textContent = Math.round(data.main.temp);
  descEl.textContent = data.weather[0].description;

  // Setup Weather Icon
  const iconCode = data.weather[0].icon;
  iconEl.src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;

  // Additional Info Container updates
  minMaxEl.textContent = `${Math.round(data.main.temp_min)}° / ${Math.round(data.main.temp_max)}°`;
  humidityEl.textContent = `${data.main.humidity}%`;
  windEl.textContent = `${data.wind.speed} m/s`;

  // Clear input field
  cityInput.value = "";
}

function showLoading(msg) {
  weatherCard.classList.add("hidden");
  initialMsg.classList.remove("hidden");
  initialMsg.classList.remove("error-msg");
  initialMsg.textContent = msg;
}

function showError(msg) {
  weatherCard.classList.add("hidden");
  initialMsg.classList.remove("hidden");
  initialMsg.classList.add("error-msg");

  // Detect typical invalid API key errors
  if (msg.includes("Invalid API key") || msg.includes("401")) {
    initialMsg.textContent =
      "Please set your OpenWeather API key inside script.js (`YOUR_API_KEY`)";
  } else {
    // Capitalize the first letter of error message
    initialMsg.textContent = msg.charAt(0).toUpperCase() + msg.slice(1);
  }
}
