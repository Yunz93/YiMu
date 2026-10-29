// Native adapter for the same synthesized stone click as the website.
class StoneSound{
 constructor(api,enabled=true,src='audio/stone.wav'){this.src=src;this.api=api;this.enabled=enabled;this.context=null;}
 play(){
  if(!this.enabled)return;
  try{
   if(!this.context){if(!this.api.createInnerAudioContext)return;const audio=this.api.createInnerAudioContext();audio.src=this.src;audio.volume=.55;audio.obeyMuteSwitch=true;if(audio.onError)audio.onError(()=>{});this.context=audio;}
   this.context.stop();this.context.play();
  }catch{}
 }
 setEnabled(value){this.enabled=!!value;if(!this.enabled)this.stop();}
 stop(){try{if(this.context)this.context.stop();}catch{}}
 destroy(){this.stop();try{if(this.context)this.context.destroy();}catch{}this.context=null;}
}
module.exports={StoneSound};
