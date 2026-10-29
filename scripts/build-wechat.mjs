import {readFile,writeFile,mkdir,readdir,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,relative} from 'node:path';
import {spawnSync} from 'node:child_process';
import {checkWechatProject} from './wechat-project.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const destination=resolve(root,'wechat/miniprogram');
const check=process.argv.includes('--check');
await checkWechatProject(resolve(root,'wechat'));
async function emit(path,source){
 const target=resolve(destination,path);
 if(check){const actual=await readFile(target,typeof source==='string'?'utf8':undefined);if(Buffer.isBuffer(source)?!actual.equals(source):actual!==source)throw new Error(`${path} is stale; run npm run build:wechat`);}
 else{await mkdir(dirname(target),{recursive:true});await writeFile(target,source);}
}
function commonJS(source,names){return '// Generated from dist/ by scripts/build-wechat.mjs. Do not edit.\n'+source.replace(/\bexport /g,'')+'\nmodule.exports={'+names.join(',')+'};\n';}
await emit('audio/stone.wav',await readFile(resolve(root,'dist/audio/stone.wav')));
const engine=await readFile(resolve(root,'dist/engine.js'),'utf8');
const exports=[...engine.matchAll(/export function (\w+)/g)].map(m=>m[1]);
const rules=commonJS(engine,['BLACK','WHITE','key',...exports]);
await emit('shared/engine.js',rules);await emit('workers/engine.js',rules);
await emit('shared/lessons.js',commonJS(await readFile(resolve(root,'dist/lessons.js'),'utf8'),['lessons']));
let search=await readFile(resolve(root,'dist/ai.js'),'utf8');
search=search.replace(/^import \{([^}]+)\} from '\.\/engine\.js';/,"const {$1}=require('./engine');\nconst performance={now:()=>Date.now()};");
const workerEntry=search.indexOf("if(typeof self!==");
if(workerEntry<0)throw new Error("Browser worker entry changed; review the WeChat adapter.");
search=search.slice(0,workerEntry);
if(!search.includes('function chooseMove'))throw new Error('AI source format changed');
await emit('workers/search.js',commonJS(search,['chooseMove']));
async function verify(dir){let bytes=0;for(const entry of await readdir(dir,{withFileTypes:true})){
 const path=resolve(dir,entry.name);if(entry.isDirectory()){bytes+=await verify(path);continue;}bytes+=(await stat(path)).size;
 if(path.endsWith('.json'))JSON.parse(await readFile(path,'utf8'));
 if(path.endsWith('.js')){const result=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});if(result.status!==0)throw new Error(result.stderr);}
}return bytes;}
const bytes=await verify(destination),app=JSON.parse(await readFile(resolve(destination,'app.json'),'utf8'));
for(const page of app.pages)for(const ext of ['js','json','wxml','wxss'])await stat(resolve(destination,`${page}.${ext}`));
for(const ext of ['js','json','wxml','wxss'])await stat(resolve(destination,`components/go-board/index.${ext}`));
if(bytes>2*1024*1024)throw new Error('Mini program main package exceeds 2 MiB; use subpackages.');
console.log(`YiMu WeChat: ${check?'generated core verified':'core synchronized'}, JS/JSON/pages validated (${Math.ceil(bytes/1024)} KiB source). Import ${relative(root,resolve(root,'wechat'))}/ into WeChat DevTools as a regular Mini Program (not Mini Game). AppID account type must be verified in the WeChat console.`);
