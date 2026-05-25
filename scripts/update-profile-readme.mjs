import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(repoRoot, '..');
const readmePath = path.join(rootDir, 'README.md');
const owner = process.env.OWNER || process.env.GITHUB_REPOSITORY_OWNER;
const token = process.env.GITHUB_TOKEN;
const londonLatitude = 51.5072;
const londonLongitude = -0.1276;

if (!owner) {
  throw new Error('Missing OWNER or GITHUB_REPOSITORY_OWNER environment variable.');
}

const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'profile-readme-updater',
};

if (token) {
  headers.Authorization = `Bearer ${token}`;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GitHub API request failed for ${url}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

const user = await fetchJson(`https://api.github.com/users/${owner}`);
const weather = await fetchJson(
  `https://api.open-meteo.com/v1/forecast?latitude=${londonLatitude}&longitude=${londonLongitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Europe%2FLondon`
);

const currentWeather = weather.current || {};
const weatherLabel = describeWeatherCode(currentWeather.weather_code);
const profileViewsBadgeUrl = `https://komarev.com/ghpvc/?username=${encodeURIComponent(owner)}&style=flat-square&color=0e75b6`;
const currentTimeLabel = formatLondonTime(weather.current?.time);
const weatherLine = buildWeatherLine(currentWeather, weatherLabel, currentTimeLabel);

const generatedBlock = [
  '### Live profile snapshot',
  '',
  `![Profile views](${profileViewsBadgeUrl})`,
  '',
  '### 🌥️ London (where I\'m living right now)',
  '',
  weatherLine,
  '',
  `- Updated: ${new Date().toISOString()}`,
  `- Public repositories: ${user.public_repos}`,
  `- Followers: ${user.followers}`,
  `- Following: ${user.following}`,
  '',
  '### Focus',
  '',
  '- Keep the README current without manual edits.',
  '- Surface the most recently updated work automatically.',
  '- Keep the project page in GitHub Pages free and static.',
].join('\n');

const startMarker = '<!-- AUTO:START -->';
const endMarker = '<!-- AUTO:END -->';
const readme = await readFile(readmePath, 'utf8');

if (!readme.includes(startMarker) || !readme.includes(endMarker)) {
  throw new Error('README markers were not found.');
}

const nextReadme = readme.replace(
  new RegExp(`${escapeRegExp(startMarker)}[\\s\\S]*${escapeRegExp(endMarker)}`),
  `${startMarker}\n${generatedBlock}\n\n${endMarker}`
);

if (nextReadme !== readme) {
  await writeFile(readmePath, nextReadme);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildWeatherLine(currentWeather, weatherLabel, currentTimeLabel) {
  const icon = getWeatherEmoji(weatherLabel);
  const temperature = formatNumber(currentWeather.temperature_2m);
  const feelsLike = formatNumber(currentWeather.apparent_temperature);
  const humidity = formatInteger(currentWeather.relative_humidity_2m);
  const windSpeed = formatNumber(currentWeather.wind_speed_10m);

  return `${icon} ${temperature}°C (feels ${feelsLike}°C) · ${weatherLabel} · 💧 ${humidity}% · 🍃 ${windSpeed} km/h · 🕘 ${currentTimeLabel}`;
}

function getWeatherEmoji(condition) {
  const normalized = String(condition).toLowerCase();

  if (normalized.includes('clear')) {
    return '🌤️';
  }

  if (normalized.includes('cloud')) {
    return '☁️';
  }

  if (normalized.includes('rain') || normalized.includes('drizzle')) {
    return '🌧️';
  }

  if (normalized.includes('thunder')) {
    return '⛈️';
  }

  if (normalized.includes('snow')) {
    return '🌨️';
  }

  if (normalized.includes('fog')) {
    return '🌫️';
  }

  return '⛅';
}

function formatNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(1) : 'n/a';
}

function formatInteger(value) {
  return Number.isFinite(Number(value)) ? String(Math.round(Number(value))) : 'n/a';
}

function formatLondonTime(timeValue) {
  if (!timeValue) {
    return 'n/a';
  }

  const parsed = new Date(timeValue);
  if (Number.isNaN(parsed.getTime())) {
    return 'n/a';
  }

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  });
  const parts = formatter.formatToParts(parsed);
  const time = parts.filter((part) => part.type === 'hour' || part.type === 'minute' || part.type === 'literal').map((part) => part.value).join('');
  const zone = parts.find((part) => part.type === 'timeZoneName')?.value;

  return zone ? `${time.trim()} ${zone}` : time.trim();
}

function describeWeatherCode(code) {
  const descriptions = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };

  return descriptions[code] || 'Unknown';
}