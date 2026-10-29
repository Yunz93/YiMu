// A short synthesized stone-on-wood click; no recording or network request needed.
export function stoneSamples(rate=22050){
 const samples=new Float32Array(Math.round(rate*.14));let seed=9173,previous=0;
 for(let i=0;i<samples.length;i++){
  const t=i/rate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const noise=seed/2147483648-1,attack=1-Math.exp(-t*4200);
  const tap=(noise-previous*.65)*Math.exp(-t*210)*.32;previous=noise;
  const wood=Math.sin(t*2*Math.PI*1120)*Math.exp(-t*110)*.29;
  const body=Math.sin(t*2*Math.PI*490)*Math.exp(-t*75)*.12;
  samples[i]=attack*(tap+wood+body);
 }
 return samples;
}
export class StoneSound{
 constructor({enabled=true,Context=globalThis.AudioContext||globalThis.webkitAudioContext,visible=()=>true}={}){
  this.enabled=enabled;this.Context=Context;this.visible=visible;this.context=null;this.buffer=null;this.sources=new Set();this.epoch=0;
 }
 unlock(){
  if(!this.enabled||!this.visible()||!this.Context)return;
  try{
   if(this.context?.state==='closed'){this.context=null;this.buffer=null;}
   if(!this.context){const context=new this.Context();this.context=context;const pcm=stoneSamples();this.buffer=context.createBuffer(1,pcm.length,22050);this.buffer.getChannelData(0).set(pcm);}
   if(this.context.state==='suspended'||this.context.state==='interrupted')Promise.resolve(this.context.resume()).catch(()=>{});
  }catch{}
 }
 play(){
  const context=this.context,epoch=this.epoch,started=Date.now();
  if(!this.enabled||!this.visible()||!context)return;
  const emit=()=>{
   if(!this.enabled||!this.visible()||epoch!==this.epoch||context!==this.context||context.state!=='running'||Date.now()-started>150)return;
   try{const source=context.createBufferSource(),gain=context.createGain();source.buffer=this.buffer;gain.gain.value=.55;source.connect(gain);gain.connect(context.destination);this.sources.add(source);source.onended=()=>{this.sources.delete(source);source.disconnect();gain.disconnect();};source.start();}catch{}
  };
  try{if(context.state==='suspended'||context.state==='interrupted')Promise.resolve(context.resume()).then(emit).catch(()=>{});else emit();}catch{}
 }
 stop(){this.epoch++;for(const source of this.sources){try{source.stop();}catch{}}this.sources.clear();}
 setEnabled(value){this.enabled=!!value;this.stop();if(this.enabled)this.unlock();}
 pause(){this.stop();try{if(this.context?.state==='running')Promise.resolve(this.context.suspend()).catch(()=>{});}catch{}}
 dispose(){this.stop();const context=this.context;this.context=null;this.buffer=null;try{if(context)Promise.resolve(context.close()).catch(()=>{});}catch{}}
}
