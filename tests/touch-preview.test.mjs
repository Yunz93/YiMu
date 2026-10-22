import test from 'node:test';
import assert from 'node:assert/strict';
import {bindTouchPreview,boardPointAt} from '../dist/touch-preview.js';

const wait=()=>new Promise(resolve=>setTimeout(resolve,35));
const finger=(x,y=10,id=1)=>({identifier:id,clientX:x,clientY:y});
function setup(){
 const doc=new EventTarget(),win=new EventTarget(),element=new EventTarget(),shown=[];
 doc.defaultView=win;element.ownerDocument=doc;
 let enabled=true,cleared=0;
 const controller=bindTouchPreview({element,canPreview:()=>enabled,pointAt:(x,y)=>x<0||y<0?null:Math.round(x),onPreview:i=>shown.push(i),onClear:()=>cleared++,delay:15});
 function send(type,touches=[],properties={},target=element){const e=new Event(type,{cancelable:true});Object.assign(e,{touches,changedTouches:touches},properties);target.dispatchEvent(e);return e;}
 return {controller,shown,send,doc,win,get cleared(){return cleared;},disable(){enabled=false;controller.cancel();}};
}

test('轻点不触发预览或拦截落子',async()=>{
 const t=setup();t.send('touchstart',[finger(5)]);t.send('touchend');await wait();
 assert.deepEqual(t.shown,[]);assert.equal(t.controller.consumeClick(t.send('click',[],{detail:1,pointerType:'touch'})),false);t.controller.destroy();
});
test('长按触发预览，拖动可换点，松手清除并拦截兼容点击',async()=>{
 const t=setup();t.send('touchstart',[finger(5)]);await wait();assert.equal(t.controller.active,true);assert.deepEqual(t.shown,[5]);
 const move=t.send('touchmove',[finger(25)]);assert.equal(move.defaultPrevented,true);assert.deepEqual(t.shown,[5,25]);
 const end=t.send('touchend');assert.equal(end.defaultPrevented,true);assert.equal(t.cleared,1);assert.equal(t.controller.active,false);
 const click=t.send('click',[],{detail:1,pointerType:'touch'});assert.equal(t.controller.consumeClick(click),true);assert.equal(click.defaultPrevented,true);t.controller.destroy();
});
test('长按预览后的下一次轻点仍可落子',async()=>{
 const t=setup();t.send('touchstart',[finger(5)]);await wait();t.send('touchend');
 t.send('touchstart',[finger(8)]);t.send('touchend');assert.equal(t.controller.consumeClick(t.send('click',[],{detail:1,pointerType:'touch'})),false);t.controller.destroy();
});
test('长按前滑动允许原生滚动，且不把滑动识别为落子',async()=>{
 const t=setup();t.send('touchstart',[finger(5)]);const move=t.send('touchmove',[finger(30)]);assert.equal(move.defaultPrevented,false);await wait();
 assert.deepEqual(t.shown,[]);t.send('touchend');assert.equal(t.controller.consumeClick(t.send('click',[],{detail:1,pointerType:'touch'})),true);t.controller.destroy();
});
test('双指开始或系统取消都会终止长按并防止误落子',async()=>{
 for(const type of ['multi','touchcancel']){
  const t=setup();t.send('touchstart',[finger(5)]);await wait();
  if(type==='multi')t.send('touchstart',[finger(5),finger(20,10,2)],{},t.doc);else t.send('touchcancel');
  assert.equal(t.controller.active,false);assert.equal(t.cleared,1);assert.equal(t.controller.consumeClick(t.send('click',[],{detail:1,pointerType:'touch'})),true);t.controller.destroy();
 }
});
test('关闭预览时取消待触发的手势，禁用时轻点不受影响',async()=>{
 const t=setup();t.send('touchstart',[finger(5)]);t.disable();await wait();assert.deepEqual(t.shown,[]);
 t.send('touchstart',[finger(10)]);t.send('touchend');assert.equal(t.controller.consumeClick(t.send('click',[],{detail:1,pointerType:'touch'})),false);t.controller.destroy();
});
test('拖出棋盘清除预览，重新移入可继续查看',async()=>{
 const t=setup();t.send('touchstart',[finger(5)]);await wait();t.send('touchmove',[finger(-5)]);assert.equal(t.cleared,1);assert.equal(t.controller.active,true);
 t.send('touchmove',[finger(10)]);assert.deepEqual(t.shown,[5,10]);t.send('touchend');t.controller.destroy();
});
test('手势取消后，键盘和真正的鼠标点击仍正常',async()=>{
 const t=setup();t.send('touchstart',[finger(5)]);await wait();t.send('touchend');
 assert.equal(t.controller.consumeClick(t.send('click',[],{detail:0})),false);
 t.send('pointerdown',[],{pointerType:'mouse'});assert.equal(t.controller.consumeClick(t.send('click',[],{detail:1,pointerType:'mouse'})),false);t.controller.destroy();
});
test('缩放及滚动后的9路和19路棋盘坐标映射正确，外部点不吸附到边线',()=>{
 for(const n of [9,19]){
  const rect={left:-80,top:120,width:640,height:640},step=476/(n-1);
  for(const i of [0,Math.floor(n*n/2),n*n-1]){
   const x=rect.left+(42+i%n*step)/560*rect.width,y=rect.top+(42+Math.floor(i/n)*step)/560*rect.height;
   assert.equal(boardPointAt(x,y,rect,n),i);
  }
  assert.equal(boardPointAt(-100,150,rect,n),null);
 }
 assert.equal(boardPointAt(1,1,{left:0,top:0,width:0,height:0},19),null);
});
