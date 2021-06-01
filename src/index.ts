import type { Plugin } from 'vite';
import type { Options } from './types';
import { virtualRoutesId, virtualUpdateId } from './constants';
import { generateRoutes } from './generate';

export default function VitePluginMyPlugin(
	options: Options = {
		pagesDir: 'src/pages',
		layoutsDir: 'src/layouts/',
		layoutContentString: '<!--content-->',
		viewsDir: 'public/pages/',
	}
): Plugin {
	var generatedRoutes: {
		name: string;
		route: string;
		view: string | undefined;
		handler: string | undefined;
	}[];

	let shouldSkip = false;

	return {
		name: 'vite-plugin-pinecone-router',
		enforce: 'pre',

		configResolved(config) {
			shouldSkip = config.command === 'build' || config.isProduction;
		},

		transform(code, id) {
			return code;
		},
		resolveId(id) {
			if (id === virtualRoutesId) {
				return virtualRoutesId;
			}
			if (id === virtualUpdateId) {
				return virtualUpdateId;
			}
		},
		async load(id) {
			if (id === virtualRoutesId) {
				if (!generatedRoutes) {
					generatedRoutes = await generateRoutes(options);
					let r = JSON.stringify(generatedRoutes);
					return `
					export const addRoutes = () => {
						const r = ${r};
						let t = [];
						r.forEach((route) => {
							let template = document.createElement('template');
							template.setAttribute('x-route', route.route);
							if (route.view) template.setAttribute('x-view', route.view);
							if (route.handler) template.setAttribute('x-handler', route.handler);
							t.push(template);
						});
						document.querySelector('[x-router]').append(...t);
					};
					`;
				}
			}
			if (id === virtualUpdateId) {
				if (shouldSkip) return '';
				return `
				if (import.meta.hot) {
					import.meta.hot.accept(newModule => {
						console.log(newModule)
					})
				}`;
				return `
				const socketProtocol = location.protocol === 'https:' ? 'wss' : 'ws';
				const socketHost = \`\${location.hostname}:3000\`;
				const socket = new WebSocket(\`\${socketProtocol}://\${socketHost}\`, 'vite-hmr');

				// Listen for messages
				socket.addEventListener('message', async ({ data }) => {
					handleMessage(JSON.parse(data));
					console.log(data)
				});
				
				function reload(payload) {
					if (
						payload.path.includes('/src/pages') ||
						payload.path.includes('/src/layouts')
					) {
						console.log('Rapide: reloading view!')
						window.PineconeRouter.navigate(window.PineconeRouter.currentContext.path);
					}
				}

				async function handleMessage(payload) {
					switch (payload.type) {
						case 'full-reload':
							reload(payload)
						case 'custom':
							reload(payload)
							break;
					}
				}`;
			}
		},
		async handleHotUpdate({ file }) {
			if (
				(file.includes('src/pages') || file.includes('src/layouts')) &&
				generatedRoutes != null
			) {
				generatedRoutes = await generateRoutes(options);
				return [];
			}
			return [];
		},
	};
}
