// Map screen coordinates to the existing SVG viewBox, including zoomed/scrolling boards.
export function boardPointAt(clientX,clientY,rect,n){
 if(!rect.width||!rect.height||!Number.isFinite(clientX)||!Number.isFinite(clientY))return null;
 const x=(clientX-rect.left)/rect.width*560,y=(clientY-rect.top)/rect.height*560,step=476/(n-1);
 if(x<42-step*.49||x>518+step*.49||y<42-step*.49||y>518+step*.49)return null;
 const col=Math.round((x-42)/step),row=Math.round((y-42)/step);
 return col>=0&&col<n&&row>=0&&row<n?row*n+col:null;
}

export function bindTouchPreview({element,canPreview,pointAt,onPreview,onClear,delay=400}){
 let gesture=null,timer=null,suppressClick=false;
 const doc=element.ownerDocument,win=doc?.defaultView;
 const clearTimer=()=>{clearTimeout(timer);timer=null;};
 function cancel(){
  const active=!!gesture?.active;
  if(gesture)suppressClick=true;
  clearTimer();gesture=null;
  if(active)onClear();
 }
 function start(event){
  if(event.touches.length!==1){cancel();return;}
  cancel();suppressClick=false;
  if(!canPreview())return;
  const touch=event.touches[0],point=pointAt(touch.clientX,touch.clientY);
  if(point===null)return;
  gesture={id:touch.identifier,startX:touch.clientX,startY:touch.clientY,x:touch.clientX,y:touch.clientY,active:false,moved:false};
  timer=setTimeout(()=>{
   timer=null;if(!gesture||gesture.moved)return;
   if(!canPreview()){cancel();return;}
   gesture.active=true;suppressClick=true;
   const point=pointAt(gesture.x,gesture.y);if(point!==null)onPreview(point);
  },delay);
 }
 function move(event){
  if(!gesture)return;
  if(event.touches.length!==1){cancel();return;}
  const touch=Array.from(event.touches).find(t=>t.identifier===gesture.id);if(!touch){cancel();return;}
  gesture.x=touch.clientX;gesture.y=touch.clientY;
  if(!gesture.active){
   if(Math.hypot(touch.clientX-gesture.startX,touch.clientY-gesture.startY)>10){gesture.moved=true;suppressClick=true;clearTimer();}
   return; // A swipe before activation keeps native page/board scrolling.
  }
  if(!canPreview()){cancel();return;}
  if(event.cancelable)event.preventDefault();
  const point=pointAt(touch.clientX,touch.clientY);
  if(point===null)onClear();else onPreview(point);
 }
 function end(event){
  if(!gesture)return;
  const active=gesture.active;
  if(active||gesture.moved){suppressClick=true;if(event.cancelable)event.preventDefault();}
  clearTimer();gesture=null;
  if(active)onClear();
 }
 function consumeClick(event){
  const keyboard=event.detail===0&&event.pointerType!=='touch'&&!event.sourceCapabilities?.firesTouchEvents;
  if(!suppressClick||keyboard)return false;
  suppressClick=false;event.preventDefault();event.stopImmediatePropagation();return true;
 }
 const multiTouch=event=>{if(gesture&&event.touches.length!==1)cancel();};
 const mouseDown=event=>{if(event.pointerType==='mouse'||event.pointerType==='pen')suppressClick=false;};
 const contextMenu=event=>{if(gesture)event.preventDefault();};
 const visibility=()=>{if(doc.hidden)cancel();};
 element.addEventListener('touchstart',start,{passive:true});
 element.addEventListener('touchmove',move,{passive:false});
 element.addEventListener('touchend',end,{passive:false});
 element.addEventListener('touchcancel',cancel,{passive:true});
 element.addEventListener('pointerdown',mouseDown);
 element.addEventListener('contextmenu',contextMenu);
 doc?.addEventListener('touchstart',multiTouch,{passive:true});
 doc?.addEventListener('visibilitychange',visibility);
 win?.addEventListener('blur',cancel);
 return {cancel,consumeClick,get active(){return !!gesture?.active;},destroy(){
  cancel();element.removeEventListener('touchstart',start);element.removeEventListener('touchmove',move);
  element.removeEventListener('touchend',end);element.removeEventListener('touchcancel',cancel);
  element.removeEventListener('pointerdown',mouseDown);element.removeEventListener('contextmenu',contextMenu);
  doc?.removeEventListener('touchstart',multiTouch);doc?.removeEventListener('visibilitychange',visibility);win?.removeEventListener('blur',cancel);
 }};
}
