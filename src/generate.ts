import path from 'path'
import fs from 'fs'
import Frontmatter from 'front-matter'
import { extensionRE, extensionsRE } from './constants'
import {
	extractHandlers,
  getPageFiles,
  isCatchAllRoute,
  isDynamicRoute,
  relativePath,
  slash,
  tf,
} from './utils'
import { Options } from './types'
import type { FrontMatterResult } from 'front-matter'

export async function generateRoutes(options: Options) {
	const generatedRoutes = []
	const pageDirPath = slash(path.resolve(options.pagesDir))
	const filesPath = await getPageFiles(pageDirPath)
	const pagesDir = pageDirPath
	const routes: any[] = []
  for (const filePath of filesPath) {
		const resolvedPath = filePath.replace(extensionsRE, '')
		const pathNodes = resolvedPath.split('/')
		const fullPath = `/${pagesDir}/${filePath}`
    const file = {
      name: '',
      path: '',
      fullPath,
      ext: '',
		}
		let parentRoutes = routes
    for (let i = 0; i < pathNodes.length; i++) {
			const node = pathNodes[i]
			const isDynamic = isDynamicRoute(node)
			const isCatchAll = isCatchAllRoute(node)
      const normalizedName = isDynamic
        // eslint-disable-next-line no-constant-condition
        ? false
          ? isCatchAll
            ? 'all'
            : node.replace(/^_/, '')
          : node.replace(/^\[(\.{3})?/, '').replace(/\]$/, '')
				: node
			const normalizedPath = normalizedName.toLowerCase()
			file.name += file.name ? `-${normalizedName}` : normalizedName
      const parent = parentRoutes.find(
				node2 => node2.name === file.name,
			)
      if (parent) {
				parent.children = parent.children || []
				parentRoutes = parent.children
				file.path = ''
			}
			else if (normalizedName === 'index' && !file.path) {
				file.path += '/'
			}
			else if (normalizedName !== 'index') {
        if (isDynamic) {
					file.path += `/:${normalizedName}`
					if (isCatchAll) file.path += '(.*)'
        }
				else {
					file.path += `/${normalizedPath}`
        }
      }
		}

		file.ext = extensionRE.exec(file.fullPath)![1]
		if (file.path === '/notfound') file.path = 'notfound'

		let route = {
      name: file.name,
      route: file.path,
			view: <string | undefined>undefined,
			handlers: <string[]>[],
		}

		const path = relativePath(file.fullPath)

		route.view = `${file.name}.html`
		let fm: FrontMatterResult<any> | undefined
		let frontMatterBody = ''

		if (file.ext === 'html') {
			const source = fs.readFileSync(path, 'utf-8')
			fm = Frontmatter(source)
			frontMatterBody = fm.body
    }
		else if (file.ext === 'md') {
			const source = fs.readFileSync(path, 'utf-8')
			fm = Frontmatter(source)
			frontMatterBody = tf(fm.body).code
		}

		let html = ''

		// if the view has a layout, read its FrontMatter0
		if (fm!.attributes.layout) {
			const layoutSource = fs.readFileSync(
				`${options.layoutsDir + fm!.attributes.layout}.html`,
				'utf-8',
      )
			const layoutFm = <FrontMatterResult<any> | undefined>(Frontmatter(layoutSource))

			// if the layout specify handlers, add them
			if (layoutFm!.attributes.handlers) {
				route.handlers.push(
					...extractHandlers(layoutFm!.attributes.handlers),
				)
			}

			html = layoutFm!.body.replace(
				options.layoutContentString,
				frontMatterBody,
			)
		}
		else {
			html = frontMatterBody
    }

		// if the view specify handlers, add them
		// this is after the layout handlers so they have priority.
		if (fm!.attributes.handlers)
			route.handlers.push(...extractHandlers(fm!.attributes.handlers))

		fs.writeFileSync(options.viewsDir + route.view, html)


		generatedRoutes.push(route)
  }
	return generatedRoutes
}
