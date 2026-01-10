import { useEffect, useRef, useState } from "react";
import { fetchWeather, searchCity } from "../services/weatherService";

const STORAGE_COORDS_KEY = "savedWeatherCoords";
const STORAGE_NAME_KEY = "savedWeatherName";

const getWeatherCondition = (code, isDay) => {
  const value = Number(code);
  if (value === 0) return { label: "Cer senin", icon: isDay ? "☀️" : "🌙" };
  if (value >= 1 && value <= 3)
    return { label: value === 3 ? "Înnorat" : "Parțial noros", icon: isDay ? "⛅" : "☁️" };
  if (value === 45 || value === 48) return { label: "Ceață", icon: "🌫️" };
  if ((value >= 51 && value <= 67) || (value >= 80 && value <= 82))
    return { label: "Ploaie", icon: "🌧️" };
  if ((value >= 71 && value <= 77) || (value >= 85 && value <= 86))
    return { label: "Ninsoare", icon: "❄️" };
  if (value >= 95 && value <= 99) return { label: "Furtună", icon: "⛈️" };
  return { label: "Cer senin", icon: isDay ? "☀️" : "🌙" };
};

const WeatherWidget = () => {
  const [weather, setWeather] = useState(null);
  const [locationName, setLocationName] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_NAME_KEY) || "Se localizează...";
    } catch {
      return "Se localizează...";
    }
  });
  const [coords, setCoords] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_COORDS_KEY) || "null");
      if (saved?.lat && saved?.lon) return saved;
    } catch {
      // ignore storage errors
    }
    return { lat: 44.4268, lon: 26.1025 };
  });
  const [isModalOpen, setModalOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const hasSavedCoords = (() => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_COORDS_KEY) || "null");
        return Boolean(saved?.lat && saved?.lon);
      } catch {
        return false;
      }
    })();

    if (hasSavedCoords) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const nextCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setCoords(nextCoords);
          setLocationName("Locația ta");
          try {
            localStorage.setItem(STORAGE_COORDS_KEY, JSON.stringify(nextCoords));
            localStorage.setItem(STORAGE_NAME_KEY, "Locația ta");
          } catch {
            // ignore storage errors
          }
        },
        () => {
          setLocationName("București");
        }
      );
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchWeather(coords.lat, coords.lon);
      if (data) setWeather(data);
    };

    loadData();

    const intervalId = setInterval(loadData, 1800000);

    return () => clearInterval(intervalId);
  }, [coords]);

  useEffect(() => {
    if (!weather) return;
    const isNight = weather.isDay === 0;
    try {
      window.localStorage.setItem("theme", isNight ? "dark" : "light");
    } catch {
      // ignore storage errors
    }
    const root = document.documentElement;
    if (isNight) root.classList.add("theme-dark");
    else root.classList.remove("theme-dark");
    window.dispatchEvent(
      new CustomEvent("weather-theme-change", { detail: { isNight } })
    );
  }, [weather]);

  const handleSearch = async (text) => {
    setSearchQuery(text);
    const results = await searchCity(text);
    setSearchResults(results);
  };

  const selectCity = (city) => {
    const nextCoords = { lat: city.latitude, lon: city.longitude };
    const nextName = city.country ? `${city.name}, ${city.country}` : city.name;

    setWeather(null);
    setCoords(nextCoords);
    setLocationName(nextName);
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);

    try {
      localStorage.setItem(STORAGE_COORDS_KEY, JSON.stringify(nextCoords));
      localStorage.setItem(STORAGE_NAME_KEY, nextName);
    } catch {
      // ignore storage errors
    }
  };

  if (!weather) return <div className="weather-card loading">Se încarcă...</div>;

  const cardTheme = weather.isDay === 0 ? "night" : "day";
  const condition = getWeatherCondition(
    weather.weathercode ?? weather.code,
    weather.isDay !== 0
  );
  const currentRainProb = Math.round(weather.daily?.[0]?.prob || 0);
  const soilLayer10 = Math.round(weather.soil?.layer10 || 0);
  const soilLayer30 = Math.round(weather.soil?.layer30 || 0);
  const soilLayer100 = Math.round(weather.soil?.layer100 || 0);
  const formattedDate = new Intl.DateTimeFormat("ro-RO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <>
      <div
        className={`weather-card ${cardTheme} ${
          weather.type.toLowerCase().includes("ploaie") ? "rain" : ""
        }`}
        onClick={() => setModalOpen(true)}
      >
        <div className="weather-info">
          <div className="weather-primary">
            <span className="weather-icon-main">{condition.icon}</span>
            <div>
              <span className="weather-temp">{weather.temp}°</span>
              <span className="weather-desc">
                {condition.label}
              </span>
            </div>
          </div>
          <div className="weather-details-mini">
            <span className="location-name">{locationName}</span>
            <span className="min-max">
              Min {weather.min}° / Max {weather.max}°
            </span>
            <span className="min-max">
              Vânt: {Math.round(weather.windSpeed || 0)} km/h
            </span>
          </div>
        </div>
        <div className="bg-decor-1"></div>
        <div className="bg-decor-2"></div>
      </div>

      {isModalOpen && (
        <div className="weather-modal-backdrop">
          <div
            className={`weather-modal-content ${cardTheme}`}
            onClick={() => {
              if (showSearch) setShowSearch(false);
            }}
          >
            <div
              className="modal-scroll-body"
              ref={scrollContainerRef}
            >
              {showSearch ? (
                <div
                  className="search-container"
                  onClick={(event) => event.stopPropagation()}
                >
                  <input
                    type="text"
                    className="city-search-input"
                    placeholder="Caută oraș..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    autoFocus
                  />
                  <button className="cancel-search" onClick={() => setShowSearch(false)}>
                    Anulează
                  </button>
                  <div className="search-results">
                    {searchResults.map((city) => (
                      <div
                        key={city.id}
                        className="search-item"
                        onClick={() => selectCity(city)}
                      >
                        <strong>{city.name}</strong> <small>{city.country}</small>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="weather-layout">
                    <div className="location-and-date">
                      <div className="location-header">
                        <button
                          className="location-search"
                          onClick={() => setShowSearch(true)}
                          aria-label="Caută locație"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                            <title>Search</title>
                            <path
                              d="M221.09 64a157.09 157.09 0 10157.09 157.09A157.1 157.1 0 00221.09 64z"
                              fill="none"
                              stroke="currentColor"
                              strokeMiterlimit="10"
                              strokeWidth="32"
                            />
                            <path
                              fill="none"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeMiterlimit="10"
                              strokeWidth="32"
                              d="M338.29 338.29L448 448"
                            />
                          </svg>
                        </button>
                        <h1
                          className="location-and-date__location"
                          onClick={() => setShowSearch(true)}
                        >
                          {locationName}
                        </h1>
                        <button
                          className="modal-close-btn"
                          onClick={() => {
                            setModalOpen(false);
                          }}
                        >
                          ✕
                        </button>
                      </div>
                      <div className="location-and-date__date">{formattedDate}</div>
                    </div>

                    <div className="current-temperature">
                      <div className="current-temperature__icon-container">
                        <span className="current-temperature__icon" aria-hidden>
                          {weatherIcon}
                        </span>
                      </div>
                      <div className="current-temperature__content-container">
                        <div className="current-temperature__value">
                          {weather.temp}°
                        </div>
                        <div className="current-temperature__summary">
                          {weather.type}
                        </div>
                      </div>
                    </div>

                    <div className="summary-grid">
                      <div className="summary-item">
                        <div className="current-stats__value">{weather.max}°</div>
                        <div className="current-stats__label">High</div>
                        <div className="current-stats__value">{weather.min}°</div>
                        <div className="current-stats__label">Low</div>
                      </div>
                      <div className="summary-item">
                        <div className="current-stats__value">
                          {Math.round(weather.windSpeed || 0)} km/h
                        </div>
                        <div className="current-stats__label">Wind</div>
                        <div className="current-stats__value">{currentRainProb}%</div>
                        <div className="current-stats__label">Rain</div>
                      </div>
                      <div className="summary-item">
                        <div className="current-stats__value">{weather.sunrise}</div>
                        <div className="current-stats__label">Sunrise</div>
                        <div className="current-stats__value">{weather.sunset}</div>
                        <div className="current-stats__label">Sunset</div>
                      </div>
                      <div className="summary-item">
                        <div className="current-stats__value">{soilLayer10}%</div>
                        <div className="current-stats__label">Soil moisture</div>
                        <div className="current-stats__label">0-10cm</div>
                      </div>
                      <div className="summary-item">
                        <div className="current-stats__value">{soilLayer30}%</div>
                        <div className="current-stats__label">Soil moisture</div>
                        <div className="current-stats__label">0-30cm</div>
                      </div>
                      <div className="summary-item">
                        <div className="current-stats__value">{soilLayer100}%</div>
                        <div className="current-stats__label">Soil moisture</div>
                        <div className="current-stats__label">0-100cm</div>
                      </div>
                    </div>

                    <div className="weather-by-hour">
                      <h2 className="weather-by-hour__heading">Today's weather</h2>
                      <div className="weather-by-hour__container">
                        {weather.hourly.slice(0, 7).map((hour, idx) => (
                          <div key={idx} className="weather-by-hour__item">
                            <div className="weather-by-hour__hour">
                              {hour.time.split("T")[1].slice(0, 5)}
                            </div>
                            <div className="weather-by-hour__icon" aria-hidden>
                              {hour.icon}
                            </div>
                            <div>{hour.temp}°</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="next-5-days">
                      <h2 className="next-5-days__heading">Next 7 days</h2>
                      <div className="next-5-days__container">
                        {weather.daily.slice(0, 7).map((day, idx) => {
                          const dateLabel = new Intl.DateTimeFormat("ro-RO", {
                            day: "numeric",
                            month: "numeric",
                          }).format(new Date(day.date));
                          return (
                            <div key={idx} className="next-5-days__row">
                              <div className="next-5-days__date">
                                {day.day}
                                <div className="next-5-days__label">{dateLabel}</div>
                              </div>
                              <div className="next-5-days__low">
                                {day.min}°
                                <div className="next-5-days__label">Low</div>
                              </div>
                              <div className="next-5-days__high">
                                {day.max}°
                                <div className="next-5-days__label">High</div>
                              </div>
                              <div className="next-5-days__icon" aria-hidden>
                                {day.icon}
                              </div>
                              <div className="next-5-days__rain">
                                {Math.round(day.prob || 0)}%
                                <div className="next-5-days__label">Rain</div>
                              </div>
                              <div className="next-5-days__wind">
                                {day.wind} km/h
                                <div className="next-5-days__label">Wind</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WeatherWidget;
