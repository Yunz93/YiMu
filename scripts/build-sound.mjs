import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {stoneSamples} from '../dist/stone-sound.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),samples=stoneSamples(),wav=Buffer.alloc(44+samples.length*2);
wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(22050,24);wav.writeUInt32LE(44100,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples.length*2,40);
samples.forEach((value,i)=>wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,value))*32767),44+i*2));
for(const edition of ['dist','wechat/miniprogram','wechat-game']){
 const file=resolve(root,edition,'audio/stone.wav');
 if(process.argv.includes('--check')){if(!(await readFile(file)).equals(wav))throw new Error(edition+' stone sound is stale');}
 else{await mkdir(dirname(file),{recursive:true});await writeFile(file,wav);}
}
console.log('Stone sound: 140 ms synthesized PCM, shared across web and WeChat.');
