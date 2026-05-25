import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(repoRoot, '..');
const readmePath = path.join(rootDir, 'README.md');
const owner = process.env.OWNER || process.env.GITHUB_REPOSITORY_OWNER;
const token = process.env.GITHUB_TOKEN;

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

const generatedBlock = [
  '### Live profile snapshot',
  '',
  `- Updated: ${new Date().toISOString()}`,
  `- Public repositories: ${user.public_repos}`,
  `- Followers: ${user.followers}`,
  `- Following: ${user.following}`,
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
  new RegExp(`${startMarker}[\s\S]*${endMarker}`),
  `${startMarker}\n${generatedBlock}\n\n${endMarker}`
);

if (nextReadme !== readme) {
  await writeFile(readmePath, nextReadme);
}

function escapePipes(value) {
  return String(value).replaceAll('|', '\\|');
}