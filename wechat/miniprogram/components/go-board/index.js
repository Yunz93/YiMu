const {BoardGesture,pointAt}=require('../../utils/gesture');
Component({
 properties:{size:{type:Number,value:320},n:{type:Number,value:9},board:{type:Array,value:[]},last:{type:Number,value:-1},previewAt:{type:Number,value:-1},hintAt:{type:Number,value:-1},captured:{type:Array,value:[]},liberties:{type:Array,value:[]},groupStones:{type:Array,value:[]},influence:{type:Array,value:[]},owners:{type:Array,value:[]},selected:{type:Array,value:[]},dead:{type:Array,value:[]},previewEnabled:{type:Boolean,value:false},disabled:{type:Boolean,value:false}},
 data:{holding:false},
 observers:{'board,last,previewAt,hintAt,captured,liberties,groupStones,influence,owners,selected,dead,n':function(){this.paint();},size:function(){if(this._attached){this.cancelGesture();this.setup();}},'previewEnabled,disabled':function(){if(!this.properties.previewEnabled||this.properties.disabled)this.cancelGesture();}},
 lifetimes:{attached(){this._attached=true;this._gesture=new BoardGesture({pointAt:(x,y)=>pointAt(x,y,this.properties.size,this.properties.n),canPreview:()=>this.properties.previewEnabled&&!this.properties.disabled,onPick:i=>{if(!this.properties.disabled)this.triggerEvent('pick',{i});},onPreview:i=>this.triggerEvent('preview',{i}),onClear:()=>this.triggerEvent('clearpreview'),onHolding:holding=>{if(this.data.holding!==holding)this.setData({holding});}});wx.nextTick(()=>this.setup());},detached(){this._attached=false;this.cancelGesture();this._canvas=null;this._ctx=null;}},
 pageLifetimes:{hide(){this.cancelGesture();}},
 methods:{
  setup(){if(!this._attached)return;const revision=this._setupRevision=(this._setupRevision||0)+1;this.createSelectorQuery().select('#board').fields({node:true,size:true}).exec(results=>{if(!this._attached||revision!==this._setupRevision)return;const item=results[0];if(!item||!item.node)return;this._canvas=item.node;const info=wx.getWindowInfo?wx.getWindowInfo():wx.getSystemInfoSync(),dpr=info.pixelRatio||1;item.node.width=Math.round(this.properties.size*dpr);item.node.height=Math.round(this.properties.size*dpr);this._ctx=item.node.getContext('2d');this._ctx.scale(item.node.width/560,item.node.height/560);this.paint();});},
  local(t){if(Number.isFinite(t.x)&&Number.isFinite(t.y))return {x:t.x,y:t.y};return {x:t.clientX-(this._bounds?this._bounds.left:0),y:t.clientY-(this._bounds?this._bounds.top:0)};},
  touchStart(e){if(this.properties.disabled)return;const touches=e.touches||[];if(touches.length!==1){this.cancelGesture();return;}const t=touches[0];if(Number.isFinite(t.x)){const p=this.local(t);this._gesture.start(p.x,p.y,touches.length);return;}
   const stamp=this._touchStamp=(this._touchStamp||0)+1;this.createSelectorQuery().select('#board').boundingClientRect().exec(results=>{if(stamp!==this._touchStamp||!this._attached)return;this._bounds=results[0];const p=this.local(t);this._gesture.start(p.x,p.y,touches.length);});
  },
  touchMove(e){const touches=e.touches||[];if(touches.length!==1){this.cancelGesture();return;}const p=this.local(touches[0]);this._gesture.move(p.x,p.y,touches.length);},
  touchEnd(e){this._touchStamp=(this._touchStamp||0)+1;const t=(e.changedTouches||[])[0];if(t){const p=this.local(t);this._gesture.end(p.x,p.y);}else this.cancelGesture();},
  touchCancel(){this.cancelGesture();},cancelGesture(){this._touchStamp=(this._touchStamp||0)+1;if(this._gesture)this._gesture.cancel();},
  paint(){const ctx=this._ctx;if(!ctx)return;const p=this.properties,n=p.n,step=476/(n-1),radius=step*.435,at=i=>[42+i%n*step,42+Math.floor(i/n)*step];ctx.clearRect(0,0,560,560);ctx.fillStyle='#e8c894';ctx.fillRect(0,0,560,560);
   for(let i=0;i<n*n;i++){if(p.board[i])continue;const [x,y]=at(i),v=p.influence[i];if(Math.abs(v)>.06){ctx.fillStyle=v>0?`rgba(66,107,69,${Math.abs(v)*.48})`:`rgba(255,253,240,${Math.abs(v)*.6})`;ctx.fillRect(x-step*.48,y-step*.48,step*.96,step*.96);}}
   ctx.strokeStyle='#997b47';ctx.lineWidth=.9;for(let k=0;k<n;k++){const q=42+k*step;ctx.beginPath();ctx.moveTo(42,q);ctx.lineTo(518,q);ctx.moveTo(q,42);ctx.lineTo(q,518);ctx.stroke();ctx.fillStyle='#897047';ctx.font='11px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('ABCDEFGHJKLMNOPQRST'[k],q,23);ctx.fillText(String(n-k),22,q);ctx.fillText('ABCDEFGHJKLMNOPQRST'[k],q,540);}
   const stars=n===19?[3,9,15]:n===13?[3,6,9]:n===9?[2,4,6]:n===5?[2]:[];for(const x of stars)for(const y of stars){if(n!==19&&stars.length===3&&((x===stars[1])!==(y===stars[1])))continue;this.circle(42+x*step,42+y*step,2.5,'#8d7248');}
   for(let i=0;i<n*n;i++)if(!p.board[i]&&p.owners[i]){const [x,y]=at(i);ctx.fillStyle=p.owners[i]===1?'#40543b':'#fffdf4';ctx.fillRect(x-4,y-4,8,8);}
   for(const i of p.liberties){const [x,y]=at(i);this.circle(x,y,step*.12,'#dce9c5','#729152',1.5);}
   for(let i=0;i<p.board.length;i++)if(p.board[i]){const [x,y]=at(i);ctx.globalAlpha=p.dead.includes(i)?0.35:i===p.previewAt?0.65:1;
    if(p.groupStones.includes(i))this.circle(x,y,radius+4,null,'#7d9b5a',2);
    const g=ctx.createRadialGradient(x-radius*.25,y-radius*.3,radius*.05,x,y,radius);g.addColorStop(0,p.board[i]===1?'#61685a':'#ffffff');g.addColorStop(1,p.board[i]===1?'#172117':'#d9dfcf');this.circle(x,y,radius,g,p.board[i]===2?'#cbd0c1':null,.8);ctx.globalAlpha=1;
    if(i===p.last)this.circle(x,y,radius*.2,null,p.board[i]===1?'#dfe8cf':'#72885e',1.8);
    if(p.dead.includes(i)){ctx.strokeStyle='#a36e4e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-5,y-5);ctx.lineTo(x+5,y+5);ctx.moveTo(x-5,y+5);ctx.lineTo(x+5,y-5);ctx.stroke();}
   }
   for(const i of p.captured){const [x,y]=at(i);ctx.setLineDash([3,3]);this.circle(x,y,radius*.8,'#f2dfc5','#a57751',1.5);ctx.setLineDash([]);}
   for(const i of p.selected){const [x,y]=at(i);this.circle(x,y,Math.min(11,step*.26),'#c8d99e','#718d4e',2);}
   if(p.previewAt>=0){const [x,y]=at(p.previewAt);ctx.setLineDash([3,3]);this.circle(x,y,radius+3,null,'#608a4c',2);ctx.setLineDash([]);}
   if(p.hintAt>=0&&!p.board[p.hintAt]){const [x,y]=at(p.hintAt);ctx.setLineDash([4,4]);this.circle(x,y,radius*.8,null,'#608a4c',2);ctx.setLineDash([]);this.circle(x,y,3,'#608a4c');}
  },
  circle(x,y,r,fill,stroke,width=1){const ctx=this._ctx;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
 }
});
