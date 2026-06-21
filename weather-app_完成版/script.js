// ============================================================
// WeatherNow - ホームページ スクリプト
// ============================================================

let currentLocation = "東京都";
let currentWeatherData = null;

// ============================================================
// 天気データを画面に表示する関数
// ============================================================
function displayWeather(data, locationName) {
  currentWeatherData = data;
  currentLocation = locationName;

  const current = data.current;
  const daily = data.daily;
  const weatherInfo = WEATHER_CODES[current.weather_code] || { icon: "🌡️", desc: "不明" };

  document.getElementById("locationName").textContent = locationName;
  document.getElementById("weatherIcon").textContent = weatherInfo.icon;
  document.getElementById("tempMain").textContent = Math.round(current.temperature_2m);
  document.getElementById("weatherDesc").textContent = weatherInfo.desc;
  document.getElementById("feelsLike").textContent = Math.round(current.apparent_temperature) + "°C";
  document.getElementById("humidity").textContent = current.relative_humidity_2m + "%";
  document.getElementById("windSpeed").textContent = current.wind_speed_10m + " m/s";
  document.getElementById("precipitation").textContent = current.precipitation + " mm";

  const now = new Date();
  document.getElementById("locationDate").textContent = formatDate(now);
  document.getElementById("lastUpdated").textContent = `最終更新: ${formatTime(now)}`;

  // 週間予報
  const forecastList = document.getElementById("forecastList");
  forecastList.innerHTML = "";
  for (let i = 0; i < daily.time.length; i++) {
    const date = new Date(daily.time[i]);
    const dayWeather = WEATHER_CODES[daily.weather_code[i]] || { icon: "🌡️" };
    const item = document.createElement("div");
    item.className = "forecast-item";
    item.innerHTML = `
      <div class="forecast-day">${i === 0 ? "今日" : DAYS[date.getDay()]}</div>
      <div class="forecast-icon">${dayWeather.icon}</div>
      <div class="forecast-temp-max">${Math.round(daily.temperature_2m_max[i])}°</div>
      <div class="forecast-temp-min">${Math.round(daily.temperature_2m_min[i])}°</div>
    `;
    forecastList.appendChild(item);
  }

  // セッションに保存（他ページで使う）
  saveCurrentWeather(data, locationName);

  // お気に入りボタンの状態を更新
  updateFavoriteBtn(locationName);
}

// ============================================================
// 検索履歴を画面に表示する
// ============================================================
function renderHistory() {
  const history = getHistory();
  const section = document.getElementById("historySection");
  const list = document.getElementById("historyList");

  if (history.length === 0) {
    section.classList.remove("visible");
    return;
  }

  section.classList.add("visible");
  list.innerHTML = "";

  history.forEach(address => {
    const tag = document.createElement("button");
    tag.className = "history-tag";
    tag.textContent = address;
    tag.addEventListener("click", () => {
      document.getElementById("addressInput").value = address;
      searchWeather(address);
    });
    list.appendChild(tag);
  });
}

// ============================================================
// 郵便番号から天気を検索するメイン処理
// ============================================================
async function searchWeather(zipcode) {
  const errorEl = document.getElementById("errorMessage");
  const weatherSection = document.getElementById("weatherSection");

  errorEl.classList.remove("visible");
  weatherSection.classList.add("loading");

  try {
    const coords = await getCoordinates(zipcode);
    const weatherData = await getWeather(coords.lat, coords.lng);
    displayWeather(weatherData, coords.address);
    saveHistory(zipcode);
    renderHistory();
  } catch (error) {
    errorEl.textContent = "天気の取得に失敗しました";
    errorEl.classList.add("visible");
  } finally {
    weatherSection.classList.remove("loading");
  }
}

// ============================================================
// お気に入りボタン
// ============================================================
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

function updateFavoriteBtn(locationName) {
  const btn = document.getElementById("favoriteBtn");
  const isFavorited = getFavorites().find(f => f.name === locationName);
  if (isFavorited) {
    btn.textContent = "⭐ お気に入り登録済み";
    btn.classList.add("btn-favorited");
    btn.classList.remove("btn-outline");
  } else {
    btn.textContent = "⭐ お気に入りに追加";
    btn.classList.remove("btn-favorited");
    btn.classList.add("btn-outline");
  }
}

document.getElementById("favoriteBtn").addEventListener("click", () => {
  const saved = getCurrentWeather();
  if (saved) {
    saveFavorite(saved.locationName, saved.data.latitude, saved.data.longitude);
    showToast(`⭐ 「${currentLocation}」をお気に入りに追加しました`);
    updateFavoriteBtn(currentLocation);
  }
});

// ============================================================
// 検索ボタン・Enterキー
// ============================================================
document.getElementById("searchBtn").addEventListener("click", () => {
  const address = document.getElementById("addressInput").value.trim();
  if (!address) return;
  searchWeather(address);
});

document.getElementById("addressInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const address = e.target.value.trim();
    if (!address) return;
    searchWeather(address);
  }
});

// 履歴削除
document.getElementById("clearHistoryBtn").addEventListener("click", () => {
  clearHistory();
  renderHistory();
});

// ============================================================
// 初期表示：他ページから遷移してきた場合はそのデータを使う
// なければデフォルトで東京の天気を表示
// ============================================================
async function init() {
  const saved = getCurrentWeather();
  if (saved) {
    displayWeather(saved.data, saved.locationName);
  } else {
    const weatherData = await getWeather(35.6895, 139.6917);
    displayWeather(weatherData, "東京都");
  }
  renderHistory();
}

init();
