import Frontmatter from 'front-matter';
import MarkdownIt from 'markdown-it';
import { dynamicRouteRE, extensions } from './constants';
import fg from 'fast-glob';

export const markdownCompiler = () => {
	return MarkdownIt({
		html: true,
		linkify: true,
		typographer: true,
	}).use(require('markdown-it-prism'), require('markdown-it-anchor'));
};

export const tf = (code: string) => {
	const fm = Frontmatter(code);
	const html = markdownCompiler().render(fm.body);

	return {
		code: html,
		attributes: fm.attributes,
	};
};

export function slash(str: string) {
	return str.replace(/\\/g, '/');
}

export async function getPageFiles(path: string) {
	const ext = extensionsToGlob(extensions);
	const files = await fg(`**/*.${ext}`, {
		ignore: ['node_modules', '.git', '**/__*__/**'],
		onlyFiles: true,
		cwd: path,
	});
	return files;
}

function extensionsToGlob(extensions: string[]) {
	return extensions.length > 1
		? `{${extensions.join(',')}}`
		: extensions[0] || '';
}

export function isDynamicRoute(routePath: string) {
	return dynamicRouteRE.test(routePath);
}

export function isCatchAllRoute(routePath: string) {
	return /^\[\.{3}/.test(routePath);
}

export function relativePath(path: string) {
	return '.' + path.match(/(\/src\/pages\/.+)/gi)![0];
}