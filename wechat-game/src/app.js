const E=require('../shared/engine');
const {Session}=require('../utils/session');
const {Lesson}=require('../utils/lesson');
const {lessons}=require('../shared/lessons');
const Store=require('../utils/storage');
const {BoardGesture,pointAt}=require('../utils/gesture');
const {coord,signed}=require('../utils/format');
const {Painter,COLORS:C}=require('./painter');
const Views=require('./views');
const config=require('../config');
const {StoneSound}=require('../utils/sound');
const inside=(p,r)=>r&&p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;
class YiMuGame{
 constructor(api,canvas,options={}){
  this.api=api;this.canvas=canvas;this.context=canvas.getContext('2d');this.painter=new Painter(this.context);this.config=config;this.signed=signed;
  this.requestFrame=options.requestFrame||((fn)=>setTimeout(fn,0));this.cancelFrame=options.cancelFrame||clearTimeout;this.gestureDelay=options.gestureDelay??400;
  this.session=new Session(Store.read(Store.KEYS.game,null),Store.stats());this.previewEnabled=Store.read(Store.KEYS.preview,true)!==false;
  this.soundEnabled=Store.read(Store.KEYS.sound,true)!==false;this.sound=new StoneSound(api,this.soundEnabled);
  this.screen='game';this.view='normal';this.globalMode=false;this.saved=true;this.busy=false;this.aiError='';this.selected=-1;this.preview=null;this.hint=null;this.modal=null;
  this.scroll={game:0,learn:0,lesson:0,about:0};this.maxScroll={game:0,learn:0,lesson:0,about:0};this.filters={category:'全部课程',status:0};this.serial=0;this.removers=[];this.active=false;this.destroyed=false;
 }
 start(){
  this.active=true;this.resize();
  const listen=(name,fn)=>{if(typeof this.api[name]==='function'){this.api[name](fn);const off='off'+name.slice(2);this.removers.push(()=>{if(this.api[off])this.api[off](fn);});}};
  listen('onTouchStart',e=>this.touchStart(e));listen('onTouchMove',e=>this.touchMove(e));listen('onTouchEnd',e=>this.touchEnd(e));listen('onTouchCancel',()=>this.cancelTouch());
  listen('onHide',()=>this.hide());listen('onShow',o=>this.show(o));listen('onWindowResize',()=>this.resize());
  if(this.api.showShareMenu)this.api.showShareMenu({withShareTicket:false});
  listen('onShareAppMessage',()=>this.shareData());
  this.applyLaunch(this.api.getLaunchOptionsSync?this.api.getLaunchOptionsSync():{});this.render();this.scheduleAI();return this;
 }
 stats(){return Store.stats();}
 resize(){this.cancelTouch();const info=this.api.getWindowInfo?this.api.getWindowInfo():this.api.getSystemInfoSync();this.width=Math.max(240,info.windowWidth||info.screenWidth||375);this.height=Math.max(360,info.windowHeight||info.screenHeight||667);const safe=info.safeArea||{};this.safeBottom=Math.max(0,this.height-(safe.bottom||this.height));let menu={};try{if(this.api.getMenuButtonBoundingClientRect)menu=this.api.getMenuButtonBoundingClientRect();}catch{}
  this.headerTop=Math.max(safe.top||0,menu.bottom||((safe.top||0)+32))+10;this.headerTop=Math.min(this.headerTop,this.height/4);const fullscreen=this.globalMode&&this.screen==='game';this.fullscreenHeaderY=Math.max(0,this.headerTop-42);this.menuLeft=menu.left>0?menu.left:this.width-106;const top=fullscreen?this.headerTop-4:this.headerTop+38,bottom=this.height-this.safeBottom-(fullscreen?0:62);this.viewport={top,bottom,height:bottom-top};
  const dpr=Math.min(3,Math.max(1,info.pixelRatio||1));this.canvas.width=Math.round(this.width*dpr);this.canvas.height=Math.round(this.height*dpr);this.context.scale(dpr,dpr);this.render();
 }
 invalidate(){if(!this.active||this.destroyed||this.frame!==undefined)return;this.frame=this.requestFrame(()=>{this.frame=undefined;this.render();});}
 render(){if(!this.active||!this.viewport||this.destroyed)return;const p=this.painter,w=this.width,h=this.height;p.begin(w,h);this.boardRect=null;
  p.startScroll(this.viewport.top,this.viewport.bottom,this.scroll[this.screen]);const fn={game:Views.gameView,learn:Views.learnView,lesson:Views.lessonView,about:Views.aboutView}[this.screen];const contentHeight=fn(this,p,w);p.endScroll(h);
  this.maxScroll[this.screen]=Math.max(0,contentHeight-this.viewport.height);if(this.scroll[this.screen]>this.maxScroll[this.screen]){this.scroll[this.screen]=this.maxScroll[this.screen];this.render();return;}
  p.ctx.fillStyle=C.bg;p.ctx.fillRect(0,0,w,this.viewport.top);
  if(this.globalMode&&this.screen==='game'){
   // Keep the exit next to (never over) the system capsule. No brand or slogan here.
   p.button('global-mode','退出全屏',8,this.fullscreenHeaderY,96,36,()=>this.toggleGlobal(),{quiet:true,icon:'shrink'});
   if(this.menuLeft>=200)p.text(this.session.state.n+' 路 · 你执'+(this.session.state.human===1?'黑':'白'),112,this.fullscreenHeaderY+13,10,C.muted);
  }else{
   // Use the free space to the left of WeChat's capsule for the brand.
   const by=Math.max(8,this.headerTop-38);p.brand(16,by,30);
   const title={game:'YiMu · 一目',learn:'学习中心',lesson:'互动课程 · '+String(this.lesson?this.lesson.index+1:1).padStart(2,'0'),about:'关于一目'}[this.screen];
   p.text(title,56,by+2,this.screen==='game'?19:18,C.ink,'600');p.text('Y I M U   G O',57,by+24,7,C.muted);
   p.text(this.screen==='game'?'每一手，都看得懂。':'慢慢来，每一步都算数。',16,this.headerTop+10,12,C.muted);
   if(this.screen==='game'&&!this.globalMode&&w>=320){p.circle(w-174,this.headerTop+16,2,this.saved?'#8eaa78':C.risk);p.text(this.saved?'本机存档':'未保存',w-166,this.headerTop+11,9,this.saved?C.muted:C.risk);}
   if(this.screen==='game')p.button('global-mode','全屏模式',w-103,this.headerTop,91,34,()=>this.toggleGlobal(),{quiet:true,icon:'expand'});
   else if(this.screen==='lesson')p.button('header-learning','学习中心',w-103,this.headerTop,91,34,()=>this.navigate('learn'),{quiet:true,icon:'book'});
   else p.button('share','分享',w-77,this.headerTop,65,34,()=>this.share(),{quiet:true,icon:'arrow'});
  }
  if(!(this.globalMode&&this.screen==='game')){
   const y=h-this.safeBottom-58;p.ctx.fillStyle='#ffffff';p.ctx.fillRect(0,y,w,58+this.safeBottom);p.rule(0,y,w);const tabw=w/3;
   [['game','学习棋局','grid'],['learn','学习中心','book'],['about','关于一目','info']].forEach(([id,label,icon],i)=>{
    const selected=this.screen===id||this.screen==='lesson'&&id==='learn',cx=tabw*(i+.5),color=selected?C.green:'#9aa492';
    if(selected)p.card(cx-24,y+5,48,26,C.sage,null,9);p.icon(icon,cx-9,y+9,18,color);p.text(label,cx,y+36,10,color,selected?'600':'normal','center');p.hit('nav-'+id,i*tabw,y,tabw,58,()=>this.navigate(id));
   });
  }
  const max=this.maxScroll[this.screen];if(max>0&&!this.modal){const th=Math.max(28,this.viewport.height*this.viewport.height/(contentHeight||1)),ty=this.viewport.top+(this.viewport.height-th)*this.scroll[this.screen]/max;p.card(w-4,ty,2,th,'#b9c9ad',null,1);}
  if(this.preview)Views.previewView(this,p,w);if(this.modal)Views.modalView(this,p,w,h);
 }
 snapshot(){const s=this.session.state,trial=this.preview&&!this.preview.error?this.preview:null;const actual=s.ended?this.session.result():E.estimate(s.board,s.n,s.komi),score=trial?trial.after:actual,board=trial?trial.board:s.board,last=s.moves[s.moves.length-1],m=this.session.lastHuman();let g=null;const focus=trial?trial.i:this.selected>=0?this.selected:m?m.i:last?last.i:-1;if((trial||this.view==='liberties')&&focus>=0&&board[focus])g=E.group(board,focus,s.n);
  let coach={label:'落子之前',tag:'小贴士',title:'第一手，从一个角开始。',text:'角部有两条边帮忙，通常更容易围地。试着从三路或四路的角部开始，也可以先点击给我提示。'};
  const suggestion=this.hint,exp=trial?trial.explanation:suggestion?suggestion.explanation:m?m.explanation:null;if(exp)coach={label:trial?'试落 · '+coord(trial.i,s.n):suggestion?'推荐落点 · '+coord(suggestion.i,s.n):'你的这一手 · '+coord(m.i,s.n),tag:exp.tag,title:exp.title,text:exp.text};
  if(this.preview&&this.preview.error)coach={label:'规则检查',tag:'不合法',title:'换一个落点试试看',text:this.preview.error};
  if(s.ended)coach={label:s.scored?'棋局已完成':'一起数一数',tag:'中国规则',title:s.scored?'这一局，又多懂了一点。':'先确认死子，再计算地盘。',text:'点击棋子标记整块死棋；公活保留。活子与围住的空点相加，白棋加 7.5 点。提子不重复加分，有争议时继续对弈。'};
  return {score,scoreLabel:s.ended?'终局数子':trial?'试落估算':'实时估算',turn:s.ended?'数子中':this.busy?'AI 思考中':s.turn===s.human?'轮到你落子':'等待 AI 应对',coach,board:{n:s.n,board,last:trial?-1:last?last.i:-1,previewAt:trial?trial.i:-1,hintAt:suggestion?suggestion.i:-1,captured:trial?trial.captured:[],liberties:g?[...g.libs]:[],groupStones:g?g.stones:[],inf:this.view==='influence'||trial&&this.view==='normal'?score.inf||E.influence(board,s.n):[],owners:this.view==='territory'?score.owner:[],dead:s.dead}};
 }
 point(t){return {x:Number(t.clientX??t.pageX??t.x),y:Number(t.clientY??t.pageY??t.y)};}
 touchStart(event){this.cancelTouch();if(!this.active)return;const touches=event.touches||[];if(touches.length!==1)return;const p=this.point(touches[0]);if(!Number.isFinite(p.x)||!Number.isFinite(p.y))return;const modal=this.modal,region=modal?this.modalViewport:this.viewport,zone=p.y>=region.top&&p.y<=region.bottom?(modal?'modal':'body'):'none';
  const hit=[...this.painter.hits].reverse().find(r=>inside(p,r));this.touch={origin:p,last:p,hit,zone,moved:false,initialScroll:modal?modal.scroll||0:this.scroll[this.screen]};
  const board=this.boardRect;if(!modal&&zone==='body'&&board&&inside(p,{x:board.x,y:board.y,w:board.size,h:board.size})){
   this.gesture=new BoardGesture({pointAt:(x,y)=>pointAt(x,y,board.size,board.n),delay:this.gestureDelay,canPreview:()=>board.kind==='game'&&this.previewEnabled&&!this.busy&&!this.session.state.ended&&this.session.state.turn===this.session.state.human,onPick:i=>board.kind==='lesson'?this.pickLesson(i):this.play(i),onPreview:i=>{const s=this.session.state;this.preview=i>=0&&!s.board[i]?this.session.preview(i):null;this.invalidate();},onClear:()=>{this.preview=null;this.invalidate();}});this.touch.board=board;this.gesture.start(p.x-board.x,p.y-board.y);
  }
 }
 touchMove(event){if(!this.touch)return;const touches=event.touches||[];if(touches.length!==1){this.cancelTouch();return;}const p=this.point(touches[0]),t=this.touch;if(!Number.isFinite(p.x)||!Number.isFinite(p.y)){this.cancelTouch();return;}t.last=p;const held=this.gesture&&this.gesture.holding;if(this.gesture)this.gesture.move(p.x-t.board.x,p.y-t.board.y,touches.length);if(held)return;
  if(Math.hypot(p.x-t.origin.x,p.y-t.origin.y)>10)t.moved=true;if(t.moved&&t.zone!=='none'){const max=t.zone==='modal'?this.modal&&this.modal.maxScroll||0:this.maxScroll[this.screen],scroll=Math.max(0,Math.min(max,t.initialScroll+t.origin.y-p.y));if(t.zone==='modal'&&this.modal)this.modal.scroll=scroll;else this.scroll[this.screen]=scroll;this.invalidate();}
 }
 touchEnd(event){if(!this.touch)return;if(event.touches&&event.touches.length){this.cancelTouch();return;}const t=this.touch,last=(event.changedTouches||[])[0],p=last?this.point(last):t.last,g=this.gesture;this.touch=null;this.gesture=null;if(g){g.end(p.x-t.board.x,p.y-t.board.y);return;}if(!t.moved&&t.hit&&Math.hypot(p.x-t.origin.x,p.y-t.origin.y)<=10)t.hit.action();}
 cancelTouch(){const g=this.gesture;this.gesture=null;this.touch=null;if(g)g.cancel();if(this.preview){this.preview=null;this.invalidate();}}
 toast(title){this.lastNotice=title;if(this.api.showToast)this.api.showToast({title,icon:'none'});}
 save(){this.saved=Store.saveGame(this.session);if(!this.saved)this.toast('存储空间不足，本次进度暂未保存');}
 navigate(screen){if(!['game','learn','about'].includes(screen))return;this.cancelTouch();this.stopAI();this.hint=null;this.modal=null;this.globalMode=false;this.screen=screen;this.session.stats=Store.stats();this.resize();this.scheduleAI();}
 openLesson(index){if(!Number.isInteger(index)||!lessons[index])return;this.cancelTouch();this.stopAI();this.hint=null;this.modal=null;this.globalMode=false;this.lesson=new Lesson(index);this.screen='lesson';this.scroll.lesson=0;this.resize();}
 finishLesson(done){if(done&&!Store.completeLesson(this.lesson.index))this.toast('本课已完成，但进度暂未保存');this.render();}
 pickLesson(i){const before=this.lesson.board.slice(),done=this.lesson.click(i);if(this.lesson.board.some((v,j)=>v&&!before[j]))this.sound.play();this.finishLesson(done);}answerLesson(i){this.finishLesson(this.lesson.answer(i));}passLesson(){this.finishLesson(this.lesson.pass());}
 play(i){const s=this.session.state;if(this.busy||this.screen!=='game')return;if(s.ended){if(this.session.toggleDead(i)){this.save();this.render();}return;}if(this.view==='liberties'&&s.board[i]){this.selected=i;this.preview=null;this.render();return;}this.preview=null;this.hint=null;const r=this.session.move(i);if(r.error){this.toast(r.error);this.render();return;}this.selected=-1;if(i>=0)this.sound.play();this.save();this.render();this.scheduleAI();}
 toggleSound(){this.soundEnabled=!this.soundEnabled;this.sound.setEnabled(this.soundEnabled);if(!Store.write(Store.KEYS.sound,this.soundEnabled))this.toast('音效设置暂未保存');this.render();}
 togglePreview(){if(this.busy||this.session.state.ended)return;this.cancelTouch();this.previewEnabled=!this.previewEnabled;if(!Store.write(Store.KEYS.preview,this.previewEnabled))this.toast('预览设置暂未保存');this.render();}
 toggleGlobal(){this.cancelTouch();this.globalMode=!this.globalMode;this.scroll.game=0;this.resize();}
 stopAI(){clearTimeout(this.aiTimer);clearTimeout(this.watchdog);this.serial++;if(this.worker){this.worker.terminate();this.worker=null;}this.busy=false;}
 scheduleAI(){clearTimeout(this.aiTimer);const s=this.session.state;if(this.active&&this.screen==='game'&&!this.modal&&!this.busy&&!s.ended&&s.turn!==s.human)this.aiTimer=setTimeout(()=>this.askAI(false),50);}
 askAI(isHint=false){const s=this.session.state;if(!this.active||this.screen!=='game'||this.busy||s.ended||isHint&&s.turn!==s.human)return;this.stopAI();this.cancelTouch();this.preview=null;this.busy=true;this.aiError='';const id=++this.serial,position=E.key(s.board);this.render();
  const fail=()=>{if(id!==this.serial)return;this.stopAI();this.aiError='AI 搜索未完成，请重试；若仍失败，请更新微信。';this.render();};
  try{const worker=this.api.createWorker('workers/ai.js');this.worker=worker;worker.onMessage(data=>{if(!this.active||this.screen!=='game'||id!==this.serial||data.id!==id||E.key(this.session.state.board)!==position)return;if(data.error){fail();return;}this.stopAI();
    if(isHint){if(data.i>=0){const p=this.session.preview(data.i);if(p.error){this.toast(p.error);this.render();return;}this.hint={...p,search:data};this.showAnalysis();}else{this.hint=null;this.toast('目前可以考虑停一手。');}}
    else{const r=this.session.move(data.i,s.turn);if(r.error){this.aiError=r.error;this.render();return;}this.hint=null;if(data.i>=0)this.sound.play();this.save();if(data.i===-1)this.toast('AI 选择停一手。');}this.render();
   });if(worker.onError)worker.onError(fail);if(worker.onProcessKilled)worker.onProcessKilled(fail);this.watchdog=setTimeout(fail,45000);worker.postMessage({id,board:s.board.slice(),color:isHint?s.human:s.turn,n:s.n,history:this.session.history(),difficulty:s.difficulty});
  }catch{fail();}
 }
 undo(){if(this.session.state.scored)return;this.stopAI();this.cancelTouch();this.hint=null;this.selected=-1;if(this.session.undo()){this.save();this.render();this.scheduleAI();}}
 pass(){const s=this.session.state;if(this.busy||s.scored)return;this.cancelTouch();this.hint=null;if(s.ended)this.session.resume();else{const r=this.session.move(-1);if(r.error){this.toast(r.error);return;}}this.save();this.render();this.scheduleAI();}
 confirm(title,content,action){if(this.api.showModal)this.api.showModal({title,content,success:r=>{if(r.confirm)action();}});}
 finish(){const s=this.session.state;if(this.busy)return;if(s.scored){this.openSettings(true);return;}if(!s.ended){this.confirm('准备一起数子了吗？','进入后先点击标记已确定的死棋，有争议的死活可以继续对弈。',()=>{this.stopAI();this.cancelTouch();this.hint=null;this.session.enterScoring();this.save();this.render();});return;}
  const result=this.session.result();this.confirm('确认棋局结果',`黑 ${result.black} 点，白 ${result.white+s.komi} 点（含贴目），中立 ${result.neutral} 点。请先确认死棋与公活，保存后本局结果将锁定。`,()=>{this.session.finish();this.save();this.render();});
 }
 openSettings(forceNew=false){this.stopAI();this.cancelTouch();const s=this.session.state;this.modal={kind:'settings',title:forceNew?'新一局，慢慢来':'让对局适合你',size:s.n,human:s.human,difficulty:s.difficulty,forceNew,scroll:0};this.render();}
 applySettings(){const m=this.modal;if(!m||m.kind!=='settings')return;const s=this.session.state,reset=m.forceNew||m.size!==s.n||m.human!==s.human;
  const apply=()=>{this.stopAI();this.cancelTouch();this.hint=null;this.selected=-1;if(reset)this.session.reset(m.size,m.human,m.difficulty);else s.difficulty=m.difficulty;this.aiError='';this.modal=null;this.save();this.render();this.scheduleAI();};
  if(reset&&s.moves.length)this.confirm('开启新对局？','当前棋局将被替换，已完成课程和累计统计会保留。',apply);else apply();
 }
 closeModal(){this.modal=null;this.render();this.scheduleAI();}
 showAnalysis(){this.cancelTouch();const s=this.session.state,sections=[];let title='这一手的依据';
  if(s.ended){title='怎样确认中国规则计分';sections.push({heading:'中国规则',text:'移除双方确认已死的整块棋，公活保留。活棋与围住的空点相加，白棋加 7.5 点。提子不重复加分，中立点不计入任何一方。'},{heading:'存在争议时',text:'继续对弈验证死活，不能只依靠局中估算。',risk:true});}
  else{const p=this.hint,m=this.session.lastHuman(),exp=p?p.explanation:m?m.explanation:null;if(!exp){title='第一手为什么常从角开始？';sections.push({heading:'借助两条边界',text:'角部通常更容易围空。三路偏重实地，四路兼顾向外发展。点击给我提示，查看搜索推荐的落点和具体依据。'});}
   else{title=(p?'为什么推荐 ':'这一手的依据 · ')+coord(p?p.i:m.i,s.n);sections.push({heading:exp.title,text:exp.reasons.join('\n')||exp.text});exp.risks.forEach(text=>sections.push({heading:'需要留意的代价',text,risk:true}));sections.push({heading:'接下来观察什么',text:exp.followUp},{text:`己方估算占点 ${signed(exp.ownDelta)}，对方 ${signed(exp.oppDelta)}。这是距离和势力估算，会随应手改变。`});
    if(p&&p.search){const search=p.search;if(Number.isInteger(search.reply)&&search.reply>=0){const r=E.previewMove(p.board,search.reply,3-s.human,s.n,[...this.session.history(),E.key(p.board)],s.komi);if(!r.error)sections.push({heading:'对方可能在 '+coord(search.reply,s.n)+' 应对',text:r.explanation.text+'这只是一种可能走法，对方不一定这样下。'});}
     for(const i of search.alternatives||[]){const a=this.session.preview(i);if(!a.error)sections.push({heading:'也搜索过 · '+coord(i,s.n),text:a.explanation.text});}}
    else if(m){const reply=[...s.moves].reverse().find(move=>move.color!==s.human&&move.i>=0);if(reply&&s.moves.indexOf(reply)>s.moves.indexOf(m)){const e=reply.explanation||E.explain(reply.before,reply.after,reply.i,reply.color,s.n,reply.captured);sections.push({heading:'AI 已在 '+coord(reply.i,s.n)+' 应对',text:e.text});}}
   }
  }
  sections.push({text:'查看讲解不会落子。AI 为入门搜索陪练，不保证最优，复杂死活需要继续验证。'});this.modal={kind:'analysis',title,sections,scroll:0};this.render();
 }
 clearData(){this.confirm('清除本机进度？','将删除当前小游戏的棋局、课程进度、累计统计、预览和音效设置，无法恢复；网页版数据不受影响。',()=>{if(Store.clear()){this.stopAI();this.session=new Session(null,Store.stats());this.previewEnabled=true;this.soundEnabled=true;this.sound.setEnabled(true);this.hint=null;this.preview=null;this.selected=-1;this.saved=true;this.toast('本机进度已清除');this.render();}else this.toast('清除失败，请重试');});}
 shareData(){const lesson=this.screen==='lesson'?this.lesson:null;return {title:lesson?'一目互动课 · '+lesson.lesson.title:'一目 · 每一手，都看得懂',query:`screen=${lesson?'lesson':this.screen==='learn'?'learn':'game'}${lesson?'&id='+lesson.index:''}&entry=${Date.now()}`};}
 share(){if(this.api.shareAppMessage)this.api.shareAppMessage(this.shareData());else this.toast('请通过微信右上角菜单分享');}
 applyLaunch(options){const q=options&&options.query||{};if(!q.screen)return;const key=q.entry||JSON.stringify(q);if(key===this.launchKey)return;this.launchKey=key;if(q.screen==='lesson'){const i=Number(q.id);if(Number.isInteger(i)&&lessons[i]){this.lesson=new Lesson(i);this.screen='lesson';this.scroll.lesson=0;}}else if(['game','learn'].includes(q.screen))this.screen=q.screen;}
 hide(){this.sound.stop();this.active=false;this.stopAI();this.cancelTouch();this.preview=null;this.modal=null;if(this.frame!==undefined){this.cancelFrame(this.frame);this.frame=undefined;}}
 show(options={}){if(this.destroyed)return;this.active=true;this.session=new Session(Store.read(Store.KEYS.game,null),Store.stats());this.previewEnabled=Store.read(Store.KEYS.preview,true)!==false;this.soundEnabled=Store.read(Store.KEYS.sound,true)!==false;this.sound.setEnabled(this.soundEnabled);this.selected=-1;this.preview=null;this.hint=null;this.aiError='';this.applyLaunch(options);this.resize();this.scheduleAI();}
 destroy(){this.hide();this.sound.destroy();this.destroyed=true;this.removers.forEach(fn=>fn());this.removers=[];}
}
module.exports={YiMuGame};
