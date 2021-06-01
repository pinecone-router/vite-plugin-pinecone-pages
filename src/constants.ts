export const virtualRoutesId = 'virtual:pinecone-routes';
export const virtualUpdateId = 'virtual:pinecone-update';
 
export const extensions = ['html', 'ts', 'js', 'md'];
export const extensionsRE = new RegExp(`\\.(${extensions.join('|')})$`);
export const extensionRE = /(?:\.([^.]+))?$/;
 
export const dynamicRouteRE = /^\[.+\]$/;
