// ============================================================
// WeatherNow - 共通スクリプト
// 全ページで使う関数をここにまとめています
// ============================================================

// ============================================================
// 郵便番号から緯度・経度を取得する関数（HeartRails Geo API）
//
// 【APIとは？】
// URLに情報を送ると、データが返ってくる仕組みです
// 例: URLの末尾に郵便番号を入れると → 住所・緯度・経度が返ってくる
// ============================================================
async function getCoordinates(zipcode) {
  // ハイフンを除去して数字だけにする（例: 543-0001 → 5430001）
  const cleaned = zipcode.replace(/-/g, "");

  // HeartRails Geo APIのURL
  // ?postal= の後ろに郵便番号を入れると住所と緯度経度が返ってくる
  const url = `https://geoapi.heartrails.com/api/json?method=searchByPostal&postal=${cleaned}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.response || !data.response.location || data.response.location.length === 0) {
    throw new Error("入力された郵便番号（" + zipcode + "）は見つかりませんでした");
  }

  const location = data.response.location[0];
  return {
    lat: parseFloat(location.y),
    lng: parseFloat(location.x),
    address: location.prefecture + location.city + location.town,
  };
}

// ============================================================
// 緯度・経度から天気を取得する関数（Open-Meteo API）
//
// 【ポイント】
// URLの中に latitude（緯度）と longitude（経度）を入れると
// その場所の天気データが返ってきます
// ============================================================
async function getWeather(lat, lng) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}` +
    `&longitude=${lng}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,weather_code` +
    `&hourly=temperature_2m,precipitation_probability,weather_code` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max` +
    `&timezone=Asia%2FTokyo` +
    `&forecast_days=7`;

  const response = await fetch(url);
  const data = await response.json();
  return data;
}

// ============================================================
// 検索履歴の管理（ローカルストレージ）
//
// 【ローカルストレージとは？】
// ブラウザにデータを保存できる仕組みです
// ページを閉じても・ブラウザを再起動しても消えません
//
// 使い方は3つだけ：
//   localStorage.setItem("キー", "値")  → 保存する
//   localStorage.getItem("キー")        → 読み込む
//   localStorage.removeItem("キー")     → 削除する
//
// ブラウザの開発者ツール（F12）→ Application → Local Storage
// から実際に保存されているデータを確認できます
// ============================================================

// ローカルストレージから検索履歴を読み込む
function getHistory() {
  const raw = localStorage.getItem("weatherHistory");
  // JSON.parse で文字列をデータに戻す。データがなければ空配列を返す
  return raw ? JSON.parse(raw) : [];
}

// 検索した郵便番号をローカルストレージに保存する
// 同じ郵便番号は重複しないようにして、最大5件まで保存する
function saveHistory(address) {
  const history = getHistory();
  // すでに同じ郵便番号があれば取り除いてから先頭に追加する
  const filtered = history.filter(item => item !== address);
  filtered.unshift(address);
  // JSON.stringify でデータを文字列に変換してから保存する
  // （ローカルストレージは文字列しか保存できないため）
  localStorage.setItem("weatherHistory", JSON.stringify(filtered.slice(0, 5)));
}

// 検索履歴をローカルストレージから削除する
function clearHistory() {
  localStorage.removeItem("weatherHistory");
}

// ============================================================
// お気に入りの管理（ローカルストレージ）
//
// 検索履歴と同じ仕組みで、別のキー名（"weatherFavorites"）で
// ローカルストレージに保存しています
// お気に入りページ（favorites.html）を開いても
// データが残っているのはこの仕組みのおかげです
// ============================================================

// お気に入りをローカルストレージから読み込む
function getFavorites() {
  const raw = localStorage.getItem("weatherFavorites");
  return raw ? JSON.parse(raw) : [];
}

// お気に入りをローカルストレージに保存する（緯度経度・住所名も一緒に保存）
function saveFavorite(locationName, lat, lng) {
  const favorites = getFavorites();
  if (!favorites.find(f => f.name === locationName)) {
    favorites.unshift({ name: locationName, lat, lng });
    localStorage.setItem("weatherFavorites", JSON.stringify(favorites));
  }
}

// お気に入りをローカルストレージから削除する
function removeFavorite(locationName) {
  const favorites = getFavorites().filter(f => f.name !== locationName);
  localStorage.setItem("weatherFavorites", JSON.stringify(favorites));
}

// ============================================================
// 日付・時刻のフォーマット
// ============================================================
function formatDate(date) {
  return `${date.getMonth() + 1}月${date.getDate()}日（${DAYS[date.getDay()]}）`;
}

function formatTime(date) {
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
}

// ============================================================
// 現在地の天気データをセッションに保存・取得
// ============================================================
function saveCurrentWeather(data, locationName) {
  sessionStorage.setItem("currentWeather", JSON.stringify({ data, locationName }));
}

function getCurrentWeather() {
  const raw = sessionStorage.getItem("currentWeather");
  return raw ? JSON.parse(raw) : null;
}

// ------------------------------------------------------------
// 天気コードの定義
// Open-Meteoから返ってくる数字を絵文字と日本語に変換します
// ------------------------------------------------------------
const WEATHER_CODES = {
  0:  { icon: "☀️",  desc: "快晴" },
  1:  { icon: "🌤️", desc: "ほぼ晴れ" },
  2:  { icon: "⛅",  desc: "一部曇り" },
  3:  { icon: "☁️",  desc: "曇り" },
  45: { icon: "🌫️", desc: "霧" },
  48: { icon: "🌫️", desc: "霧氷" },
  51: { icon: "🌦️", desc: "霧雨（弱）" },
  53: { icon: "🌦️", desc: "霧雨" },
  55: { icon: "🌧️", desc: "霧雨（強）" },
  61: { icon: "🌧️", desc: "小雨" },
  63: { icon: "🌧️", desc: "雨" },
  65: { icon: "🌧️", desc: "大雨" },
  71: { icon: "🌨️", desc: "小雪" },
  73: { icon: "🌨️", desc: "雪" },
  75: { icon: "❄️",  desc: "大雪" },
  80: { icon: "🌦️", desc: "にわか雨（弱）" },
  81: { icon: "🌦️", desc: "にわか雨" },
  82: { icon: "⛈️",  desc: "激しいにわか雨" },
  95: { icon: "⛈️",  desc: "雷雨" },
  99: { icon: "⛈️",  desc: "激しい雷雨" },
};

const DAYS = ["日", "月", "火", "水", "木", "金", "土"];

// ------------------------------------------------------------
// 主要都市の座標
// ------------------------------------------------------------
const CITIES = [
  { name: "札幌", lat: 43.0642, lng: 141.3469 },
  { name: "仙台", lat: 38.2688, lng: 140.8721 },
  { name: "東京", lat: 35.6895, lng: 139.6917 },
  { name: "横浜", lat: 35.4437, lng: 139.6380 },
  { name: "名古屋", lat: 35.1815, lng: 136.9066 },
  { name: "大阪", lat: 34.6937, lng: 135.5023 },
  { name: "京都", lat: 35.0116, lng: 135.7681 },
  { name: "神戸", lat: 34.6913, lng: 135.1830 },
  { name: "広島", lat: 34.3853, lng: 132.4553 },
  { name: "福岡", lat: 33.5904, lng: 130.4017 },
  { name: "那覇", lat: 26.2124, lng: 127.6809 },
  { name: "金沢", lat: 36.5944, lng: 136.6256 },
];
