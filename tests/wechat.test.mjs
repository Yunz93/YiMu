import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const require=createRequire(import.meta.url);
const E=require('../wechat/miniprogram/shared/engine.js');
const {lessons}=require('../wechat/miniprogram/shared/lessons.js');
const {Session,fresh}=require('../wechat/miniprogram/utils/session.js');
const {Lesson}=require('../wechat/miniprogram/utils/lesson.js');
const {BoardGesture,pointAt}=require('../wechat/miniprogram/utils/gesture.js');
const Store=require('../wechat/miniprogram/utils/storage.js');
const blank=n=>Array(n*n).fill(0);
const makeBoard=(stones,n=5)=>{const b=blank(n);stones.forEach(([i,c])=>b[i]=c);return b;};
function platform(){
 const values=new Map(),workers=[],notifications=[],routes=[];let failWrite=false;
 const wx={getStorageSync:k=>values.get(k)??'',setStorageSync:(k,v)=>{if(failWrite)throw new Error('quota');values.set(k,JSON.parse(JSON.stringify(v)));},removeStorageSync:k=>values.delete(k),getWindowInfo:()=>({windowWidth:390,windowHeight:700,pixelRatio:2}),nextTick:fn=>fn(),showToast:o=>notifications.push(o),showModal:o=>{notifications.push(o);if(o.success)o.success({confirm:true});},hideTabBar:o=>{if(o.success)o.success();},showTabBar:o=>{if(o.success)o.success();},setNavigationBarTitle:()=>{},navigateTo:o=>routes.push(o),redirectTo:o=>routes.push(o),switchTab:o=>routes.push(o),createWorker:()=>{const w={onMessage(fn){this.receive=fn;},onError(fn){this.error=fn;},postMessage(m){this.message=m;},terminate(){this.terminated=true;}};workers.push(w);return w;}};
 globalThis.wx=wx;return {wx,values,workers,notifications,routes,failWrite:()=>{failWrite=true;}};
}
function loadPage(name,wx){
 const path=new URL(`../wechat/miniprogram/pages/${name}/index.js`,import.meta.url),local=createRequire(path);let definition;
 vm.runInNewContext(readFileSync(path,'utf8'),{require:local,Page:d=>{definition=d;},wx,setTimeout,clearTimeout,console});
 const page={...definition,data:JSON.parse(JSON.stringify(definition.data)),selectComponent:()=>null,setData(update){for(const [path,value] of Object.entries(update)){const parts=path.split('.');let target=this.data;for(const p of parts.slice(0,-1)){target[p]??={};target=target[p];}target[parts.at(-1)]=value;}}};
 return page;
}

test('小程序纯预览与真实规则共享，19路保存/恢复/悔棋保持正确回合',()=>{
 const s=new Session(null);s.reset(19,1,0);const before=JSON.stringify(s.state),p=s.preview(288);
 assert.equal(JSON.stringify(s.state),before);assert.equal(s.stats.moves,0);assert.equal(p.libs,4);
 assert(!s.move(288).error);assert(!s.move(72,2).error);assert.equal(s.stats.moves,1);
 const restored=new Session(s.state,s.stats);assert.equal(restored.state.board[288],1);assert.equal(restored.state.turn,1);
 assert(restored.undo());assert.deepEqual(restored.state.board,blank(19));assert.equal(restored.state.turn,1);assert.equal(restored.stats.moves,1);
 const invalid={...s.state,board:[1]};assert.equal(new Session(invalid).state.n,9);
});

test('小程序双方停一手数子，标记整块死棋，结果只能累计一次，恢复对弈保留轮次',()=>{
 const s=new Session(null);assert(!s.move(20).error);assert(!s.move(60,2).error);s.move(-1);s.move(-1,2);
 assert.equal(s.state.ended,true);assert.equal(s.state.turn,1);assert(s.resume());assert.equal(s.state.passes,0);
 s.enterScoring();s.toggleDead(60);assert.deepEqual(s.state.dead,[60]);assert.equal(s.result().removed[2],1);
 const score=s.finish();assert(score);s.finish();assert.equal(s.stats.games,1);assert.equal(s.toggleDead(20),false);assert.equal(s.resume(),false);
 s.reset(13,2,1);assert.equal(s.state.turn,1);assert.equal(s.state.human,2);assert.equal(s.stats.games,1);
});

test('所有16课可以交互完成，禁入点/打劫/公活实际使用规则引擎',()=>{
 assert.equal(lessons.length,16);
 for(let index=0;index<lessons.length;index++){
  const model=new Lesson(index),l=model.lesson;
  if(['libs','eyes','coordinates','compare'].includes(l.mode))l.targets.forEach(i=>model.click(i));
  else if(l.mode==='score')model.answer(1);
  else if(l.mode==='choice')model.answer(l.answer);
  else if(l.mode==='ko'){model.click(l.target);assert.equal(model.done,false);model.click(l.recapture);}
  else if(l.mode==='dead'){model.click(l.target);model.click(l.target);model.click(l.target);}
  else if(l.mode==='passes'){model.pass();assert.equal(model.done,false);model.pass();}
  else model.click(l.target);
  assert.equal(model.done,true,`lesson ${index}`);assert.match(model.feedback,/✓/);
  if(l.mode==='ko')assert.equal(model.board[l.recapture],0);
  if(l.mode==='seki')assert.equal(model.captured.length,5);
 }
 const suicide=new Lesson(2);suicide.click(7);assert.equal(suicide.done,false);suicide.click(12);assert(suicide.done);
 const wrong=new Lesson(3);wrong.answer(0);assert.equal(wrong.done,false);
});

