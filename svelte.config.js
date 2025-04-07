import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Using adapter-node for Docker deployment
		adapter: adapter({
			// Custom options for Node adapter
			out: 'build',
			precompress: true,
			envPrefix: 'APP_'
		})
	}
};

export default config;
