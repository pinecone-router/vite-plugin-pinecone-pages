/* eslint-disable no-console */
import path from 'path'
import fs from 'fs'
import Frontmatter from 'front-matter'
import { extensionRE, extensionsRE } from './constants'
import {
  getPageFiles,
  isCatchAllRoute,
  isDynamicRoute,
  relativePath,
  slash,
  tf,
} from './utils'
import { Options, Route } from './types'
import type { FrontMatterResult } from 'front-matter'

export async function generateRoutes(options: Options) {
  const generatedRoutes: Route[] = []
  const pageDirPath = slash(path.resolve(options.pagesDir))
  const filesPath = await getPageFiles(pageDirPath)
  const pagesDir = pageDirPath
  const routes: Route[] = []
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

    const route: Route = {
      name: file.name,
      route: file.path,
      view: undefined,
      handlers: [],
      attributes: {},
    }

    const path = relativePath(file.fullPath)

    let fm: FrontMatterResult<any>
    let frontMatterBody = ''

    if (file.ext === 'html') {
      const source = fs.readFileSync(path, 'utf-8')
      fm = Frontmatter(source)
      frontMatterBody = fm.body
    }
    else if (options.MarkdownIt !== undefined && file.ext === 'md') {
      const source = fs.readFileSync(path, 'utf-8')
      fm = Frontmatter(source)
      frontMatterBody = fm.body.trim().length ? tf(fm.body, options.MarkdownIt).code : ''
    }

    if (frontMatterBody.length && fm.attributes.wrapInComponent !== undefined) {
      frontMatterBody = options.warppingComponent.replace('$content', frontMatterBody)
      let name = ''
      if (typeof fm.attributes.wrapInComponent === 'string') {
        name = fm.attributes.wrapInComponent
        frontMatterBody = frontMatterBody.replace('$name', `Alpine.component('${name}')()`)
      }
      else { frontMatterBody = frontMatterBody.replace('$name', '') }
    }

    let html = ''

    // if the view has a layout, read its FrontMatter0
    if (fm.attributes.layout) {
      const layoutSource = fs.readFileSync(
        `${options.layoutsDir + fm.attributes.layout}.html`,
        'utf-8',
      )
      const layoutFm = <FrontMatterResult<any> | undefined>(Frontmatter(layoutSource))

      // if the layout specify handlers, add them
      if (layoutFm!.attributes.handlers) {
        route.handlers.push(
          ...layoutFm!.attributes.handlers,
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

    // allow empty views so they'll be used as only handlers
    if (html.trim().length) {
      route.view = `${file.name}.html`
      fs.writeFileSync(options.viewsDir + route.view, html)
    }

    // if the view specify handlers, add them
    // this is after the layout handlers so they have priority.
    if (fm.attributes.handlers)
      route.handlers.push(...fm.attributes.handlers)

    // only register the route if it have handlers or have a view.
    if (route.view !== undefined || route.handlers.length) {
      route.attributes = fm.attributes
      generatedRoutes.push(route)
    }
  }
  return generatedRoutes
}
