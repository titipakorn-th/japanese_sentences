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
			envPrefix: 'APP_',
			// Ensure native modules are properly built
			deps: {
				// Mark better-sqlite3 as a dependency that uses native code
				nativeNodeModules: ['better-sqlite3']
			}
		}),
		
		// Configure the app to be served from a subdirectory in production
		paths: {
			base: '/jp_sentences',
			relative: false
		},
		
		// Disable CSRF protection completely
		csrf: {
			checkOrigin: false
		}
	}
};

export default config;
