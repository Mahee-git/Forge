# Forge — upload from github.com, publish with GitHub Pages

Everything below is done in a web browser. No terminal needed.
Assumes your GitHub repository is named **forge** (any name works; see Troubleshooting).

## A. Firebase console (https://console.firebase.google.com → your project)
1. **Build → Authentication → Get started → Sign-in method**: enable **Email/Password**. Enable **Google** too if you want it (pick a support email).
2. **Build → Firestore Database → Create database** → *Production mode* → choose a location near you (it cannot be changed later; for Bangladesh, `asia-south1` Mumbai is close).
3. **Firestore Database → Rules** tab: delete everything, paste the full contents of `firestore.rules` from this project, press **Publish**.
4. **Authentication → Settings → Authorized domains → Add domain**: `YOUR-GITHUB-USERNAME.github.io`
5. **Project settings (gear) → Your apps → Web app (</>)**: copy the `firebaseConfig` values. Your project's values are already in `src/firebase-config.js`; edit that file only if you switch projects.

## B. GitHub (https://github.com)
1. **New repository** → name: `forge` → Public → Create. (Private repos need a paid plan for Pages.)
2. Unzip this ZIP on your computer. Open the unzipped folder: you should see `package.json`, `index.html`, `src`, `.github` and others. (On Mac press Cmd+Shift+. to show the hidden `.github` folder.)
3. In the new repo choose **uploading an existing file** (or **Add file → Upload files**). Drag in **everything inside** the unzipped folder, not the folder itself. Wait for the upload to finish, then **Commit changes** to `main`.
4. Check that the repo shows `.github/workflows/deploy.yml`. If it is missing (hidden-folder problem): **Add file → Create new file**, type the name `.github/workflows/deploy.yml` (typing the slashes creates the folders), paste the text from the box at the bottom of this README, and commit.
5. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
6. Open the **Actions** tab. The *Deploy Forge to GitHub Pages* run takes about 1–2 minutes. When it shows a green tick, your site is live at `https://YOUR-GITHUB-USERNAME.github.io/forge/`. (If the first run happened before step 5, open that run and press **Re-run all jobs**.)
7. Every later commit on `main` republishes automatically. To edit a file, open it on github.com and press the pencil icon.

## C. First run and blog admin
1. Open your live site → **Account** → register. Everything saved is private to your account.
2. Make yourself admin: in the Firebase console open **Authentication → Users** and copy your **User UID**. Then **Firestore Database → Start collection** → Collection ID `admins` → Document ID = your UID → add any field (for example `ok` = `true`) → Save.
3. Reload Forge → **Account → Admin dashboard**. Nobody can create that `admins` document from the app; the rules forbid it.
4. If you used the old localStorage version in the same browser, Account offers to import those records once.

## Troubleshooting
- **Blank page / 404 after publishing**: Settings → Pages → Source must be *GitHub Actions*; then re-run the workflow.
- **auth/unauthorized-domain**: add `YOUR-GITHUB-USERNAME.github.io` in Authentication → Settings → Authorized domains.
- **Missing or insufficient permissions**: Firestore database not created, or rules not published (step A3).
- **Different repo name**: the workflow detects it automatically. (A repo named `USERNAME.github.io` is served from `/`.)

## Local run (optional)
`npm install` then `npm run dev` (opens at http://localhost:5173/).

## Notes
- Calories, BMI and targets are estimates, not medical advice.
- GitHub Pages serves deep links through `404.html`. That works for visitors but is weaker for search engines than Firebase Hosting or Netlify.

## Workflow text for `.github/workflows/deploy.yml`
```yaml
name: Deploy Forge to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - name: Build
        run: |
          NAME=${GITHUB_REPOSITORY#*/}
          if [[ "$NAME" == *.github.io ]]; then BASE=/; else BASE=/$NAME/; fi
          npx vite build --base=$BASE
          cp dist/index.html dist/404.html
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.d.outputs.page_url }}
    steps:
      - id: d
        uses: actions/deploy-pages@v4
```
