import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			// Emit a SPA fallback so dynamic routes (e.g. /blog/[slug])
			// are handled client-side instead of causing a static-adapt error.
			pages: 'build',
			assets: 'build',
			fallback: 'index.html'
		})
    }
};

export default config;
