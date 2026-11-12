import fs from 'node:fs/promises';
import {build} from 'esbuild';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/markdown; charset=utf-8'};
const assets={};for(const file of await fs.readdir(path.join(root,'public'))){const ext=path.extname(file);if(!types[ext])throw Error('Unsupported asset: '+file);assets['/'+file]={type:types[ext],body:await fs.readFile(path.join(root,'public',file),'utf8')};}
await fs.writeFile(path.join(root,'worker/assets.generated.js'),'export default '+JSON.stringify(assets)+';\n');
await fs.mkdir(path.join(root,'dist/server'),{recursive:true});await fs.mkdir(path.join(root,'dist/.openai'),{recursive:true});
await build({entryPoints:[path.join(root,'worker/index.js')],outfile:path.join(root,'dist/server/index.js'),bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true});
await fs.copyFile(path.join(root,'.openai/hosting.json'),path.join(root,'dist/.openai/hosting.json'));
await fs.cp(path.join(root,'drizzle'),path.join(root,'dist/.openai/drizzle'),{recursive:true});
const manifest=JSON.parse(await fs.readFile(path.join(root,'dist/.openai/hosting.json'),'utf8'));
if(manifest.static||manifest.d1!=='DB')throw Error('Worker must declare D1 DB and omit static');
const mod=await import(pathToFileURL(path.join(root,'dist/server/index.js')).href+'?'+Date.now());if(typeof mod.default?.fetch!=='function')throw Error('Worker fetch missing');
console.log('Built Worker with '+Object.keys(assets).length+' embedded assets and D1 migrations.');
