import { virtualRoutesId, virtualUpdateId } from './constants'
import { generateRoutes } from './generate'
import type { Plugin } from 'vite'
import type { Options } from './types'
import type { PluginOption, ViteDevServer } from 'vite'
import { resolve, relative } from 'path'
import { green, dim } from 'chalk'
import picomatch from 'picomatch'


export default function PineconePages(
	options: Options = {
		pagesDir: 'src/pages',
		layoutsDir: 'src/layouts/',
		layoutContentString: '<!--content-->',
		viewsDir: 'public/pages/',
		delay: 200,
	},
): Plugin {
	let generatedRoutes: {
		name: string
		route: string
		view: string | undefined
	}[]

	let shouldSkip = false

	return {
		name: 'vite-plugin-pinecone-router',
		configResolved(config) {
			shouldSkip = config.command === 'build' || config.isProduction
		},

		configureServer({ watcher, ws, config: { logger } }: ViteDevServer) {
			const { delay } = options
			const root = process.cwd()
			const paths = [options.pagesDir + '/**/*', options.layoutsDir + '**/*', '@iconify/iconify'];
			const shouldReload = picomatch(paths)
			const checkReload = (path: string) => {
				if (shouldReload(path)) {
					setTimeout(() => ws.send({ type: 'custom', event: 'pinecone:reload', data: { path: path } }), delay)
					logger.info(`${green('page reload')} ${dim(relative(root, path))}`, { clear: true, timestamp: true })
				}
			}

			watcher.unwatch([options.viewsDir + '**/*', ...paths])
			// Ensure Vite keeps track of the files and triggers HMR as needed.
			watcher.add(paths)

			// Do a full page reload if any of the watched files changes.
			watcher.on('add', checkReload)
			watcher.on('change', checkReload)
		},

		resolveId(id) {
			if (id === virtualRoutesId) return virtualRoutesId
			if (id === virtualUpdateId) return virtualUpdateId
		},
		async load(id) {
			if (id === virtualRoutesId) {
				if (!generatedRoutes) {
					generatedRoutes = await generateRoutes(options)
					const r = JSON.stringify(generatedRoutes)
					return `
          export const addRoutes = () => {
            const r = ${r};
            let t = [];
            r.forEach((route) => {
              let template = document.createElement('template');
              template.setAttribute('x-route', route.route);
              if (route.view) template.setAttribute('x-view', route.view);
              if (route.handlers.length) template.setAttribute('x-handler', route.handlers.join(','));
              t.push(template);
            });
            document.querySelector('[x-router]').append(...t);
          }`.replace(/(\n|\s\s)/, '')
				}
			}
			if (id === virtualUpdateId) {
				if (shouldSkip) return ''
				return `
				import.meta.hot.on('pinecone:reload', (data) => {
					console.log('Rapide: reloading view!')
					window.PineconeRouter.navigate(window.PineconeRouter.currentContext.path)
				})`.replace(/(\n|\s\s)/, '')
			}
		},
		async handleHotUpdate({ file }) {
			console.log({ file })
			if (
				(file.includes('src/pages') || file.includes('src/layouts'))
			) {
				generatedRoutes = await generateRoutes(options);
				return []
			}
			return []
		},
	}
}
