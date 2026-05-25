# Self-updating profile README setup

## What this repo now contains

- A profile-style `README.md` with an auto-generated section.
- A GitHub Actions workflow that refreshes the README every 6 hours.
- A static GitHub Pages site under `docs/` for a free project page.

## Step by step

1. Rename or reuse the repository as your profile repo if needed. For a GitHub profile README, the repository must match your GitHub username.
2. Push these files to GitHub.
3. In GitHub, open `Settings` for the repository.
4. Go to `Pages`.
5. Set the source to `Deploy from a branch`.
6. Choose branch `main` and folder `/docs`.
7. Save the setting and wait for GitHub Pages to publish the site.
8. Open the `Actions` tab.
9. Run `Update profile README` once with `workflow_dispatch` to generate the first live README snapshot.
10. After that, GitHub Actions will re-run every 6 hours automatically.

## Optional upgrades

- Add GitHub stats cards or streak cards inside the README.
- Replace the static project page with your own sections and visuals.
- If you want the root `username.github.io` website, create a separate repository named `username.github.io` later.