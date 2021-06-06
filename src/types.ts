import type MarkdownIt from 'markdown-it'

export interface Options {
  /**
   * @default `src/pages`
   */
  pagesDir: string
  /**
   * @default `src/layouts/`
   */
  layoutsDir: string
  /**
   * @default `<!--content-->`
   */
  layoutContentString: string
  /**
   * @default `public/pages/`
   */
  viewsDir: string
  /**
   * @default 100
   */
  delay: number
  /**
   * @default undefined
   */
  MarkdownIt: MarkdownIt | undefined
  /**
   * @default `<div x-data="$name">$content</div>`
   */
  warppingComponent: string
}

export interface Route {
  name: string
  route: string
  view: string | undefined
  handlers: string[]
  children?: any
  attributes: {[key: string]: any}
}
