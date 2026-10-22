import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

// DevTools keeps local configuration separately from the checked-in project.
// Validate both before generating code; never overwrite account-specific settings.
export async function checkWechatProject(directory){
 const project=JSON.parse(await readFile(resolve(directory,'project.config.json'),'utf8'));
 let local={};
 try{local=JSON.parse(await readFile(resolve(directory,'project.private.config.json'),'utf8'));}
 catch(error){if(error.code!=='ENOENT')throw error;}
 const type=local.compileType??project.compileType;
 if(type!=='miniprogram')throw new Error(`YiMu 当前是普通小程序，compileType 应为 "miniprogram"，当前配置为 ${JSON.stringify(type)}。请检查 project.config.json 和 project.private.config.json，并在开发者工具中以普通小程序重新导入，使用普通小程序 AppID。不要通过补空 game.json 修复小游戏模式。`);
 const root=resolve(directory,local.miniprogramRoot??project.miniprogramRoot??'.');
 if(root!==resolve(directory,'miniprogram'))throw new Error('YiMu 的 miniprogramRoot 应为 "miniprogram/"。请导入包含 project.config.json 的 wechat/ 目录，并检查本地配置是否覆盖了代码目录。');
 await readFile(resolve(root,'app.json'),'utf8');
 return {project,root};
}
