import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const require=createRequire(import.meta.url);
const {YiMuGame}=require('../wechat-game/src/app.js');
const E=require('../wechat-game/shared/engine.js');
const Store=require('../wechat-game/utils/storage.js');
const {lessons}=require('../wechat-game/shared/lessons.js');
function platform({width=390,height=844,query={}}={}){
 const values=new Map(),events={},workers=[],notices=[],frames=new Map(),commands=[];let nextFrame=0,failStorage=false;
 const ctx=new Proxy({measureText:text=>({width:Array.from(text).length*8}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(target,key)=>target[key]??((...args)=>commands.push([key,...args])),set:(target,key,value)=>{target[key]=value;return true;}});
 const canvas={width,height,getContext:()=>ctx};
 const wx={createCanvas:()=>canvas,getWindowInfo:()=>({windowWidth:width,windowHeight:height,pixelRatio:2,safeArea:{top:47,bottom:height-34}}),getMenuButtonBoundingClientRect:()=>({bottom:80}),getStorageSync:k=>values.get(k)??'',setStorageSync:(k,v)=>{if(failStorage)throw new Error('quota');values.set(k,structuredClone(v));},removeStorageSync:k=>values.delete(k),getLaunchOptionsSync:()=>({query}),showShareMenu:()=>{},shareAppMessage:o=>notices.push(o),setClipboardData:o=>notices.push(o),showToast:o=>notices.push(o),showModal:o=>{notices.push(o);o.success({confirm:true});},createWorker:path=>{const worker={path,onMessage(fn){this.receive=fn;},onError(fn){this.error=fn;},postMessage(data){this.message=data;},terminate(){this.terminated=true;}};workers.push(worker);return worker;}};
 for(const event of ['TouchStart','TouchMove','TouchEnd','TouchCancel','Hide','Show','WindowResize','ShareAppMessage']){wx['on'+event]=fn=>{events[event]=fn;};wx['off'+event]=fn=>{if(events[event]===fn)delete events[event];};}
 globalThis.wx=wx;
 const options={gestureDelay:12,requestFrame:fn=>{const id=++nextFrame;frames.set(id,fn);return id;},cancelFrame:id=>frames.delete(id)};
 const app=new YiMuGame(wx,canvas,options).start();
 function flush(){for(let i=0;frames.size&&i<10;i++){const current=[...frames.entries()];frames.clear();for(const [,fn] of current)fn();}}
 function emit(name,points){const touches=points.map(p=>({clientX:p.x,clientY:p.y}));events[name]({touches:name==='TouchEnd'?[]:touches,changedTouches:touches});flush();}
 function tap(x,y){emit('TouchStart',[{x,y}]);emit('TouchEnd',[{x,y}]);}
 function tapId(id){const hit=app.painter.hits.find(r=>r.id===id);assert(hit,'visible hit target '+id);tap(hit.x+hit.w/2,hit.y+hit.h/2);}
 function point(i){const b=app.boardRect;assert(b);return {x:b.x+b.size*.075+i%b.n*b.size*.85/(b.n-1),y:b.y+b.size*.075+Math.floor(i/b.n)*b.size*.85/(b.n-1)};}
 return {app,wx,canvas,values,workers,notices,events,commands,options,flush,emit,tap,tapId,point,resize:(w,h)=>{width=w;height=h;events.WindowResize();flush();},failStorage:()=>{failStorage=true;}};
}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

test('小游戏工程入口为game.js/game.json，直接在mg API环境启动，不依赖App/Page/DOM',()=>{
 const root=new URL('../wechat-game/',import.meta.url),config=JSON.parse(readFileSync(new URL('project.config.json',root),'utf8')),game=JSON.parse(readFileSync(new URL('game.json',root),'utf8'));
 assert.equal(config.compileType,'game');assert.equal(config.miniprogramRoot,'./');assert.equal(game.workers,'workers');
 const p=platform();p.app.destroy();const local=createRequire(new URL('game.js',root));
 vm.runInNewContext(readFileSync(new URL('game.js',root),'utf8'),{wx:p.wx,require:local,setTimeout,clearTimeout});
 assert.equal(typeof p.events.TouchStart,'function');assert.equal(typeof p.events.ShareAppMessage,'function');assert(p.commands.some(c=>c[0]==='fillText'&&c[1]==='YiMu · 一目'));
 p.events.Hide();
});

test('9/13/19路小游戏Canvas触摸长按、拖动、松手只读，下一次轻点仅落一子',async()=>{
 for(const n of [9,13,19]){
  const p=platform(),a=p.app;try{
   a.session.reset(n,1,0);a.render();const start=n===19?180:40,next=start+1,pt=p.point(start),qt=p.point(next);
   p.emit('TouchStart',[pt]);await pause(22);p.flush();assert.equal(a.preview.i,start);assert.equal(a.session.state.moves.length,0);assert.equal(p.values.has(Store.KEYS.game),false);
   p.emit('TouchMove',[qt]);assert.equal(a.preview.i,next);p.emit('TouchEnd',[qt]);assert.equal(a.preview,null);assert.equal(a.session.state.moves.length,0);assert.equal(p.workers.length,0);
   p.tap(qt.x,qt.y);assert.equal(a.session.state.moves.length,1);assert.equal(a.session.state.board[next],1);assert.equal(Store.stats().moves,1);
   await pause(60);assert.equal(p.workers.length,1);assert.equal(p.workers[0].path,'workers/ai.js');
  }finally{a.destroy();}
 }
});

test('棋盘上开始的滚动、多指和系统取消不会被误判为落子，关闭预览仍可轻点',async()=>{
 const p=platform(),a=p.app;try{
  let pt=p.point(40);p.emit('TouchStart',[pt]);p.emit('TouchMove',[{x:pt.x,y:pt.y-65}]);p.emit('TouchEnd',[{x:pt.x,y:pt.y-65}]);assert.equal(a.session.state.moves.length,0);assert(a.scroll.game>0);
  pt=p.point(40);p.emit('TouchStart',[pt]);p.emit('TouchMove',[pt,{x:pt.x+10,y:pt.y+10}]);p.emit('TouchEnd',[pt]);assert.equal(a.session.state.moves.length,0);
  p.emit('TouchStart',[pt]);await pause(22);p.flush();assert(a.preview);p.events.TouchCancel();p.flush();assert.equal(a.preview,null);assert.equal(a.session.state.moves.length,0);
  a.togglePreview();p.emit('TouchStart',[pt]);await pause(22);p.flush();assert.equal(a.preview,null);p.emit('TouchEnd',[pt]);assert.equal(a.session.state.moves.length,1);assert.equal(Store.read(Store.KEYS.preview,true),false);
 }finally{a.destroy();}
});

test('小游戏推荐详情与弹层滚动只读，关闭后推荐仍保留且可以直接落子',()=>{
 const p=platform(),a=p.app;try{
  p.tapId('hint');const w=p.workers.at(-1);w.receive({id:w.message.id,i:20,reply:60,alternatives:[24,56],compared:4});assert(a.modal);assert.equal(a.hint.i,20);assert.equal(a.session.state.moves.length,0);assert(!p.values.has(Store.KEYS.game));
  assert(a.modal.sections.some(s=>s.heading&&s.heading.includes('对方可能')));assert.equal(a.painter.hits.some(h=>h.id==='nav-learn'),false);p.resize(320,568);
  const top=a.modalViewport.top+90;p.emit('TouchStart',[{x:190,y:top}]);p.emit('TouchMove',[{x:190,y:top-60}]);p.emit('TouchEnd',[{x:190,y:top-60}]);assert(a.modal.scroll>0);assert.equal(a.session.state.moves.length,0);
  p.tapId('modal-confirm');assert.equal(a.modal,null);assert.equal(a.hint.i,20);const point=p.point(20);p.tap(point.x,point.y);assert.equal(a.session.state.board[20],1);assert.equal(a.hint,null);
 }finally{a.destroy();}
});

test('切页和后台终止AI，迟到结果被丢弃；返回恢复AI回合，全局切换不取消AI',()=>{
 const p=platform(),a=p.app;try{
  a.play(20);a.askAI(false);let w=p.workers.at(-1),id=w.message.id;p.tapId('nav-learn');assert(w.terminated);w.receive({id,i:60});assert.equal(a.session.state.moves.length,1);
  p.tapId('nav-game');a.askAI(false);w=p.workers.at(-1);id=w.message.id;a.toggleGlobal();assert.equal(w.terminated,undefined);w.receive({id,i:60});assert.equal(a.session.state.moves.length,2);a.showAnalysis();assert(a.modal.sections.some(s=>s.heading&&s.heading.startsWith('AI 已在')));a.closeModal();
  a.play(21);a.askAI(false);w=p.workers.at(-1);id=w.message.id;p.events.Hide();assert(w.terminated);w.receive({id,i:61});assert.equal(a.session.state.moves.length,3);p.events.Show({});a.askAI(false);w=p.workers.at(-1);w.receive({id:w.message.id,i:61});assert.equal(a.session.state.moves.length,4);assert.equal(a.session.state.turn,a.session.state.human);
 }finally{a.destroy();}
});

test('小游戏设置能选择执白/19路；计分确认锁定、数据清除和Worker错误均正确处理',()=>{
 const p=platform(),a=p.app;try{
  a.openSettings(true);p.tapId('setting-size-19');p.tapId('setting-human-2');p.tapId('modal-confirm');assert.equal(a.session.state.n,19);assert.equal(a.session.state.human,2);a.askAI(false);let w=p.workers.at(-1);w.error();assert(a.aiError);assert.equal(a.session.state.moves.length,0);assert.equal(a.busy,false);
  a.askAI(false);w=p.workers.at(-1);w.receive({id:w.message.id,i:72});assert.equal(a.session.state.board[72],1);a.play(288);a.stopAI();a.finish();assert.equal(a.session.state.ended,true);a.play(72);assert.deepEqual(a.session.state.dead,[72]);a.finish();assert.equal(a.session.state.scored,true);assert.equal(Store.stats().games,1);a.session.finish();assert.equal(a.session.stats.games,1);
  a.navigate('about');a.clearData();a.navigate('game');assert.deepEqual(a.session.state.board,Array(81).fill(0));assert.equal(Store.stats().games,0);assert.equal(a.session.state.scored,false);
  p.failStorage();a.play(20);assert.equal(a.saved,false);assert.match(p.notices.at(-1).title,/暂未保存/);
 }finally{a.destroy();}
});

test('全部16课在小游戏界面完成并保存，课程返回保持筛选，分享不携带棋局信息',()=>{
 const p=platform(),a=p.app;try{
  a.navigate('learn');a.filters={category:'战术与死活',status:1};a.render();
  for(let i=0;i<lessons.length;i++){
   a.openLesson(i);const l=lessons[i];if(['libs','eyes','coordinates','compare'].includes(l.mode))l.targets.forEach(p=>a.pickLesson(p));else if(l.mode==='score')a.answerLesson(1);else if(l.mode==='choice')a.answerLesson(l.answer);else if(l.mode==='ko'){a.pickLesson(l.target);a.pickLesson(l.recapture);}else if(l.mode==='dead'){a.pickLesson(l.target);a.pickLesson(l.target);a.pickLesson(l.target);}else if(l.mode==='passes'){a.passLesson();a.passLesson();}else a.pickLesson(l.target);
   assert(a.lesson.done,'course '+i);assert(Store.stats().completed.includes(i));assert(a.painter.hits.some(h=>h.id==='header-learning'));
  }
  const share=a.shareData();assert.match(share.query,/screen=lesson&id=15/);assert.doesNotMatch(share.query,/board|moves|completed|openid/);
  a.navigate('learn');assert.equal(a.filters.category,'战术与死活');assert.equal(a.filters.status,1);assert.equal(a.stats().completed.length,16);a.filters={category:'全部课程',status:0};a.scroll.learn=0;a.render();p.tapId('continue-learning');assert.equal(a.lesson.index,0);
 }finally{a.destroy();}
});

test('小游戏从课程分享启动、窗口变化、滚动触点映射和菜单安全区正常',()=>{
 const p=platform({query:{screen:'lesson',id:'14',entry:'first'}}),a=p.app;try{
  assert.equal(a.screen,'lesson');assert.equal(a.lesson.index,14);const original=a.session.state.board.slice();p.resize(320,568);assert.equal(p.canvas.width,640);assert(a.viewport.top>=90);assert(a.boardRect.size<=288);delete p.wx.getMenuButtonBoundingClientRect;a.resize();assert(a.headerTop>=89,'reserve space for the capsule when its API is unavailable');assert.deepEqual(a.session.state.board,original);
  const screenTop=a.viewport.top+20;p.emit('TouchStart',[{x:120,y:screenTop+60}]);p.emit('TouchMove',[{x:120,y:screenTop-40}]);p.emit('TouchEnd',[{x:120,y:screenTop-40}]);assert(a.scroll.lesson>0);assert.equal(a.lesson.done,false);
  a.navigate('game');a.session.reset(19,1,0);a.toggleGlobal();assert.equal(a.maxScroll.game,0);for(const id of ['undo','hint','pass','finish']){if(id!=='undo')assert(a.painter.hits.some(h=>h.id===id),id+' remains visible in compact global mode');}a.toggleGlobal();p.events.Hide();p.events.Show({query:{screen:'lesson',id:'6',entry:'second'}});assert.equal(a.lesson.index,6);assert.equal(a.screen,'lesson');a.navigate('game');p.events.Hide();p.events.Show({query:{screen:'lesson',id:'6',entry:'second'}});assert.equal(a.screen,'game','same share query must not reopen a course on ordinary resume');
 }finally{a.destroy();}
});


test('全屏棋盘充分利用小屏宽度，底部控件固定可见且角点触摸不偏移',async()=>{
 for(const [width,height] of [[320,568],[390,844],[240,360]])for(const n of [9,13,19]){
  const p=platform({width,height}),a=p.app;
  try{
   a.session.reset(n,1,0);a.render();p.tapId('global-mode');
   const b={...a.boardRect};assert.equal(a.maxScroll.game,0);
   if(width>=320)assert.equal(b.size,width,'use the entire screen width when height permits');
   assert(b.y>=a.viewport.top+36);assert(b.y+b.size<=a.viewport.bottom-80);
   const bottom=a.painter.hits.find(h=>h.id==='finish');assert.equal(bottom.y+bottom.h,a.viewport.bottom);
   for(const id of ['global-mode','view-normal','view-liberties','view-influence','view-territory','hint','pass','finish','preview-toggle','score-analysis']){
    const hit=a.painter.hits.find(h=>h.id===id);assert(hit,id);assert(hit.x>=0&&hit.x+hit.w<=width);assert(hit.y>=0&&hit.y+hit.h<=height-34);
   }
   assert(!a.painter.hits.some(h=>h.id.startsWith('nav-')));
   p.tapId('view-territory');assert.equal(a.view,'territory');assert.deepEqual(a.boardRect,b);assert.equal(a.session.state.moves.length,0);
   const pt=p.point(n*n-1);p.emit('TouchStart',[pt]);await pause(22);p.flush();assert.equal(a.preview.i,n*n-1);assert.deepEqual(a.boardRect,b);p.emit('TouchEnd',[pt]);assert.equal(a.session.state.moves.length,0);
   p.tap(pt.x,pt.y);assert.equal(a.session.state.board[n*n-1],1);assert.equal(a.session.state.moves.length,1);
   p.tapId('global-mode');assert.equal(a.globalMode,false);assert(a.painter.hits.some(h=>h.id==='nav-learn'));
  }finally{a.destroy();}
 }
});