test('微信存储合并学习中心的新进度，重复完成不累加，存储失败有返回值',()=>{
 const p=platform(),session=new Session(null);session.move(20);assert(Store.completeLesson(4));assert(Store.completeLesson(4));
 assert(Store.saveGame(session));assert.deepEqual(Store.stats(),{moves:1,games:0,completed:[4]});
 p.values.set(Store.KEYS.stats,'null');assert.deepEqual(Store.stats(),{moves:0,games:0,completed:[]});
 p.values.set(Store.KEYS.stats,{moves:-2,completed:[1,1,40],games:NaN});assert.deepEqual(Store.stats(),{moves:0,games:0,completed:[1]});
 p.failWrite();assert.equal(Store.saveGame(session),false);assert.equal(Store.completeLesson(5),false);
});

test('小程序手势轻点一次落子，长按拖动松手零落子，滑动和多指取消',()=>{
 let pending,picks=[],previews=[],clears=0;const size=340,n=19;
 const g=new BoardGesture({pointAt:(x,y)=>pointAt(x,y,size,n),onPick:i=>picks.push(i),onPreview:i=>previews.push(i),onClear:()=>clears++,schedule:fn=>{pending=fn;return 1;},unschedule:()=>{pending=null;}});
 const at=i=>({x:size*.075+i%n*size*.85/(n-1),y:size*.075+Math.floor(i/n)*size*.85/(n-1)});
 let p=at(288);g.start(p.x,p.y);g.end(p.x,p.y);assert.deepEqual(picks,[288]);
 g.start(p.x,p.y);pending();assert.deepEqual(previews,[288]);const q=at(289);g.move(q.x,q.y);g.end(q.x,q.y);assert.deepEqual(picks,[288]);assert.deepEqual(previews,[288,289]);assert.equal(clears,1);
 g.start(q.x,q.y);g.end(q.x,q.y);assert.deepEqual(picks,[288,289]);
 g.start(p.x,p.y);g.move(p.x+20,p.y);assert.equal(pending,null);g.end(p.x+20,p.y);assert.equal(picks.length,2);
 g.start(p.x,p.y);g.move(p.x,p.y,2);assert.equal(pending,null);g.end(p.x,p.y);assert.equal(picks.length,2);
 assert.equal(pointAt(-50,20,size,n),-1);
});

test('游戏页推荐详情只读；切页后迟到的AI结果不会改棋局，回来可恢复AI回合',()=>{
 const p=platform(),page=loadPage('game',p.wx);page.onLoad();page.onShow();
 page.hint();let w=p.workers.at(-1),id=w.message.id;
 w.receive({id,i:20,reply:60,alternatives:[24,56],compared:4});
 assert(page.data.detail);assert.equal(page.data.hintAt,20);assert.equal(p.values.has(Store.KEYS.game),false);assert.equal(page.data.busy,false);
 page.closeDetail();page.preview({detail:{i:21}});page.clearPreview();assert.equal(page.data.hintAt,20);
 page.pick({detail:{i:20}});page.askAI(false);w=p.workers.at(-1);id=w.message.id;
 assert.equal(p.values.get(Store.KEYS.game).moves.length,1);page.onHide();assert(w.terminated);
 w.receive({id,i:60});assert.equal(p.values.get(Store.KEYS.game).moves.length,1);
 page.onShow();page.askAI(false);w=p.workers.at(-1);w.receive({id:w.message.id,i:60});assert.equal(p.values.get(Store.KEYS.game).moves.length,2);assert.equal(page.data.turnLabel,'轮到你落子');page.openAnalysis();assert.match(page.data.detail.response,/AI 最近在/);assert.match(page.data.detail.responseNote,/已经发生/);page.onHide();
});

test('AI Worker失败和全局切换不会伪造落子，白方设置可启动AI先行',()=>{
 const p=platform(),page=loadPage('game',p.wx);page.onLoad();page.onShow();page.hint();p.workers.at(-1).error();assert.equal(page.data.busy,false);assert(page.data.aiError);assert.equal(p.values.has(Store.KEYS.game),false);
 page.openNew();page.settingChange({currentTarget:{dataset:{field:'color'}},detail:{value:1}});page.applySettings();assert.equal(page._session.state.human,2);
 page.askAI(false);const w=p.workers.at(-1);page.toggleGlobal();assert.equal(w.terminated,undefined);assert(page.data.globalMode);w.receive({id:w.message.id,i:20});assert.equal(page.data.board[20],1);assert.equal(page.data.turnLabel,'轮到你落子');page.onHide();assert.equal(page.data.globalMode,false);
});

