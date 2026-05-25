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
  `https://api.open-meteo.com/v1/forecast?latitude=${londonLatitude}&longitude=${londonLongitude}&current_weather=true&timezone=Europe%2FLondon`
);

const currentWeather = weather.current_weather || {};
const weatherLabel = describeWeatherCode(currentWeather.weathercode);
const weatherBadgeUrl = buildWeatherBadgeUrl('London weather', weatherLabel, formatNumber(currentWeather.temperature));
const profileViewsBadgeUrl = `https://komarev.com/ghpvc/?username=${encodeURIComponent(owner)}&style=flat-square&color=0e75b6`;

const generatedBlock = [
  '### Live profile snapshot',
  '',
  `![Profile views](${profileViewsBadgeUrl})`,
  `![London weather](${weatherBadgeUrl})`,
  '',
  `- Updated: ${new Date().toISOString()}`,
  `- Public repositories: ${user.public_repos}`,
  `- Followers: ${user.followers}`,
  `- Following: ${user.following}`,
  '',
  '### London weather',
  '',
  `- Location: London, UK`,
  `- Condition: ${weatherLabel}`,
  `- Temperature: ${formatNumber(currentWeather.temperature)}°C`,
  `- Wind speed: ${formatNumber(currentWeather.windspeed)} km/h`,
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

function buildWeatherBadgeUrl(label, condition, temperature) {
  const color = getWeatherBadgeColor(condition);
  const badgeLabel = encodeBadgePart(label);
  const badgeValue = encodeBadgePart(`${condition} / ${temperature} C`);
  return `https://img.shields.io/badge/${badgeLabel}-${badgeValue}-${color}?style=for-the-badge&logo=cloudflare&logoColor=white`;
}

function encodeBadgePart(value) {
  return encodeURIComponent(String(value)).replace(/-/g, '%2D');
}

function getWeatherBadgeColor(condition) {
  const normalized = String(condition).toLowerCase();

  if (normalized.includes('clear')) {
    return 'f59e0b';
  }

  if (normalized.includes('cloud')) {
    return '64748b';
  }

  if (normalized.includes('rain') || normalized.includes('drizzle')) {
    return '0284c7';
  }

  if (normalized.includes('thunder')) {
    return '7c3aed';
  }

  if (normalized.includes('snow')) {
    return '38bdf8';
  }

  if (normalized.includes('fog')) {
    return '94a3b8';
  }

  return '0ea5e9';
}

function formatNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(1) : 'n/a';
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