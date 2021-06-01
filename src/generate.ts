import { extensionRE, extensionsRE } from './constants';
import {
	getPageFiles,
	isCatchAllRoute,
	isDynamicRoute,
	relativePath,
	slash,
	tf,
} from './utils';
import Frontmatter from 'front-matter';
import type { FrontMatterResult } from 'front-matter';
import path from 'path';
import { Options } from './types';
import fs from 'fs';
import ts from 'typescript';

export async function generateRoutes(options: Options) {
	let generatedRoutes = [];
	const pageDirPath = slash(path.resolve(options.pagesDir));
	let filesPath = await getPageFiles(pageDirPath);
	let pagesDir = pageDirPath;
	const routes: any[] = [];
	for (const filePath of filesPath) {
		const resolvedPath = filePath.replace(extensionsRE, '');
		const pathNodes = resolvedPath.split('/');
		const fullPath = `/${pagesDir}/${filePath}`;
		const file = {
			name: '',
			path: '',
			fullPath,
			ext: '',
			isHandler: false,
		};
		let parentRoutes = routes;
		for (let i = 0; i < pathNodes.length; i++) {
			const node = pathNodes[i];
			const isDynamic = isDynamicRoute(node);
			const isCatchAll = isCatchAllRoute(node);
			const normalizedName = isDynamic
				? false
					? isCatchAll
						? 'all'
						: node.replace(/^_/, '')
					: node.replace(/^\[(\.{3})?/, '').replace(/\]$/, '')
				: node;
			const normalizedPath = normalizedName.toLowerCase();
			file.name += file.name ? `-${normalizedName}` : normalizedName;
			const parent = parentRoutes.find(
				(node2) => node2.name === file.name
			);
			if (parent) {
				parent.children = parent.children || [];
				parentRoutes = parent.children;
				file.path = '';
			} else if (normalizedName === 'index' && !file.path) {
				file.path += '/';
			} else if (normalizedName !== 'index') {
				if (isDynamic) {
					file.path += `/:${normalizedName}`;
					if (isCatchAll) file.path += '(.*)';
				} else {
					file.path += `/${normalizedPath}`;
				}
			}
		}
		if (file.fullPath.includes('README.md')) continue;
		let ext = extensionRE.exec(file.fullPath);
		file.ext = ext![1];
		if (file.path == '/notfound') file.path = 'notfound';
		file.isHandler = ['js', 'ts'].includes(file.ext);

		let r = {
			name: file.name,
			route: file.path,
			view: <string|undefined>undefined,
			handler:  <string|undefined>undefined,
		};
		let path = relativePath(file.fullPath);

		if (!file.isHandler) {
			let view = file.name + '.html';
			let fm: FrontMatterResult<any> | undefined;
			let frontMatterBody: string = '';
			let html = '';
			if (file.ext == 'html') {
				let source = fs.readFileSync(path, 'utf-8');
				fm = Frontmatter(source);
			} else if (file.ext == 'md') {
				let source = fs.readFileSync(path, 'utf-8');
				fm = Frontmatter(source);
				frontMatterBody = tf(fm.body).code;
			}
			html = fm!.attributes.layout
				? fs
						.readFileSync(
							options.layoutsDir + fm!.attributes.layout + '.html',
							'utf-8'
						)
						.replace(options.layoutContentString, frontMatterBody)
				: frontMatterBody;
			fs.writeFileSync(options.viewsDir + view, html);

			r.view = view;
		} else {
			// let tsModule = null;
			if (file.ext == 'ts') {
				let data = fs.readFileSync(path, 'utf-8');
				let js = ts.transpileModule(data, {
					compilerOptions: {
						module: ts.ModuleKind.ES2015,
					},
				});
				// tsModule =
				// 	'data:text/javascript;base64,' +
				// 	Buffer.from(js.outputText).toString('base64');
				path = path+Date.now().toString()+'tmp.js'
				fs.writeFileSync(path, js.outputText)

			}
			let handlerFunction = (await import(path)).default;
			r.handler = handlerFunction.toString().replace(/\r?\n|\r/g, '');
			if (file.ext == 'ts') fs.rmSync(path);
		}
		let index: number = generatedRoutes.findIndex((e) => e.name == r.name);
		if (index != -1) {
			r = { ...r, ...generatedRoutes[index] };
			generatedRoutes[index] = r;
		} else generatedRoutes.push(r);
	}
	return generatedRoutes;
}
