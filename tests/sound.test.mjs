import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {StoneSound,stoneSamples} from '../dist/stone-sound.js';
const require=createRequire(import.meta.url);
const {StoneSound:NativeSound}=require('../wechat/miniprogram/utils/sound.js');
class Context{
 constructor(){this.state='suspended';this.started=0;this.stopped=0;this.destination={};Context.last=this;}
 createBuffer(channels,length){const samples=new Float32Array(length);return {getChannelData:()=>samples};}
 resume(){this.state='running';return Promise.resolve();}
 suspend(){this.state='suspended';return Promise.resolve();}
 close(){this.state='closed';return Promise.resolve();}
 createGain(){return {gain:{value:0},connect(){},disconnect(){}};}
 createBufferSource(){return {connect(){},disconnect(){},start:()=>this.started++,stop:()=>this.stopped++};}
}
test('落子音效为短促且无削波的本地 PCM，微信音频与网页采样一致',()=>{
 const pcm=stoneSamples();assert.equal(pcm.length,3087);assert.deepEqual(pcm,stoneSamples());
 const peak=Math.max(...pcm.map(Math.abs)),rms=Math.sqrt(pcm.reduce((s,v)=>s+v*v,0)/pcm.length);
 assert(peak>.1&&peak<.8);assert(rms>.01&&rms<.2);assert(Math.max(...pcm.slice(-64).map(Math.abs))<.001);
 const wav=readFileSync(new URL('../dist/audio/stone.wav',import.meta.url));assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt32LE(24),22050);
 pcm.forEach((sample,i)=>assert.equal(wav.readInt16LE(44+i*2),(Math.round(sample*32767)||0)));
});
test('网页仅在手势解锁后发声；静音立即停止，后台与释放后保持安静',()=>{
 let visible=true;const sound=new StoneSound({Context,visible:()=>visible});sound.play();assert.equal(sound.context,null);
 sound.unlock();const ctx=Context.last;assert.equal(ctx.started,0);sound.play();assert.equal(ctx.started,1);
 sound.setEnabled(false);assert.equal(ctx.stopped,1);sound.play();assert.equal(ctx.started,1);
 sound.setEnabled(true);sound.play();assert.equal(ctx.started,2);visible=false;sound.play();assert.equal(ctx.started,2);sound.pause();assert.equal(ctx.state,'suspended');
 sound.dispose();assert.equal(ctx.state,'closed');assert.equal(sound.context,null);
});
test('关闭音效会取消尚未完成的音频解锁，不会补播旧的落子声',async()=>{
 const pending=[];class Deferred extends Context{resume(){return new Promise(r=>pending.push(()=>{this.state='running';r();}));}}
 const sound=new StoneSound({Context:Deferred});sound.unlock();const ctx=Context.last;sound.play();sound.setEnabled(false);
 pending.forEach(done=>done());await Promise.resolve();assert.equal(ctx.started,0);
 const broken=new StoneSound({Context:class{constructor(){throw new Error('unsupported');}}});assert.doesNotThrow(()=>{broken.unlock();broken.play();broken.pause();broken.dispose();});
});
test('微信音效复用本地音频对象，静音/后台停止播放，资源失败不影响落子',()=>{
 const calls={play:0,stop:0,destroy:0};let audio;
 const sound=new NativeSound({createInnerAudioContext:()=>audio={onError(){},play(){calls.play++;},stop(){calls.stop++;},destroy(){calls.destroy++;}}});
 sound.play();sound.play();assert.equal(calls.play,2);assert.equal(audio.src,'audio/stone.wav');assert.equal(audio.obeyMuteSwitch,true);
 sound.setEnabled(false);sound.play();assert.equal(calls.play,2);sound.setEnabled(true);sound.play();assert.equal(calls.play,3);sound.destroy();assert.equal(calls.destroy,1);
 const broken=new NativeSound({createInnerAudioContext(){throw new Error('unavailable');}});assert.doesNotThrow(()=>{broken.play();broken.destroy();});
});
