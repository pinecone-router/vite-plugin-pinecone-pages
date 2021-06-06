/* eslint-disable no-console */
import { relative } from 'path'
import fs from 'fs'
import { green, dim } from 'chalk'
import { virtualRoutesId, virtualUpdateId } from './constants'
import { generateRoutes } from './generate'
import type { Plugin, ViteDevServer } from 'vite'
import type { Options, Route } from './types'

export default function PineconePages(
  userOptions: Partial<Options>,
): Plugin {
  let generatedRoutes: Route[]
  const options: Options = {
    ...{
      pagesDir: 'src/pages',
      layoutsDir: 'src/layouts/',
      layoutContentString: '<!--content-->',
      viewsDir: 'public/pages/',
      delay: 100,
      MarkdownIt: undefined,
      warppingComponent: '<div x-data="$name">$content</div>',
    },
    ...userOptions,
  }
  let isBuild = false

  return {
    name: 'vite-plugin-pinecone-router',
    enforce: 'pre',
    configResolved(config) {
      isBuild = config.command === 'build' || config.isProduction
    },

    configureServer({ watcher, ws, config: { logger } }: ViteDevServer) {
      const { delay } = options
      const root = process.cwd()
      const paths = [`./${options.pagesDir!}/**/*`, `./${options.layoutsDir!}**/*`]
      const checkReload = (path: string) => {
        if (path.includes(options.pagesDir!) || path.includes(options.layoutsDir!)) {
          setTimeout(() => ws.send({ type: 'custom', event: 'pinecone:reload', data: { path, generatedRoutes } }), delay)
          logger.info(`${green('view reload')} ${dim(relative(root, path))}`, { clear: true, timestamp: true })
        }
      }

      // Unwatch the public views dir to prevent double reloads
      watcher.unwatch(`${options.viewsDir}**/*`)

      // Ensure Vite keeps track of the views files and triggers HMR as needed.
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
        generatedRoutes = await generateRoutes(options)
        const r = JSON.stringify(generatedRoutes)
        return `export const addRoutes = (r = ${r}) => {
          let t = [];
          r.forEach((route) => {
            let template = document.createElement('template');
            template.setAttribute('x-route', route.route);
            if (route.view) template.setAttribute('x-view', route.view);
            if (route.handlers.length) template.setAttribute('x-handler', route.handlers.join(','));
            t.push(template);
          });
          document.querySelector('[x-router]').innerText = '';
          document.querySelector('[x-router]').append(...t);
        }`.replace(/(\n|\s\s)/, '')
      }

      if (id === virtualUpdateId) {
        if (isBuild) return ''
        return `
        import.meta.hot.on('pinecone:reload', async (data) => {
          window.addRoutes(data.generatedRoutes)
          console.log('Pinecone Router Pages: Reloading view!')
          window.PineconeRouter.navigate(window.PineconeRouter.currentContext.path)
        })`.replace(/(\n|\s\s)/, '')
      }
    },

    async handleHotUpdate({ file }) {
      if (
        (file.includes('src/pages') || file.includes('src/layouts'))
      ) {
        setTimeout(async() => generatedRoutes = await generateRoutes(options), options.delay)
        return []
      }
    },
  }
}
