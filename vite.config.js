import {defineConfig} from 'vite';
// GitHub Pages serves a repository named "forge" at https://USERNAME.github.io/forge/
// `npm run dev` stays at "/". The GitHub workflow also derives this from the repo name, so renaming the repo is safe.
export default defineConfig(({command}) => ({base: command === 'build' ? '/forge/' : '/'}));
