import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
const require=createRequire(import.meta.url),runtime=process.env.AEC_BUILD_DEPENDENCIES;
const {build}=runtime?require(path.join(runtime,'esbuild')):await import('esbuild');
fs.mkdirSync('.local',{recursive:true});
for(const test of ['check-results','check-storage','check-excel']){
  await build({entryPoints:[`scripts/${test}.ts`],bundle:true,outfile:`.local/${test}.mjs`,platform:'node',format:'esm',target:'es2022'});
  const result=spawnSync(process.execPath,[`.local/${test}.mjs`],{stdio:'inherit'});
  if(result.status!==0)process.exit(result.status||1);
}
if(process.argv.includes('--reference')){
  const at=process.argv.indexOf('--reference');
  const result=spawnSync(process.execPath,['.local/check-excel.mjs','--reference',process.argv[at+1]],{stdio:'inherit'});
  if(result.status!==0)process.exit(result.status||1);
}
const js=fs.readFileSync('docs/app.js','utf8'),html=fs.readFileSync('docs/index.html','utf8');
if(js.includes('/api/results')||js.includes('signin-with-chatgpt'))throw Error('La versió de Pages encara depèn del servidor.');
if(!html.includes('src="./app.js"')||!html.includes('href="./app.css"'))throw Error('Les rutes dels assets han de ser relatives per als subdirectoris de GitHub Pages.');
console.log('PASS: web estàtica sense API, credencials ni dependència de Sites; rutes compatibles amb GitHub Pages.');
