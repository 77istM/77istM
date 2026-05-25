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
const repos = await fetchJson(
  `https://api.github.com/users/${owner}/repos?sort=updated&direction=desc&per_page=8&type=owner`
);
const weather = await fetchJson(
  `https://api.open-meteo.com/v1/forecast?latitude=${londonLatitude}&longitude=${londonLongitude}&current_weather=true&timezone=Europe%2FLondon`
);

const topRepos = repos
  .filter((repo) => !repo.fork)
  .slice(0, 5)
  .map((repo) => ({
    name: repo.name,
    description: repo.description || 'No description yet.',
    stars: repo.stargazers_count,
    language: repo.language || 'Mixed',
    url: repo.html_url,
  }));

const currentWeather = weather.current_weather || {};
const weatherLabel = describeWeatherCode(currentWeather.weathercode);

const generatedBlock = [
  '### Live profile snapshot',
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
  '### Recently active repositories',
  '',
  '| Repository | Description | Stars | Language |',
  '| --- | --- | ---: | --- |',
  ...topRepos.map(
    (repo) =>
      `| [${repo.name}](${repo.url}) | ${escapePipes(repo.description)} | ${repo.stars} | ${escapePipes(repo.language)} |`
  ),
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

function escapePipes(value) {
  return String(value).replaceAll('|', '\\|');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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