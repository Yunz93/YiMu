const COLORS={bg:'#f7f8f5',paper:'#ffffff',ink:'#29362e',muted:'#7f8d79',green:'#426650',sage:'#eef2e9',border:'#e5e9e0',risk:'#a16f4e'};
class Painter{
 constructor(context){this.ctx=context;this.hits=[];this.offset=0;this.clipTop=0;this.clipBottom=Infinity;this.cache=new Map();}
 begin(width,height){const c=this.ctx;c.clearRect(0,0,width,height);c.fillStyle=COLORS.bg;c.fillRect(0,0,width,height);this.hits=[];this.offset=0;this.clipTop=0;this.clipBottom=height;}
 card(x,y,w,h,fill=COLORS.paper,stroke=COLORS.border,r=12){const c=this.ctx;r=Math.max(0,Math.min(r,w/2,h/2));c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
 text(value,x,y,size=14,color=COLORS.ink,weight='normal',align='left'){const c=this.ctx;c.font=`${weight} ${size}px sans-serif`;c.fillStyle=color;c.textBaseline='top';c.textAlign=align;c.fillText(String(value??''),x,y);}
 lines(value,width,size=14){const text=String(value??''),key=size+'|'+width+'|'+text;if(this.cache.has(key))return this.cache.get(key);const c=this.ctx;c.font=`normal ${size}px sans-serif`;const lines=[];for(const paragraph of text.split('\n')){let line='';for(const char of Array.from(paragraph)){if(line&&c.measureText(line+char).width>width){lines.push(line);line=char;}else line+=char;}lines.push(line);}if(this.cache.size>800)this.cache.clear();this.cache.set(key,lines);return lines;}
 paragraph(value,x,y,width,{size=14,lineHeight=22,color=COLORS.muted,maxLines=Infinity}={}){const all=this.lines(value,width,size),lines=all.slice(0,maxLines);lines.forEach((line,i)=>this.text(i===lines.length-1&&all.length>maxLines?line.slice(0,-1)+'…':line,x,y+i*lineHeight,size,color));return lines.length*lineHeight;}
 button(id,label,x,y,w,h,action,{primary=false,disabled=false,selected=false,danger=false,quiet=false,icon=null}={}){
  const c=this.ctx,color=primary?'#fff':danger?COLORS.risk:selected?COLORS.green:COLORS.muted;
  c.save();if(disabled)c.globalAlpha=.38;
  if(!quiet)this.card(x,y,w,h,primary?COLORS.green:selected?COLORS.sage:danger?'#fbf2e8':COLORS.paper,primary?null:selected?'#dce5d4':COLORS.border,7);
  const size=w<65?11:12,iw=icon?18:0;c.font=`normal ${size}px sans-serif`;const total=c.measureText(label).width+iw;
  if(icon)this.icon(icon,x+(w-total)/2,y+(h-14)/2,14,color);
  this.text(label,x+w/2+iw/2,y+(h-size)/2,size,color,selected?'600':'normal','center');c.restore();if(!disabled)this.hit(id,x,y,w,h,action);
 }
 toggle(id,label,x,y,w,on,action,disabled=false){const c=this.ctx;c.save();if(disabled)c.globalAlpha=.4;this.card(x,y+9,25,14,on?COLORS.green:'#c9d1c3',null,7);this.circle(x+(on?18:7),y+16,5,'#fff');this.text(label,x+32,y+10,11,COLORS.green);c.restore();if(!disabled)this.hit(id,x,y,w,34,action);}
 stone(x,y,r,color){const c=this.ctx,g=c.createRadialGradient(x-r*.3,y-r*.35,r*.1,x,y,r);g.addColorStop(0,color===1?'#65705f':'#ffffff');g.addColorStop(1,color===1?'#20291f':'#e4e8df');this.circle(x,y,r,g,color===2?'#d9dfd2':null);}
 brand(x,y,size=32){this.card(x,y,size,size,COLORS.green,null,9);this.card(x+7,y+7,size-14,size-14,null,'#ffffff25',0);this.stone(x+size*.36,y+size*.36,size*.15,2);this.stone(x+size*.65,y+size*.65,size*.15,1);}
 icon(name,x,y,size=18,color=COLORS.green){
  const c=this.ctx;c.save();c.translate(x,y);c.scale(size/24,size/24);c.strokeStyle=color;c.fillStyle=color;c.lineWidth=1.6;c.lineCap='round';c.lineJoin='round';
  const line=points=>{c.beginPath();points.forEach(([a,b],i)=>i?c.lineTo(a,b):c.moveTo(a,b));c.stroke();};
  if(name==='grid'){this.card(3,3,18,18,null,color,3);for(const q of [9,15]){line([[q,3],[q,21]]);line([[3,q],[21,q]]);}}
  else if(name==='book'){line([[12,5],[12,21]]);line([[12,5],[9,3],[3,3],[3,19],[9,19],[12,21],[15,19],[21,19],[21,3],[15,3],[12,5]]);}
  else if(name==='info'){this.circle(12,12,9,null,color,1.6);line([[12,11],[12,17]]);this.circle(12,7,1,color);}
  else if(name==='expand'||name==='shrink'){for(const [a,b,sx,sy] of [[4,4,1,1],[20,4,-1,1],[4,20,1,-1],[20,20,-1,-1]])line(name==='expand'?[[a,b+sy*5],[a,b],[a+sx*5,b]]:[[a+sx*5,b],[a+sx*5,b+sy*5],[a,b+sy*5]]);}
  else if(name==='settings'){for(const [q,t] of [[6,8],[12,16],[18,10]]){line([[3,q],[21,q]]);this.circle(t,q,2.5,COLORS.paper,color,1.6);}}
  else if(name==='plus'){line([[12,4],[12,20]]);line([[4,12],[20,12]]);}
  else if(name==='undo'){line([[8,4],[3,9],[8,14]]);c.beginPath();c.moveTo(3,9);c.lineTo(13,9);c.quadraticCurveTo(21,9,21,16);c.quadraticCurveTo(21,21,14,21);c.stroke();}
  else if(name==='bulb'){c.beginPath();c.arc(12,9,6,Math.PI*.82,Math.PI*2.18);c.lineTo(15,17);c.lineTo(9,17);c.closePath();c.stroke();line([[10,21],[14,21]]);}
  else if(name==='pause'){line([[8,5],[8,19]]);line([[16,5],[16,19]]);}
  else if(name==='flag'){line([[5,22],[5,3],[12,3],[14,6],[21,6],[21,15],[14,15],[12,12],[5,12]]);}
  else if(name==='spark'){line([[12,2],[15,9],[22,12],[15,15],[12,22],[9,15],[2,12],[9,9],[12,2]]);}
  else if(name==='arrow'){line([[4,12],[20,12],[15,7]]);line([[20,12],[15,17]]);}
  else if(name==='check'){line([[5,12],[10,17],[20,6]]);}
  else if(name==='eye'){line([[2,12],[6,7],[12,5],[18,7],[22,12],[18,17],[12,19],[6,17],[2,12]]);this.circle(12,12,3,null,color,1.6);}
  c.restore();
 }
 hit(id,x,y,w,h,action){const top=Math.max(y+this.offset,this.clipTop),bottom=Math.min(y+h+this.offset,this.clipBottom);if(bottom>top)this.hits.push({id,x,y:top,w,h:bottom-top,action});}
 startScroll(top,bottom,scroll){const c=this.ctx;c.save();c.beginPath();c.rect(0,top,10000,bottom-top);c.clip();c.translate(0,top-scroll);this.offset=top-scroll;this.clipTop=top;this.clipBottom=bottom;}
 endScroll(height){this.ctx.restore();this.offset=0;this.clipTop=0;this.clipBottom=height;}
 circle(x,y,r,fill,stroke,width=1){const c=this.ctx;c.beginPath();c.arc(x,y,r,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.lineWidth=width;c.strokeStyle=stroke;c.stroke();}}
 rule(x,y,width){const c=this.ctx;c.beginPath();c.moveTo(x,y);c.lineTo(x+width,y);c.strokeStyle=COLORS.border;c.lineWidth=1;c.stroke();}
}
module.exports={Painter,COLORS};
