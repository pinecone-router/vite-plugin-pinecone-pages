export interface Options {
	/**
	 * @default `src/pages`
	 */
	pagesDir: string;
	/**
	 * @default `src/layouts/`
	 */
	layoutsDir: string;
	/**
	 * @default `<!--content-->`
	 */
	layoutContentString: string;
	/**
	 * @default `public/pages/`
	 */
	viewsDir: string;
	/**
	 * @default 100
	 */
	delay: number;
}