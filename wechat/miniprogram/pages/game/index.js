const E=require('../../shared/engine');
const {Session}=require('../../utils/session');
const Store=require('../../utils/storage');
const {StoneSound}=require('../../utils/sound');
const {coord,signed}=require('../../utils/format');
const views=[{id:'normal',label:'棋盘'},{id:'liberties',label:'气'},{id:'influence',label:'势力'},{id:'territory',label:'地盘'}];
Page({
 data:{soundEnabled:true,views,view:'normal',globalMode:false,boardSize:300,previewEnabled:true,busy:false,settings:null,detail:null,saved:true,aiError:'',sizes:['9 路 · 入门','13 路 · 进阶','19 路 · 标准'],colors:['执黑 · 先行','执白 · 后行'],difficulties:['轻松入门','认真思考','深入挑战']},
 onLoad(){this._sound=new StoneSound(wx,Store.read(Store.KEYS.sound,true)!==false,'/audio/stone.wav');this._serial=0;this._view='normal';this._preview=null;this._hint=null;this._selected=-1;},
 onShow(){const enabled=Store.read(Store.KEYS.sound,true)!==false;this._sound.setEnabled(enabled);this.setData({soundEnabled:enabled});this._active=true;this._session=new Session(Store.read(Store.KEYS.game,null),Store.stats());this._preview=null;this._hint=null;this._selected=-1;this.setData({previewEnabled:Store.read(Store.KEYS.preview,true)!==false,aiError:'',detail:null,settings:null});this.resize();this.render();this.scheduleAI();},
 onHide(){if(this._sound)this._sound.stop();this._active=false;this.stopAI();this._preview=null;this._hint=null;this.cancelBoard();if(this.data.globalMode){this.setData({globalMode:false});wx.showTabBar({animation:false});}},
 onUnload(){this.onHide();if(this._sound)this._sound.destroy();},
 onResize(){this.resize();},
 resize(){const w=wx.getWindowInfo?wx.getWindowInfo():wx.getSystemInfoSync();const size=this.data.globalMode?Math.max(120,Math.min(w.windowWidth-28,w.windowHeight-250)):w.windowWidth-48;this.setData({boardSize:Math.floor(size)});},
 save(){const saved=Store.saveGame(this._session);this.setData({saved});if(!saved&&!this._storageWarned){this._storageWarned=true;this.toast('存储空间不足，本次进度暂未保存');}},
 toast(title){wx.showToast({title,icon:'none'});},
 cancelBoard(){const board=this.selectComponent('#game-board');if(board)board.cancelGesture();},
 render(){if(!this._session)return;const s=this._session.state,p=this._preview,trial=p&&!p.error?p:null;
  const actual=s.ended?this._session.result():E.estimate(s.board,s.n,s.komi),e=trial?trial.after:actual,b=trial?trial.board:s.board;
  const last=s.moves[s.moves.length-1],m=this._session.lastHuman();let g=null;
  const focus=trial?trial.i:this._selected>=0?this._selected:m?m.i:last?last.i:-1;
  if((trial||this._view==='liberties')&&focus>=0&&b[focus])g=E.group(b,focus,s.n);
  let coach={label:'落子之前',tag:'小贴士',title:'第一手，从一个角开始。',text:'角部有两条边帮忙，更容易围地。可以先看一看推荐落点，再慢慢尝试。',detail:'轻点立即落子；长按约 0.4 秒预览，松手不落子。'};
  if(m){const x=m.explanation||E.explain(m.before,m.after,m.i,m.color,s.n,m.captured);coach={label:'你的这一手 · '+coord(m.i,s.n),tag:x.tag,title:x.title,text:x.text,detail:'查看具体依据，理解气数、代价与后续应对。'};}
  if(this._hint){const h=this._hint;coach={label:'推荐落点 · '+coord(h.i,s.n),tag:h.explanation.tag,title:h.explanation.title,text:h.explanation.text,detail:'建议尚未落子，点击棋盘圆环即可落子。'};}
  if(p){coach={label:'试落 · '+coord(p.i,s.n),tag:p.error?'不合法':p.explanation.tag,title:p.error?'换一个落点试试看':p.explanation.title,text:p.error||p.explanation.text,detail:'长按并拖动换点；松手收起，不落子。'};}
  if(s.ended)coach={label:s.scored?'棋局已完成':'一起数一数',tag:'中国规则',title:s.scored?'这一局，又多懂了一点。':'先确认死子，再计算地盘。',text:'点击棋子标记或取消整块死棋。活棋与围住的空点合计，白棋加 7.5 点。公活保留，有争议时继续对弈。',detail:'提子不再额外重复加分；复杂死活需要双方确认。'};
  const captures={black:0,white:0};s.moves.forEach(move=>captures[move.color===1?'black':'white']+=move.captured.length);
  this.setData({n:s.n,canPreview:this.data.previewEnabled&&!this.data.busy&&!s.ended&&s.turn===s.human,board:b,last:trial?-1:last?last.i:-1,previewAt:trial?trial.i:-1,hintAt:this._hint?this._hint.i:-1,captured:trial?trial.captured:[],liberties:g?[...g.libs]:[],groupStones:g?g.stones:[],inf:this._view==='influence'||trial&&this._view==='normal'?e.inf||E.influence(b,s.n):[],owners:this._view==='territory'?e.owner:[],dead:s.dead,score:{black:e.black,white:e.white+s.komi,neutral:e.neutral,label:s.ended?'终局数子':trial?'试落估算':'实时估算',verdict:`${e.diff===0?'双方持平':(e.diff>0?'黑':'白')+'方'+(s.ended?'':'估算')+'领先 '+Math.abs(e.diff).toFixed(1)+' 点'}`},coach,captures,ended:s.ended,scored:s.scored,humanLabel:s.human===1?'黑':'白',turnLabel:s.ended?'数子中':this.data.busy?'AI 思考中':s.turn===s.human?'轮到你落子':'等待 AI 应对',moves:s.moves.length,previewInfo:p?{point:coord(p.i,s.n),error:p.error||'',title:p.error?'不能落子':p.explanation.title,reason:p.error||p.explanation.risks[0]||p.explanation.reasons[0],metrics:p.error?'':`${p.libs} 口气 · 提 ${p.captured.length} 子 · 黑 ${signed(p.blackDelta)} / 白 ${signed(p.whiteDelta)}`} :null});
 },
 pick(e){const i=e.detail.i,s=this._session.state;if(this.data.busy)return;if(s.ended){if(this._session.toggleDead(i)){this.save();this.render();}return;}if(this._view==='liberties'&&s.board[i]){this._selected=i;this._preview=null;this.render();return;}this._preview=null;this._hint=null;const r=this._session.move(i);if(r.error){this.toast(r.error);this.render();return;}this._selected=-1;if(i>=0)this._sound.play();this.save();this.render();this.scheduleAI();},
 preview(e){const s=this._session.state;if(!this.data.previewEnabled||this.data.busy||s.ended||s.turn!==s.human)return;const i=e.detail.i;this._preview=i>=0&&!s.board[i]?this._session.preview(i):null;this.render();},
 clearPreview(){if(this._preview){this._preview=null;this.render();}},
 toggleSound(e){const enabled=e.detail.value;this._sound.setEnabled(enabled);this.setData({soundEnabled:enabled});if(!Store.write(Store.KEYS.sound,enabled))this.toast('音效设置暂未保存');},
 togglePreview(e){this.cancelBoard();this._preview=null;const value=e.detail.value;const saved=Store.write(Store.KEYS.preview,value);this.setData({previewEnabled:value});if(!saved)this.toast('预览设置暂未保存');this.render();},
 changeView(e){this._view=e.currentTarget.dataset.view;this.setData({view:this._view});this.render();},
 toggleGlobal(){const enabled=!this.data.globalMode;this.cancelBoard();this._preview=null;this.setData({globalMode:enabled});if(enabled)wx.hideTabBar({animation:false,success:()=>this.resize()});else wx.showTabBar({animation:false,success:()=>this.resize()});this.resize();this.render();},
 stopAI(){clearTimeout(this._aiTimer);clearTimeout(this._watchdog);this._serial++;if(this._worker){this._worker.terminate();this._worker=null;}this.setData({busy:false});},
 scheduleAI(){clearTimeout(this._aiTimer);const s=this._session.state;if(this._active&&!s.ended&&s.turn!==s.human)this._aiTimer=setTimeout(()=>this.askAI(false),50);},
 askAI(isHint=false){const s=this._session.state;if(this.data.busy||s.ended||!this._active)return;if(isHint&&s.turn!==s.human)return;
  this.stopAI();this.cancelBoard();this._preview=null;const id=++this._serial,position=E.key(s.board);this.setData({busy:true,aiError:''});this.render();
  const fail=()=>{if(id!==this._serial)return;this.stopAI();this.setData({aiError:'AI 搜索未完成，请重试；若仍失败，请更新微信。'});this.render();};
  try{const w=wx.createWorker('workers/ai.js');this._worker=w;
   w.onMessage(result=>{if(!this._active||id!==this._serial||result.id!==id||E.key(this._session.state.board)!==position)return;
    if(result.error){fail();return;}this.stopAI();
    if(isHint){if(result.i>=0){const p=this._session.preview(result.i);if(p.error){this.toast(p.error);this.render();return;}this._hint={...p,search:result};this.render();this.openAnalysis();}else{this._hint=null;this.render();this.toast('目前可以考虑停一手。');}}
    else{const r=this._session.move(result.i,s.turn);if(r.error){this.setData({aiError:r.error});this.render();return;}this._hint=null;if(result.i>=0)this._sound.play();this.save();this.render();if(result.i===-1)this.toast('AI 选择停一手。');}
   });
   if(w.onError)w.onError(fail);if(w.onProcessKilled)w.onProcessKilled(fail);
   this._watchdog=setTimeout(fail,45000);
   w.postMessage({id,board:s.board.slice(),n:s.n,color:isHint?s.human:s.turn,history:this._session.history(),difficulty:s.difficulty});
  }catch{fail();}
 },
 hint(){this.askAI(true);},retryAI(){if(this._session.state.turn!==this._session.state.human)this.askAI(false);else this.askAI(true);},
 undo(){if(this._session.state.scored)return;this.stopAI();this._preview=null;this._hint=null;this._selected=-1;if(this._session.undo()){this.save();this.render();this.scheduleAI();}},
 pass(){const s=this._session.state;if(this.data.busy||s.scored)return;this._preview=null;this._hint=null;if(s.ended)this._session.resume();else this._session.move(-1);this.save();this.render();this.scheduleAI();},
 finish(){const s=this._session.state;if(this.data.busy)return;if(s.scored){this.openNew();return;}
  if(!s.ended){wx.showModal({title:'准备一起数子了吗？',content:'进入后先点击标记已确定的死棋，有争议的死活可继续对弈。',confirmText:'进入数子',success:r=>{if(r.confirm){this.stopAI();this._preview=null;this._hint=null;this._session.enterScoring();this.save();this.render();}}});return;}
  const r=this._session.result();wx.showModal({title:'确认棋局结果',content:`黑 ${r.black} 点，白 ${r.white+s.komi} 点（含贴目），中立 ${r.neutral} 点。请先确认死棋与公活，保存后本局结果将锁定。`,confirmText:'保存结果',success:answer=>{if(answer.confirm){this._session.finish();this.save();this.render();}}});
 },
 openNew(){this.openSettings(true);},settings(){this.openSettings(false);},
 openSettings(forceNew){const s=this._session.state;this.setData({settings:{size:[9,13,19].indexOf(s.n),color:s.human-1,difficulty:s.difficulty,forceNew:forceNew===true}});},
 settingChange(e){const field=e.currentTarget.dataset.field;this.setData({['settings.'+field]:Number(e.detail.value)});},
 closeSettings(){this.setData({settings:null});},
 applySettings(){const v=this.data.settings,s=this._session.state,n=[9,13,19][v.size],human=v.color+1;
  const apply=()=>{this.stopAI();this._preview=null;this._hint=null;this._selected=-1;if(v.forceNew||n!==s.n||human!==s.human)this._session.reset(n,human,v.difficulty);else s.difficulty=v.difficulty;this.setData({settings:null,aiError:''});this.save();this.render();this.scheduleAI();};
  if((v.forceNew||n!==s.n||human!==s.human)&&s.moves.length)wx.showModal({title:'开启新对局？',content:'当前棋局将被替换，已完成课程和累计统计会保留。',success:r=>{if(r.confirm)apply();}});else apply();
 },
 openAnalysis(){const s=this._session.state;if(s.ended){this.setData({detail:{title:'怎样确认中国规则计分',reasons:['移除双方确认已死的整块棋，公活的棋子保留。','每方的活子与围住的空点相加，白棋额外加 7.5 点。','提子不重复加分，中立点不计入任何一方。'],risks:['存在争议时继续对弈，不依赖局中估算判断复杂死活。'],followUp:'完成检查后，点击确认结果。',alternatives:[]}});return;}
  const p=this._preview&&!this._preview.error?this._preview:this._hint,m=this._session.lastHuman();let exp=p?p.explanation:m?m.explanation:null;
  if(!exp){this.setData({detail:{title:'第一手为什么常从角开始？',reasons:['角部有两条棋盘边界帮忙，围空通常更有效率。','三路通常偏重实地，四路通常兼顾向外发展。'],risks:[],followUp:'点击给我提示，查看搜索推荐的落点和实际作用。',alternatives:[]}});return;}
  const search=p&&p.search;let response='';if(search&&Number.isInteger(search.reply)&&search.reply>=0){const reply=E.previewMove(p.board,search.reply,3-s.human,s.n,[...this._session.history(),E.key(p.board)],s.komi);if(!reply.error)response=`对方可能在 ${coord(search.reply,s.n)} 应对：${reply.explanation.text}`;}
  let responseNote='这是一种可能的应手，对方不一定这样下。';
  if(!search&&!p&&m){const reply=[...s.moves].reverse().find(move=>move.color!==s.human&&move.i>=0);if(reply&&s.moves.indexOf(reply)>s.moves.indexOf(m)){const x=reply.explanation||E.explain(reply.before,reply.after,reply.i,reply.color,s.n,reply.captured);response=`AI 最近在 ${coord(reply.i,s.n)} 应对：${x.text}`;responseNote='这是棋局中已经发生的 AI 应手。';}}
  const alternatives=search?(search.alternatives||[]).map(i=>this._session.preview(i)).filter(a=>!a.error).map(a=>({point:coord(a.i,s.n),title:a.explanation.title,text:a.explanation.text})):[];
  this.setData({detail:{title:(search?'为什么推荐 ':'这一手的依据 · ')+coord(p?p.i:m.i,s.n),tag:exp.tag,reasons:exp.reasons,risks:exp.risks,followUp:exp.followUp,delta:`己方估算占点 ${signed(exp.ownDelta)}，对方 ${signed(exp.oppDelta)}；后续应手会改变估算。`,response,responseNote,alternatives}});
 },
 closeDetail(){this.setData({detail:null});},noop(){},
 onShareAppMessage(){return {title:'一目 · 每一手，都看得懂',path:'/pages/game/index'};}
});