test('学习中心筛选、继续课程和完成记录跨页面同步，清除数据后不会复活旧存档',()=>{
 const p=platform();p.values.set(Store.KEYS.stats,{moves:42,games:2,completed:[1,4]});const learn=loadPage('learn',p.wx);learn.onShow();assert.equal(learn.data.courses.length,16);learn.resume();assert.match(p.routes.at(-1).url,/id=0/);
 learn.filterStatus({detail:{value:2}});assert.equal(learn.data.courses.length,2);learn.filterCategory({currentTarget:{dataset:{category:'战术与死活'}}});assert.equal(learn.data.courses.length,0);
 const lesson=loadPage('lesson',p.wx);lesson.onLoad({id:'0'});[7,11,13,17].forEach(i=>lesson.pick({detail:{i}}));assert.equal(Store.stats().completed.length,3);assert.equal(Store.stats().moves,42);learn.onShow();assert.equal(learn.data.statusIndex,2);
 learn.resetFilters();assert.equal(learn.data.stats.completed.length,3);learn.resume();assert.match(p.routes.at(-1).url,/id=2/);
 const game=loadPage('game',p.wx);game.onLoad();game.onShow();game.pick({detail:{i:20}});game.onHide();Store.clear();game.onShow();assert.deepEqual(Array.from(game.data.board),blank(9));game.onHide();
});

test('微信Worker入口传输实际搜索的合法落点、应手和备选',()=>{
 const path=new URL('../wechat/miniprogram/workers/ai.js',import.meta.url),local=createRequire(path);let handler,result;
 vm.runInNewContext(readFileSync(path,'utf8'),{require:local,worker:{onMessage(fn){handler=fn;},postMessage(value){result=value;}}});
 const b=blank(9);handler({id:7,board:b,color:1,n:9,history:[E.key(b)],difficulty:0});assert.equal(result.id,7);assert(!E.play(b,result.i,1,9).error);assert.equal(result.alternatives.length,2);assert(Number.isInteger(result.reply));
});

test('Canvas棋盘组件在9/19路真实事件链上长按只读、下一次轻点立即落子',async()=>{
 for(const n of [9,19]){
  const p=platform(),page=loadPage('game',p.wx);page.onLoad();page.onShow();page._session.reset(n,1,0);page.render();
  const path=new URL('../wechat/miniprogram/components/go-board/index.js',import.meta.url),local=createRequire(path);let definition;
  vm.runInNewContext(readFileSync(path,'utf8'),{require:local,Component:d=>{definition=d;},wx:p.wx,setTimeout,clearTimeout,console});
  const calls=[],ctx=new Proxy({}, {get:(target,key)=>key==='createRadialGradient'?()=>({addColorStop(){}}):target[key]??((...args)=>calls.push([key,...args])),set:(target,key,value)=>{target[key]=value;return true;}});
  const canvas={getContext:()=>ctx};
  const component={data:{holding:false},properties:Object.fromEntries(Object.entries(definition.properties).map(([k,v])=>[k,v.value])),...definition.methods,setData(update){Object.assign(this.data,update);},createSelectorQuery(){return {select(){return this;},fields(){return this;},exec(fn){fn([{node:canvas,width:340,height:340}]);}};},triggerEvent(name,detail){if(name==='pick')page.pick({detail});if(name==='preview')page.preview({detail});if(name==='clearpreview')page.clearPreview();sync();}};
  function sync(){Object.assign(component.properties,{size:340,n,board:page.data.board,last:page.data.last,previewAt:page.data.previewAt,captured:page.data.captured,liberties:page.data.liberties,groupStones:page.data.groupStones,previewEnabled:page.data.canPreview,disabled:page.data.busy,owners:page.data.owners,influence:page.data.inf});component.paint();}
  sync();definition.lifetimes.attached.call(component);
  const i=n===19?288:20,step=340*.85/(n-1),touch={x:340*.075+i%n*step,y:340*.075+Math.floor(i/n)*step};
  component.touchStart({touches:[touch]});await new Promise(r=>setTimeout(r,430));
  assert.equal(page.data.previewAt,i);assert.equal(component.data.holding,true);assert.equal(p.values.has(Store.KEYS.game),false);assert.equal(p.workers.length,0);
  component.touchEnd({changedTouches:[touch]});assert.equal(page.data.previewAt,-1);assert.equal(component.data.holding,false);assert.equal(p.values.has(Store.KEYS.game),false);
  component.touchStart({touches:[touch]});component.touchEnd({changedTouches:[touch]});assert.equal(p.values.get(Store.KEYS.game).board[i],1);assert.equal(p.values.get(Store.KEYS.game).moves.length,1);
  assert(calls.some(c=>c[0]==='fillText'&&c[1]==='A'));assert(calls.some(c=>c[0]==='fillText'&&c[1]===(n===19?'T':'J')));
  assert.equal(canvas.width,680);assert(calls.some(c=>c[0]==='arc'));
  page.onHide();definition.lifetimes.detached.call(component);
 }
});
