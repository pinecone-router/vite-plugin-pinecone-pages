import Frontmatter from 'front-matter'
import fg from 'fast-glob'
import { dynamicRouteRE, extensions } from './constants'
import type MarkdownIt from 'markdown-it'

export const tf = (code: string, md: MarkdownIt | undefined) => {
  const fm = Frontmatter(code)
  const html = md!.render(fm.body)

  return {
    code: html,
    attributes: fm.attributes,
  }
}

export async function getPageFiles(path: string) {
  const ext = extensionsToGlob(extensions)
  const files = await fg(`**/*.${ext}`, {
    ignore: ['node_modules', '.git', '**/__*__/**'],
    onlyFiles: true,
    cwd: path,
  })
  return files
}

function extensionsToGlob(extensions: string[]) {
  return extensions.length > 1
    ? `{${extensions.join(',')}}`
    : extensions[0] || ''
}

export const slash = (str: string) => str.replace(/\\/g, '/')

export const isDynamicRoute = (routePath: string) =>
  dynamicRouteRE.test(routePath)

export const isCatchAllRoute = (routePath: string) =>
  /^\[\.{3}/.test(routePath)

export const relativePath = (path: string) =>
  `.${path.match(/(\/src\/pages\/.+)/gi)![0]}`
