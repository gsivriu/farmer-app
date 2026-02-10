const getWeatherType = (code) => {
  if (code === 0) return "Clear sky";
  if (code === 1 || code === 2 || code === 3) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if (code >= 51 && code <= 67) return "Rain";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 95) return "Storm";
  return "Cloudy";
};

const getWeatherIcon = (code, isDay) => {
  if (code === 0) return isDay ? "☀️" : "🌙";
  if (code >= 1 && code <= 3) return isDay ? "⛅" : "☁️";
  if (code >= 51) return "🌧️";
  if (code >= 71) return "❄️";
  return "☁️";
};

const formatDayName = (dateStr) => {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(date);
};

export const fetchWeather = async (lat, lon) => {
  try {
    const params = [
      `latitude=${lat}`,
      `longitude=${lon}`,
      "current=temperature_2m,weather_code,is_day,wind_speed_10m,wind_direction_10m,relative_humidity_2m,apparent_temperature,surface_pressure,precipitation",
      "hourly=temperature_2m,weather_code,visibility,precipitation_probability,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm,soil_moisture_27_to_81cm",
      "daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max",
      "timezone=auto",
      "forecast_days=10",
    ].join("&");

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params}`
    );
    const data = await response.json();

    const currentHour = new Date().getHours();
    const hourlyData = data.hourly.time
      .map((time, index) => ({
        time,
        temp: Math.round(data.hourly.temperature_2m[index]),
        code: data.hourly.weather_code[index],
        icon: getWeatherIcon(data.hourly.weather_code[index], 1),
      }))
      .slice(currentHour, currentHour + 24);

    const dailyData = data.daily.time.map((time, index) => ({
      date: time,
      day: index === 0 ? "Today" : formatDayName(time),
      min: Math.round(data.daily.temperature_2m_min[index]),
      max: Math.round(data.daily.temperature_2m_max[index]),
      code: data.daily.weather_code[index],
      icon: getWeatherIcon(data.daily.weather_code[index], 1),
      prob: data.daily.precipitation_probability_max[index],
      wind: Math.round(data.daily.wind_speed_10m_max[index] || 0),
    }));

    return {
      temp: Math.round(data.current.temperature_2m),
      code: data.current.weather_code,
      type: getWeatherType(data.current.weather_code),
      isDay: data.current.is_day,
      min: Math.round(data.daily.temperature_2m_min[0]),
      max: Math.round(data.daily.temperature_2m_max[0]),

      feelsLike: Math.round(data.current.apparent_temperature),
      windSpeed: data.current.wind_speed_10m,
      windDir: data.current.wind_direction_10m,
      humidity: data.current.relative_humidity_2m,
      pressure: data.current.surface_pressure,
      precip: data.current.precipitation,
      uvIndex: data.daily.uv_index_max[0],
      sunrise: data.daily.sunrise[0].split("T")[1],
      sunset: data.daily.sunset[0].split("T")[1],
      visibility: data.hourly.visibility[currentHour] / 1000,
      soil: {
        layer10: Math.round(
          (data.hourly.soil_moisture_3_to_9cm[currentHour] || 0) * 100
        ),
        layer30: Math.round(
          (data.hourly.soil_moisture_9_to_27cm[currentHour] || 0) * 100
        ),
        layer100: Math.round(
          (data.hourly.soil_moisture_27_to_81cm[currentHour] || 0) * 100
        ),
      },

      hourly: hourlyData,
      daily: dailyData,
    };
  } catch (error) {
    console.error("Weather error:", error);
    return null;
  }
};

export const searchCity = async (query) => {
  if (!query || query.length < 3) return [];
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        query
      )}&count=5&language=en&format=json`
    );
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    return [];
  }
};
