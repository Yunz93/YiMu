import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {checkWechatProject} from '../scripts/wechat-project.mjs';

test('小程序导入检查接受正确配置，拦截本地小游戏模式和错误代码目录',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'yimu-wechat-'));
 try{
  await mkdir(join(directory,'miniprogram'));
  await writeFile(join(directory,'miniprogram/app.json'),'{}');
  await writeFile(join(directory,'project.config.json'),JSON.stringify({compileType:'miniprogram',miniprogramRoot:'miniprogram/'}));
  const result=await checkWechatProject(directory);assert.equal(result.root,join(directory,'miniprogram'));
  await writeFile(join(directory,'project.private.config.json'),JSON.stringify({compileType:'game'}));
  await assert.rejects(checkWechatProject(directory),/普通小程序.*game\.json/);
  await writeFile(join(directory,'project.private.config.json'),JSON.stringify({miniprogramRoot:'./'}));
  await assert.rejects(checkWechatProject(directory),/miniprogramRoot.*wechat/);
  await writeFile(join(directory,'project.private.config.json'),JSON.stringify({setting:{urlCheck:true}}));
  await checkWechatProject(directory);
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('导入检查不把损坏的本地配置当成不存在，也拦截主配置小游戏类型',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'yimu-wechat-'));
 try{
  await writeFile(join(directory,'project.config.json'),JSON.stringify({compileType:'game',miniprogramRoot:'miniprogram/'}));
  await assert.rejects(checkWechatProject(directory),/普通小程序/);
  await writeFile(join(directory,'project.private.config.json'),'{broken');
  await assert.rejects(checkWechatProject(directory),SyntaxError);
 }finally{await rm(directory,{recursive:true,force:true});}
});
