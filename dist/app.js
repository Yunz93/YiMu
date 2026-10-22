import {bindTouchPreview,boardPointAt} from './touch-preview.js';
import {lessons} from './lessons.js';
import {previewMove,key,neighbors,group,play,groups,influence,estimate,score,explain,tactical,candidates} from './engine.js';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const paths={expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',collapse:'<path d="M3 8h5V3m13 5h-5V3M8 21v-5H3m13 5v-5h5"/>',board:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18m6-18v18M3 9h18M3 15h18"/>',book:'<path d="M3 4h6a4 4 0 0 1 3 2 4 4 0 0 1 3-2h6v15h-6a4 4 0 0 0-3 2 4 4 0 0 0-3-2H3zM12 6v15"/>',chart:'<path d="M4 4v16h16M8 15v-3m5 3V8m5 7V5"/>',sprout:'<path d="M12 21V11M12 15C3 16 2 9 3 5c6-1 10 2 9 10Zm0-5c0-5 4-8 9-8 1 6-3 10-9 10"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 8.5a2.6 2.6 0 0 1 5 .8c0 2-2.5 2.2-2.5 4.2M12 17h.01"/>',settings:'<path d="m9 3-.5 2-2 .9-1.8-.6-2 3.4 1.5 1.4v2.3l-1.5 1.4 2 3.4 1.8-.6 2 .9.5 2h4l.5-2 2-.9 1.8.6 2-3.4-1.5-1.4v-2.3l1.5-1.4-2-3.4-1.8.6-2-.9L13 3Z"/><circle cx="11" cy="11" r="3"/>',plus:'<path d="M12 5v14M5 12h14"/>',sliders:'<path d="M4 7h16M4 17h16M8 4v6m8 4v6"/>',eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',undo:'<path d="M8 4 3 9l5 5M3 9h11a6 6 0 0 1 0 12"/>',bulb:'<path d="M9 18h6M9 21h6M8 14a6 6 0 1 1 8 0l-1 2H9zM12 1v1M3 4l1 1m16-1-1 1"/>',flag:'<path d="M5 22V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',sparkle:'<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4ZM20 2v4m-2-2h4"/>',leaf:'<path d="M5 18C-1 7 9 3 21 3c0 12-5 19-14 14M4 21 16 9"/>'};
const icon=name=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.help}</svg>`;
$$('[data-icon]').forEach(e=>e.innerHTML=icon(e.dataset.icon));
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f;}catch{return f;}};
let stats=read('yimu-stats',{moves:0,completed:[],games:0}), state=read('yimu-game',null);
const fresh=(n=9,human=1,difficulty=1)=>({n,board:Array(n*n).fill(0),turn:1,human,difficulty,komi:7.5,moves:[],passes:0,ended:false,dead:[],scored:false});
if(!state||![9,13,19].includes(state.n)||state.board?.length!==state.n*state.n||!Array.isArray(state.moves))state=fresh();
let previewEnabled=read('yimu-preview-enabled',true),preview=null;
let previewTimer=null,pendingPreviewPoint=null,hintDetails=null;
let globalMode=false,globalModeScroll={x:0,y:0},globalBoardObserver=null;
let view='normal',selected=null,hint=null,busy=false,aiWorker=null,requestId=0,pendingHint=false,toastTimer;
const coord=(i,n=state.n)=>'ABCDEFGHJKLMNOPQRST'.charAt(i%n)+(n-Math.floor(i/n));
const positions=()=>[key(Array(state.n*state.n).fill(0)),...state.moves.filter(m=>m.i>=0).map(m=>key(m.after))];
function save(){try{localStorage.setItem('yimu-game',JSON.stringify(state));localStorage.setItem('yimu-stats',JSON.stringify(stats));$('.saved-state').innerHTML='<i></i> 进度已自动保存';}catch{$('.saved-state').textContent='本次进度暂未保存';}updateJourney();}
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3300);}
function updateJourney(){const count=stats.completed.length;$('#journey-fill').style.width=count/lessons.length*100+'%';$('#journey-text').textContent=count?`已完成 ${count} / ${lessons.length} 节课程`:'完成入门课，点亮围棋之旅';}
function defs(){return '<defs><radialGradient id="stone-b" cx="32%" cy="25%" r="75%"><stop stop-color="#5c6057"/><stop offset=".4" stop-color="#30362d"/><stop offset="1" stop-color="#152015"/></radialGradient><radialGradient id="stone-w" cx="32%" cy="25%" r="75%"><stop stop-color="#fff"/><stop offset=".65" stop-color="#f7f8f2"/><stop offset="1" stop-color="#d5dacc"/></radialGradient></defs>';}
function boardSVG(b,n,{interactive=false,mini=false,last=-1,owners=null,inf=null,libs=null,dead=[],hintAt=null,previewAt=-1,captured=[]}={}){const pad=42,step=476/(n-1),r=step*.445,at=i=>[pad+i%n*step,pad+Math.floor(i/n)*step];let s=defs();
if(inf||owners)for(let i=0;i<b.length;i++){if(b[i])continue;const [x,y]=at(i),v=inf?.[i],c=owners?.[i];if(inf&&Math.abs(v)>.06)s+=`<rect x="${x-step*.49}" y="${y-step*.49}" width="${step*.98}" height="${step*.98}" rx="${step*.1}" fill="${v>0?'#426b45':'#f7f8f0'}" opacity="${Math.abs(v)*.56}"/>`;if(owners&&c)s+=`<rect x="${x-5}" y="${y-5}" width="10" height="10" rx="1.5" fill="${c===1?'#40543b':'#fffdf4'}" stroke="${c===1?'#30412d':'#b8b49b'}" stroke-width=".6"/>`;}
for(let j=0;j<n;j++){const p=pad+j*step;s+=`<path d="M${pad} ${p}H${560-pad}M${p} ${pad}V${560-pad}" stroke="#997b47" stroke-width="${j===0||j===n-1?'1.2':'.8'}" opacity=".73"/>`;if(!mini){const col='ABCDEFGHJKLMNOPQRST'[j];s+=`<text x="${p}" y="23" text-anchor="middle" fill="#9f895f" font-size="11" font-family="sans-serif">${col}</text><text x="23" y="${p+4}" text-anchor="middle" fill="#9f895f" font-size="11" font-family="sans-serif">${n-j}</text><text x="${p}" y="545" text-anchor="middle" fill="#9f895f" font-size="11" font-family="sans-serif">${col}</text><text x="539" y="${p+4}" text-anchor="middle" fill="#9f895f" font-size="11" font-family="sans-serif">${n-j}</text>`;}}
const stars=n===19?[3,9,15]:n===9?[2,4,6]:n===13?[3,6,9]:n===5?[2]:[];for(const x of stars)for(const y of stars){if(n!==19&&(x===stars[1]&&y!==stars[1]||y===stars[1]&&x!==stars[1]))continue;s+=`<circle cx="${pad+x*step}" cy="${pad+y*step}" r="2.6" fill="#8d7248"/>`;}
if(libs)for(const p of libs.libs){const [x,y]=at(p);s+=`<circle cx="${x}" cy="${y}" r="${step*.13}" fill="#e9f2d2" stroke="#729152" stroke-width="1.8"/><circle cx="${x}" cy="${y}" r="${step*.04}" fill="#79945e"/>`;}
for(let i=0;i<b.length;i++)if(b[i]){const [x,y]=at(i),isdead=dead.includes(i);if(libs?.stones.includes(i))s+=`<circle cx="${x}" cy="${y}" r="${r+4}" fill="none" stroke="#7d9b5a" stroke-width="2" opacity=".7"/>`;s+=`<circle class="${i===previewAt?'stone preview-stone':'stone'}" cx="${x}" cy="${y}" r="${r}" fill="url(#stone-${b[i]===1?'b':'w'})" ${b[i]===2?'stroke="#d3d5c8" stroke-width=".65"':''} opacity="${isdead?'.4':i===previewAt?'.65':'1'}"/>`;if(last===i)s+=`<circle class="last-stone" cx="${x}" cy="${y}" r="${r*.19}" fill="none" stroke="${b[i]===1?'#d9e5cd':'#788568'}" stroke-width="1.5"/>`;if(isdead)s+=`<path class="dead-marker" d="m${x-6} ${y-6} 12 12m0-12-12 12" stroke="#b07559" stroke-width="2"/>`;}
for(const p of captured){const [x,y]=at(p);s+=`<circle class="preview-capture" cx="${x}" cy="${y}" r="${r*.8}" fill="#f5e1cb88" stroke="#b37d60" stroke-dasharray="3 3"/><path d="m${x-4} ${y-4} 8 8m0-8-8 8" stroke="#b37d60" pointer-events="none"/>`;}
if(previewAt>=0){const [x,y]=at(previewAt);s+=`<circle cx="${x}" cy="${y}" r="${r+2}" fill="none" stroke="#608a4c" stroke-width="2" stroke-dasharray="3 3" pointer-events="none"/>`;}
if(hintAt!==null&&!b[hintAt]){const [x,y]=at(hintAt);s+=`<circle cx="${x}" cy="${y}" r="${r*.77}" fill="#f4f5db33" stroke="#799d5c" stroke-width="2" stroke-dasharray="4 4"/><circle cx="${x}" cy="${y}" r="3" fill="#6a8e50"/>`;}
if(interactive)s+=boardHitSVG(b,n);
return s;}
function boardHitSVG(b,n){const pad=42,step=476/(n-1),at=i=>[pad+i%n*step,pad+Math.floor(i/n)*step];let s='';for(let i=0;i<b.length;i++){const [x,y]=at(i);s+=`<rect class="intersection" data-i="${i}" role="button" tabindex="${i===0?0:-1}" aria-label="${coord(i,n)} ${b[i]?(b[i]===1?'黑棋':'白棋'):'空位，点击落子'}" x="${x-step*.49}" y="${y-step*.49}" width="${step*.98}" height="${step*.98}" rx="${step*.2}"/>`;}return s;}
function paintBoard(visual,n){
 const root=$('#board');
 if(!$('#board-visual'))root.innerHTML='<g id="board-visual" aria-hidden="true"></g><g id="board-hit-area"></g>';
 $('#board-visual').innerHTML=visual;
 const hits=$('#board-hit-area');
 if(hits.dataset.size!==String(n)){hits.innerHTML=boardHitSVG(state.board,n);hits.dataset.size=String(n);}
 else for(const el of hits.children){const i=+el.dataset.i,label=`${coord(i,n)} ${state.board[i]?(state.board[i]===1?'黑棋':'白棋'):'空位，点击落子'}`;if(el.getAttribute('aria-label')!==label)el.setAttribute('aria-label',label);}
}

function lastHuman(){return [...state.moves].reverse().find(m=>m.color===state.human&&m.i>=0);}
function setText(selector,value){const el=$(selector);if(el.textContent!==value)el.textContent=value;}
function updateGlobalScore(e){
 setText('#global-black-score',String(e.black));setText('#global-white-score',String(e.white+state.komi));
 setText('#global-score-label',state.ended?'终局数子':preview&&!preview.error?'试落估算':'实时估算');
 setText('#global-turn',state.ended?state.scored?'对局结束':'数子模式':busy?'AI 思考中':state.turn===state.human?'你的回合':'AI 的回合');
}
function updateGlobalBoardSize(){
 if(!globalMode)return;
 const stage=$('#board-stage'),{width,height}=stage.getBoundingClientRect();
 const size=Math.max(0,Math.floor(Math.min(width,height)-12)),value=size+'px';
 if(size>0&&stage.style.getPropertyValue('--global-board-size')!==value)stage.style.setProperty('--global-board-size',value);
}
function setGlobalMode(enabled){
 if(globalMode===enabled)return;
 if(enabled)globalModeScroll={x:window.scrollX||0,y:window.scrollY||0};
 touchPreview.cancel();cancelScheduledPreview();preview=null;globalMode=enabled;
 document.body.classList.toggle('board-global-mode',enabled);
 const button=$('#global-mode-btn');button.setAttribute('aria-pressed',String(enabled));
 button.title=enabled?'退出棋盘全局模式（Esc）':'进入棋盘全局模式';
 setText('#global-mode-label',enabled?'退出全局':'全局模式');
 $('#global-mode-icon').innerHTML=icon(enabled?'collapse':'expand');$('#global-score').hidden=!enabled;
 globalBoardObserver?.disconnect();globalBoardObserver=null;
 draw();
 if(enabled){
  window.scrollTo(0,0);updateGlobalBoardSize();
  if(typeof ResizeObserver!=='undefined'){globalBoardObserver=new ResizeObserver(updateGlobalBoardSize);globalBoardObserver.observe($('#board-stage'));}
 }else{
  $('#board-stage').style.removeProperty('--global-board-size');
  window.scrollTo(globalModeScroll.x,globalModeScroll.y);
 }
 button.focus();
}
function setCoachDelta(label,value,note){setText('#coach-delta-label',label);setText('#coach-delta-value',value);setText('#coach-delta-note',note);}
function cancelScheduledPreview(){clearTimeout(previewTimer);previewTimer=null;pendingPreviewPoint=null;}
function schedulePreview(i){
 if(!previewEnabled||state.ended||busy||state.turn!==state.human||$('#modal').open)return;
 if(pendingPreviewPoint===i)return;
 cancelScheduledPreview();
 if(preview?.i===i)return;
 pendingPreviewPoint=i;
 previewTimer=setTimeout(()=>{pendingPreviewPoint=null;previewTimer=null;if(!$('#modal').open)showPreview(i);},90);
}
function showPreview(i){
 cancelScheduledPreview();
 if(!previewEnabled||state.ended||busy||state.turn!==state.human)return;
 if(state.board[i]){if(preview){preview=null;draw();}return;}
 if(preview?.i===i)return;
 preview=previewMove(state.board,i,state.human,state.n,positions(),state.komi);
 selected=null;draw();
}
const signed=n=>(n>=0?'+':'')+n;
function updateTouchPreviewTip(){
 const tip=$('#touch-preview-tip');tip.hidden=!touchPreview.active||!preview;
 if(tip.hidden)return;
 setText('#touch-preview-point',coord(preview.i)+(preview.error?' · 不能落子':' · 试落'));
 setText('#touch-preview-summary',preview.error||`${preview.libs} 口气 · 提 ${preview.captured.length} 子 · 黑 ${signed(preview.blackDelta)} / 白 ${signed(preview.whiteDelta)}`);
 setText('#touch-preview-reason',preview.error?'':`${preview.explanation.title}。${preview.explanation.risks[0]||preview.explanation.reasons[0]}`);
}
function renderPreview(){
 updateTouchPreviewTip();
 $('#preview-toggle').checked=previewEnabled;
 $('#preview-toggle').disabled=state.ended||busy;
 $('#preview-help').textContent=state.ended?'数子时可标记死棋':previewEnabled?'长按/悬停预览，轻点落子':'预览已关闭，点击立即落子';
 const panel=$('#move-preview');panel.hidden=!previewEnabled||state.ended;
 panel.dataset.previewState=preview?preview.error?'illegal':'active':'idle';
 $('.insight-column').dataset.previewing=String(!!preview);
 if(!preview){
  setText('#preview-heading','落子前预览');setText('#preview-state',busy?'等待 AI 应对':'长按或悬停查看 · 轻点落子');
  for(const id of ['preview-liberties','preview-captures','preview-black','preview-white'])setText('#'+id,'—');
  setText('#preview-explanation',busy?'AI 思考时，你可以继续阅读右侧的落子讲解。':'电脑悬停查看；手机长按约 0.4 秒预览，按住拖动可换点，松手不落子。轻点直接落子。');
  $('#preview-explanation').classList.remove('preview-warning');return;
 }
 const p=preview;
 if(!p.error)$('#score-verdict').textContent=`试落后：${p.after.diff>0?'黑':'白'}方估算领先 ${Math.abs(p.after.diff).toFixed(1)} 点 · 尚未提交`;
 setText('#preview-heading',p.error?'不能在这里落子':'试落 '+coord(p.i));setText('#preview-state',touchPreview.active?'长按预览 · 松开不落子':'仅预览 · 点击棋盘立即落子');
 setText('#preview-liberties',p.error?'—':`${p.libs} 口${p.libs===1?' · 危险':''}`);setText('#preview-captures',p.error?'—':`${p.captured.length} 颗`);
 setText('#preview-black',p.error?'—':`${signed(p.blackDelta)} 点`);setText('#preview-white',p.error?'—':`${signed(p.whiteDelta)} 点`);
 setText('#preview-explanation',p.error||`${p.explanation.title}。${p.explanation.risks[0]||p.explanation.reasons[0]}`);
 $('#preview-explanation').classList.toggle('preview-warning',!!p.error);
 $('#view-description').textContent=p.error?'该落点不合法，实际棋局没有改变。请改选其他位置。':'半透明棋子为试落，绿色圆环为它的气；叉号标记将被提走的棋子。轻点立即落子；手机长按并拖动查看预览，松手收起且不落子。';
}
function updatePreviewCoach(){
 setCoachDelta('试落占点变化',preview.error?'不能落子':`黑 ${signed(preview.blackDelta)} · 白 ${signed(preview.whiteDelta)}`,'尚未落子，预览不影响当前棋局');
 setText('#move-label','落子前预览 · '+coord(preview.i));setText('#explain-tag',preview.error?'不合法':preview.explanation.tag);
 setText('#explain-title',preview.error?'先换一个落点试试看':preview.explanation.title);
 setText('#explain-text',preview.error||preview.explanation.text);
 $('#coach-detail').innerHTML=icon('eye')+(preview.error?'规则检查已拦截，棋盘没有改变。':`尚未提交 · ${preview.libs} 口气 · 将提 ${preview.captured.length} 子`);
 $('#why-btn').innerHTML='查看这一步的具体依据<span>↗</span>';
}
function moveExplanation(m){
 if(!m.explanation?.reasons){
  const previous=state.moves.slice(0,Math.max(0,state.moves.indexOf(m)));
  m.explanation=explain(m.before,m.after,m.i,m.color??state.human,state.n,m.captured,[key(Array(state.n*state.n).fill(0)),...previous.filter(x=>x.i>=0).map(x=>key(x.after))]);
 }
 return m.explanation;
}
function updateHintCoach(){
 const p=hintDetails,e=p.explanation;
 setText('#move-label','推荐落点 · '+coord(p.i));setText('#explain-tag',e.tag);
 setText('#explain-title',e.title);setText('#explain-text',e.text);
 $('#coach-detail').innerHTML=icon('bulb')+'推荐尚未落子 · 点击棋盘上的圆环即可下在这里';
 setCoachDelta('推荐后的占点估算',`黑 ${signed(p.blackDelta)} · 白 ${signed(p.whiteDelta)}`,'只计算这一手，后续应对会改变估算');
 $('#why-btn').innerHTML='为什么推荐这里？查看应手<span>↗</span>';
}
function explanationHTML(e){
 return `<div class="lesson-instruction">${e.title}</div><div class="move-reasons"><h3>这一步具体做了什么</h3><ul>${e.reasons.map(t=>`<li>${t}</li>`).join('')||`<li>本块共有 ${e.facts.stones} 颗子、${e.libs} 口气。</li>`}</ul></div>${e.risks.length?`<div class="tip-block move-risk"><h3>需要留意的代价</h3><ul>${e.risks.map(t=>`<li>${t}</li>`).join('')}</ul></div>`:''}<div class="tip-block"><h3>接下来观察什么</h3><p>${e.followUp}</p></div><p>这一手使己方估算占点 ${signed(e.ownDelta)}、对方 ${signed(e.oppDelta)}。这是距离和势力估算，会随应手改变，并非确定收益。</p>`;
}
function analysisBoard(b,i){return `<div class="mini-board analysis-board"><svg viewBox="0 0 560 560" role="img" aria-label="${state.n} 路落子分析，落点 ${coord(i)}">${boardSVG(b,state.n,{last:i,libs:group(b,i,state.n)})}</svg></div>`;}
function showMoveDetails(m,label,opponent=null){
 const e=moveExplanation(m);
 const reply=opponent?`<details class="move-response"><summary>查看 AI 随后的应对 · ${coord(opponent.i)}</summary>${explanationHTML(moveExplanation(opponent))}${analysisBoard(opponent.after,opponent.i)}</details>`:'';
 openModal(`<h2>${label} · ${coord(m.i)}</h2>${explanationHTML(e)}${analysisBoard(m.after,m.i)}${reply}`,'局面分析 · 气、棋形与后续应对');
}
function showHintDetails(){
 if(!hintDetails)return;
 const p=hintDetails,s=p.search,history=positions();
 let reply='';
 if(Number.isInteger(s.reply)&&s.reply>=0){
  const r=previewMove(p.board,s.reply,3-state.human,state.n,[...history,key(p.board)],state.komi);
  if(!r.error)reply=`<div class="tip-block"><h3>搜索中需要防备的应手 · ${coord(s.reply)}</h3><p>${r.explanation.title}。${r.explanation.reasons[0]||r.explanation.risks[0]}</p><p>这是对方一种可能的应手，不代表对方一定这样下。</p></div>`;
 }
 const alternatives=(s.alternatives||[]).filter(i=>Number.isInteger(i)&&i>=0&&i!==p.i).map(i=>previewMove(state.board,i,state.human,state.n,history,state.komi)).filter(a=>!a.error);
 const comparison=alternatives.length?`<details class="move-response"><summary>也搜索过哪些落点？</summary><p>搜索结合提子、救棋、气数、对手应手和模拟结果选择 ${coord(p.i)}。以下落点用于对照，不表示必然更差，也不是胜率排名。</p><ul>${alternatives.map(a=>`<li><b>${coord(a.i)} · ${a.explanation.tag}</b><p>${a.explanation.title}。${a.explanation.reasons[0]||a.explanation.risks[0]}</p></li>`).join('')}</ul></details>`:'';
 openModal(`<h2>为什么推荐 ${coord(p.i)}？</h2><p>本次搜索${s.compared?`比较了 ${s.compared} 个候选落点，并`:''}结合对手应手与后续模拟，选择了这个落点。下面用实际棋形变化解释它的作用。</p>${explanationHTML(p.explanation)}${reply}${analysisBoard(p.board,p.i)}${comparison}<p>这是入门陪练的搜索建议，复杂死活仍需继续验证。推荐不会自动落子；返回棋盘后点击绿色圆环即可落子，也可以选择其他位置。</p><div class="modal-actions"><button class="button primary" id="hint-return">返回棋盘，自己决定 →</button></div>`,'推荐依据 · 当前局面');
 $('#hint-return').onclick=closeModal;
}
function draw(){const last=state.moves.at(-1),n=state.n,empty=!state.board.some(Boolean);let focus=selected??lastHuman()?.i??last?.i,libs=view==='liberties'&&focus>=0&&state.board[focus]?group(state.board,focus,n):null;const actual=state.ended?score(state.board,n,state.komi,state.dead):estimate(state.board,n,state.komi),trial=preview&&!preview.error?preview:null,displayBoard=trial?trial.board:state.board,e=trial?trial.after:actual;if(trial)libs=group(displayBoard,trial.i,n);paintBoard(boardSVG(displayBoard,n,{interactive:false,last:trial?-1:last?.i??-1,previewAt:trial?trial.i:-1,captured:trial?trial.captured:[],libs,inf:view==='influence'||trial&&view==='normal'?influence(displayBoard,n):null,owners:view==='territory'?e.owner:null,dead:state.dead,hintAt:hint??(!lastHuman()&&!state.ended&&!busy?[2*n+2,2*n+n-3,(n-3)*n+2,(n-3)*n+n-3].find(i=>!state.board[i])??null:null)}),n);$('#board').setAttribute('aria-label',`${n} 路围棋棋盘，点击交叉点落子，方向键移动，回车落子`);$('#board').classList.toggle('dead-mode',state.ended);$('.board-surface').classList.toggle('standard-board',n===19);$('#board-size-tag').textContent=`${n} 路${n===19?'标准':n===9?'入门':'进阶'}棋盘`;
const descriptions={normal:empty?'点击棋盘交叉点落子。淡绿色圆环是推荐落点，试着从角部开始。':'小圆标记上一手。切换气、势力或地盘视图，观察这一手怎样改变局面。',liberties:libs?`高亮这块棋共有 ${libs.stones.length} 颗子、${libs.libs.size} 口气。绿色小圆是气，点击其他棋子可切换。`:'与棋子上下左右相邻的空交叉点，就是气。先落一颗子，看看它有几口气。',influence:'绿色是黑棋影响，浅白色是白棋影响。颜色越浓，影响越强；势力不等于已经围住的地盘。',territory:state.ended?'终局数子：小方块表示空点归属。点击整块死棋进行标记或撤销，双方公活的棋子请保留。':'小方块表示当前估计的空点归属；没有标记的区域尚未确定。棋子和空点一起计分。'};$('#view-description').textContent=state.ended?'数子模式：点击棋子标记整块死棋；确认双方活棋后，点击「确认结果」。':descriptions[view];$$('[data-view]').forEach(e=>e.classList.toggle('selected',e.dataset.view===view));
$('#human-name').textContent=`你 · 执${state.human===1?'黑':'白'}`;$('#ai-name').textContent=`一目 AI · 执${state.human===1?'白':'黑'}`;$('.player>.player-stone').className=`player-stone ${state.human===1?'black':'white'}`;$('.ai-player>.player-stone').className=`player-stone ${state.human===1?'white':'black'}`;$('#human-status').textContent=state.ended?'对局已结束':state.turn===state.human?'轮到你落子':'等待 AI 应对';$('#turn-badge').textContent=state.ended?'数子中':busy?'AI 思考中':'你的回合';$('#turn-badge').style.visibility=state.ended||state.turn===state.human?'visible':'hidden';$('#ai-status').innerHTML=busy?'<i class="online-dot"></i> 正在思考这一手…':`<i class="online-dot"></i> ${['轻松入门','认真思考','深入挑战'][state.difficulty]} · 智能陪练`;document.body.classList.toggle('busy',busy);$('#undo-btn').disabled=!state.moves.length||state.scored;$('#pass-btn').disabled=busy||state.scored;$('#pass-btn').textContent=state.ended?'继续对弈':'停一手';$('#hint-btn').disabled=busy||state.ended;$('#finish-btn').disabled=busy||state.scored;$('#finish-btn').innerHTML=icon('flag')+(state.ended?'确认结果':'结束并数子');$('#black-role').textContent=state.human===1?'你':'AI';$('#white-role').textContent=state.human===2?'你':'AI';$('#black-score').textContent=e.black;$('#white-score').textContent=e.white+state.komi;$('#score-black').style.width=e.black/(n*n)*100+'%';$('#score-neutral').style.width=e.neutral/(n*n)*100+'%';$('#score-white').style.width=e.white/(n*n)*100+'%';$('#black-area-label').textContent=`黑方 ${e.black}`;$('#white-area-label').textContent=`白方 ${e.white}`;$('#neutral-label').textContent=`${state.ended?'中立':'未定'} ${e.neutral}`;$('#score-badge').textContent=state.ended?'终局数子':trial?'试落估算':'实时估算';const captures=[0,0,0];state.moves.forEach(m=>captures[m.color]+=m.captured.length);$('#black-captures').textContent=`黑 ${captures[1]}`;$('#white-captures').textContent=`白 ${captures[2]}`;$('#score-verdict').textContent=!state.board.some(Boolean)?'棋局刚刚开始，一切皆有可能。':`${state.ended?'当前数子':'估算'}：${e.diff>0?'黑':'白'}方领先 ${Math.abs(e.diff).toFixed(1)} 点${state.ended?'':' · 仍有 '+e.neutral+' 点未定'}`;updateGlobalScore(e);$('.score-note').textContent=state.ended?'中国规则 · 黑白棋子与围空合计 · 白贴 7.5 点':'中国规则 · 白贴 7.5 点 · 局中估算仅供参考';updateCoach();updateJourney();renderPreview();}
function updateCoach(){if(preview){updatePreviewCoach();return;}if(hintDetails&&!state.ended){updateHintCoach();return;}const m=lastHuman();if(state.ended){$('#move-label').textContent='一起数一数';$('#explain-tag').textContent='终局';$('#explain-title').textContent=state.scored?'这一局，你又多懂了一点。':'先确认死子，再算地盘。';$('#explain-text').textContent='点击已确定无法存活的棋子，标记整块死棋。按中国规则，活棋与围住的空点相加，白棋再加 7.5 点贴目。';$('#coach-detail').innerHTML=icon('leaf')+'有争议的死活可以继续对弈来解决。';setCoachDelta('终局数子','查看结果','请先确认死棋与中立空点');$('#why-btn').textContent='查看完整计分方法 ↗';return;}if(!m){$('#move-label').textContent='落子之前';$('#explain-tag').textContent='小贴士';$('#explain-title').textContent='第一手，从一个角开始。';$('#explain-text').textContent='围棋的目标是围住更多地盘。角部有两条边帮忙，最容易围地。试着在绿色圆环处，落下你的第一颗棋子。';$('#coach-detail').innerHTML=icon('leaf')+'不用担心下错，每一步都可以悔棋。';setCoachDelta('落子影响','等待落子','每一手的估算变化会显示在这里');$('#why-btn').innerHTML='为什么围棋要先占角？<span>↗</span>';return;}const exp=moveExplanation(m);$('#move-label').textContent=`你的第 ${state.moves.filter(x=>x.color===state.human).indexOf(m)+1} 手 · ${coord(m.i)}`;$('#explain-tag').textContent=exp.tag;$('#explain-title').textContent=exp.title;$('#explain-text').textContent=exp.text;const g=state.board[m.i]===state.human?group(state.board,m.i,state.n):null;$('#coach-detail').innerHTML=icon('leaf')+(g?`这块棋现在有 ${g.libs.size} 口气 · 已连接 ${g.stones.length} 颗子`:'这颗棋子已被提走。回看它是怎样失去气的。');const before=estimate(m.before,state.n,0),after=estimate(m.after,state.n,0),ownDiff=state.human===1?after.black-before.black:after.white-before.white;setCoachDelta('这一手的变化',`你的估算占点 ${signed(ownDiff)}`,'含棋子与预计围空，后续会变化');$('#why-btn').innerHTML='查看本手依据与 AI 应对<span>↗</span>';}
function stopAI(){hint=null;hintDetails=null;touchPreview.cancel();cancelScheduledPreview();preview=null;requestId++;aiWorker?.terminate();aiWorker=null;busy=false;pendingHint=false;}
function makeMove(i,color){if(state.ended)return;hint=null;hintDetails=null;touchPreview.cancel();cancelScheduledPreview();preview=null;if(i===-1){state.moves.push({i,color,before:state.board.slice(),after:state.board.slice(),captured:[],explanation:null});state.passes++;state.turn=3-color;save();if(state.passes>=2){enterScoring();return;}draw();return true;}const r=play(state.board,i,color,state.n,positions());if(r.error){if(color===state.human)toast(r.error);return false;}const m={i,color,before:state.board.slice(),after:r.board,captured:r.captured,explanation:explain(state.board,r.board,i,color,state.n,r.captured,positions())};state.board=r.board;state.moves.push(m);state.turn=3-color;state.passes=0;selected=null;hint=null;if(color===state.human)stats.moves++;save();draw();return true;}
function askAI(isHint=false){if(busy||state.ended)return;touchPreview.cancel();cancelScheduledPreview();preview=null;busy=true;pendingHint=isHint;draw();const id=++requestId;aiWorker?.terminate();try{aiWorker=new Worker('./ai.js',{type:'module'});aiWorker.onmessage=({data})=>{if(data.id!==requestId)return;busy=false;aiWorker?.terminate();aiWorker=null;if(data.error){toast('AI 暂时无法完成搜索，请重试或悔棋。');draw();return;}if(isHint){hint=data.i>=0?data.i:null;hintDetails=null;if(data.i>=0){const p=previewMove(state.board,hint,state.human,state.n,positions(),state.komi);if(!p.error)hintDetails={...p,search:data};else hint=null;}draw();if(hintDetails)showHintDetails();else toast('目前没有合适的落点，可以考虑停一手。');}else{makeMove(data.i,3-state.human);if(data.i===-1)toast('AI 选择停一手。你可以继续落子，或停一手进入数子。');draw();}};aiWorker.onerror=()=>{busy=false;draw();toast('AI 搜索未完成，请刷新页面后重试。');};aiWorker.postMessage({id,board:state.board,color:isHint?state.human:state.turn,n:state.n,history:positions(),difficulty:state.difficulty});}catch{busy=false;draw();toast('当前浏览器不支持 AI 工作线程，请使用较新的浏览器。');}}
function clickBoard(i){cancelScheduledPreview();if(state.ended){if(state.scored){toast('结果已保存。开启新对局，继续练习。');return;}if(state.board[i]){const g=group(state.board,i,state.n);if(state.dead.includes(i))state.dead=state.dead.filter(p=>!g.stones.includes(p));else state.dead.push(...g.stones);save();draw();}return;}if(view==='liberties'&&state.board[i]){preview=null;selected=i;draw();return;}if(busy){toast('一目正在思考，马上就好。');return;}if(state.turn!==state.human){askAI();return;}preview=null;if(makeMove(i,state.human))askAI();else draw();}
const touchPreview=bindTouchPreview({element:$('#board'),canPreview:()=>previewEnabled&&!state.ended&&!busy&&state.turn===state.human&&!$('#modal').open,pointAt:(x,y)=>boardPointAt(x,y,$('#board').getBoundingClientRect(),state.n),onPreview:showPreview,onClear:()=>{cancelScheduledPreview();if(preview){preview=null;draw();}}});
$('#board').addEventListener('click',e=>{if(touchPreview.consumeClick(e))return;const t=e.target.closest('[data-i]');if(t)clickBoard(+t.dataset.i);});$('#board').addEventListener('keydown',e=>{const t=e.target.closest('[data-i]');if(!t)return;const i=+t.dataset.i,n=state.n;if(e.key==='Enter'||e.key===' '){e.preventDefault();clickBoard(i);}const deltas={ArrowLeft:-1,ArrowRight:1,ArrowUp:-n,ArrowDown:n};if(e.key in deltas){e.preventDefault();const p=Math.max(0,Math.min(n*n-1,i+deltas[e.key]));t.setAttribute('tabindex','-1');if(previewEnabled)showPreview(p);const next=$(`#board [data-i="${p}"]`);next.setAttribute('tabindex','0');next.focus();}});
$$('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;draw();});
$('#undo-btn').onclick=()=>{if(!state.moves.length||state.scored)return;stopAI();state.ended=false;state.dead=[];do{state.moves.pop();state.turn=state.moves.length?3-state.moves.at(-1).color:1;}while(state.moves.length&&state.turn!==state.human);state.board=state.moves.at(-1)?.after.slice()||Array(state.n*state.n).fill(0);state.passes=0;for(let j=state.moves.length-1;j>=0&&state.moves[j].i===-1;j--)state.passes++;selected=null;hint=null;save();draw();if(state.turn!==state.human)askAI();toast('已回到你的上一回合，换一个思路再试试。');};
$('#pass-btn').onclick=()=>{if(busy||state.scored)return;preview=null;if(state.ended){state.ended=false;state.dead=[];state.passes=0;view='normal';save();draw();if(state.turn!==state.human)askAI();return;}makeMove(-1,state.human);if(!state.ended)askAI();};$('#hint-btn').onclick=()=>askAI(true);
function openModal(content,eyebrow='YIMU GO · 一点一点学会'){touchPreview.cancel();cancelScheduledPreview();stopModalLesson();$('#modal-content').innerHTML=content;$('#modal-eyebrow').textContent=eyebrow;if(!$('#modal').open)$('#modal').showModal();}
function closeModal(){$('#modal').close();stopModalLesson();$$('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav==='game'));}
function stopModalLesson(){}
$('#modal-close').onclick=closeModal;$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=$('#modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});$('#modal').addEventListener('close',()=>{$$('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav==='game'));});
function settings(isNew=false){openModal(`<h2>${isNew?'新一局，慢慢来':'让对局适合你'}</h2><p>先在小棋盘上理解规则，再慢慢探索更大的世界。</p><div class="setting-row"><label for="set-size">棋盘大小<small>9 路入门，13 路过渡，19 路标准棋盘</small></label><select id="set-size"><option value="9" ${state.n===9?'selected':''}>9 路 · 入门推荐</option><option value="13" ${state.n===13?'selected':''}>13 路 · 进阶练习</option><option value="19" ${state.n===19?'selected':''}>19 路 · 标准棋盘</option></select></div><div class="setting-row"><label for="set-color">你执哪一方<small>黑棋先行，白棋获得 7.5 点贴目</small></label><select id="set-color"><option value="1" ${state.human===1?'selected':''}>执黑 · 你先落子</option><option value="2" ${state.human===2?'selected':''}>执白 · AI 先行</option></select></div><div class="setting-row"><label for="set-ai">AI 思考程度<small>结合战术判断、应手搜索与模拟</small></label><select id="set-ai">${['轻松入门','认真思考','深入挑战'].map((s,i)=>`<option value="${i}" ${state.difficulty===i?'selected':''}>${s}</option>`).join('')}</select></div><p class="setting-note">AI 是适合入门的启发式搜索陪练，棋力未经过段级位评定。改变棋盘或执子方将开启新对局。</p><div class="modal-actions"><button class="button" id="settings-cancel">返回棋局</button><button class="button primary" id="settings-save">${isNew?'开始新对局':'保存设置'}</button></div>`);$('#settings-cancel').onclick=closeModal;$('#settings-save').onclick=()=>{const n=+$('#set-size').value,human=+$('#set-color').value,difficulty=+$('#set-ai').value;if(isNew||n!==state.n||human!==state.human){stopAI();state=fresh(n,human,difficulty);view='normal';hint=null;selected=null;}else{stopAI();state.difficulty=difficulty;}save();closeModal();draw();if(!state.ended&&state.turn!==state.human)askAI();};}
$('#settings-btn').onclick=()=>settings();$('#board-settings').onclick=()=>settings();$('#new-btn').onclick=()=>settings(true);
function scoreHelp(){openModal('<h2>围住的空点，棋盘上的活子</h2><p>本站采用中国规则的面积计分。你常听到的“目数”，在这里用容易理解的“点”来比较。</p><div class="tip-block"><h3>黑方分数 = 黑活子 ＋ 黑棋围住的空点</h3><p>白方同样计算，再加 7.5 点贴目。中立空点不归任何一方。提掉对方的棋子能改变局面，但不会额外重复加到你的分数里。</p></div><table class="rules-table"><thead><tr><th>示例</th><th>黑棋</th><th>白棋</th></tr></thead><tbody><tr><td>盘上活子</td><td>25</td><td>23</td></tr><tr><td>围住空点</td><td>17</td><td>16</td></tr><tr><td>贴目</td><td>0</td><td>7.5</td></tr><tr><td>合计</td><td>42</td><td>46.5</td></tr></tbody></table><p>这个例子中白棋胜 4.5 点。换算成传统中国规则的胜负“子数”，是白胜 2.25 子；两种表达单位不同。</p><div class="tip-block"><h3>局中估算 ≠ 终局结果</h3><p>对弈中按距离和双方影响保守估计空点，未定区域以灰色表示；它不自动判断复杂死活。终局先标记死子，再按空点连通区域计算，争议死活需要继续下棋解决。</p></div><div class="modal-actions"><button class="button primary" id="score-learn">亲手练一次数子 →</button></div>','规则与计分说明');$('#score-learn').onclick=()=>openLesson(3);}
$('#score-help').onclick=scoreHelp;$('#rules-footer').onclick=scoreHelp;
$('#view-help').onclick=()=>openModal('<h2>换个视角，看懂这一局</h2><div class="tip-block"><h3>棋盘 · 看每一步</h3><p>小圆点标记上一手，绿色虚线环是推荐落点。落子在交叉点上，棋子不会移动，只会被提走。</p></div><div class="tip-block"><h3>气 · 看生存空间</h3><p>点击一颗棋子，它所属的整块棋会高亮。绿色小圆是这块棋共有的气；斜线相邻的棋子不算连接。</p></div><div class="tip-block"><h3>势力 · 看落点影响</h3><p>绿色偏向黑方，浅白色偏向白方。它来自棋子距离的启发式计算，帮助理解影响范围，不代表确定的地盘。</p></div><div class="tip-block"><h3>地盘 · 看分数来自哪里</h3><p>小方块表示空点归属，局中是估计，数子模式是按连通区域计算。未标记的空点保持中立或尚未确定。</p></div>');
$('#why-btn').onclick=()=>{
 if(preview){const p=preview;if(p.error){openModal(`<h2>这里为什么不能下？</h2><p>${p.error}</p>`);return;}showMoveDetails({i:p.i,before:state.board,after:p.board,captured:p.captured,explanation:p.explanation},'试落分析');return;}
 if(state.ended){scoreHelp();return;}
 if(hintDetails){showHintDetails();return;}
 const own=lastHuman(),opponent=[...state.moves].reverse().find(m=>m.color!==state.human&&m.i>=0);
 if(own){showMoveDetails(own,'你的这一手',opponent&&state.moves.indexOf(opponent)>state.moves.indexOf(own)?opponent:null);return;}
 if(opponent){showMoveDetails(opponent,'AI 的应对');return;}
 openModal('<h2>为什么先从角开始？</h2><p>围地需要把空点包围起来。在角部，你已经有两条棋盘边界帮忙，只需要围另外两边。</p><div class="tip-block"><h3>金角、银边、草肚皮</h3><p>初学时可以先在第三或第四线的角部落子，再向边上发展。点击「给我提示」，可以查看搜索推荐的具体落点、依据和可能应手。</p></div>');
};
function enterScoring(){stopAI();state.ended=true;state.dead=[];state.scored=false;view='territory';save();draw();toast('进入数子模式：请先点击并标记已确定的死棋。');}
$('#finish-btn').onclick=()=>{if(state.scored)return;if(state.ended){const e=score(state.board,state.n,state.komi,state.dead);openModal(`<h2>这一局，收获了多少？</h2><p>按你确认的死子和活棋，依据中国规则计算：</p><div class="result-score"><span>黑 ${e.black}</span><span>:</span><span>白 ${e.white+state.komi}</span></div><h3 class="result-caption">${e.diff===0?'双方平局':`${e.diff>0?'黑':'白'}棋胜 ${Math.abs(e.diff).toFixed(1)} 点`}</h3><p>黑方：活子与围空 ${e.black} 点。白方：活子与围空 ${e.white} 点，加贴目 ${state.komi} 点。中立 ${e.neutral} 点。</p><p>若存在未解决的劫争、死活或公活边界，请先继续对弈，不能只依靠这个估计判胜负。</p><div class="modal-actions"><button class="button" id="result-back">继续检查</button><button class="button primary" id="result-save">保存这次成长</button></div>`);$('#result-back').onclick=closeModal;$('#result-save').onclick=()=>{state.scored=true;stats.games++;save();draw();closeModal();toast('棋局结果已保存。每多懂一步，就离学会更近。');};}else{openModal('<h2>准备一起数子了吗？</h2><p>通常在双方都不再有值得下的地方时，连续停一手结束。你也可以现在进入教学数子模式。</p><div class="lesson-instruction">进入后，先点击整块死棋进行标记，系统再计算棋子和空点。复杂死活不会自动判定。</div><div class="modal-actions"><button class="button" id="keep-playing">继续下棋</button><button class="button primary" id="start-counting">进入数子模式</button></div>');$('#keep-playing').onclick=closeModal;$('#start-counting').onclick=()=>{closeModal();enterScoring();};}};

const lessonNumber=i=>String(i+1).padStart(2,'0');
const lessonCategory=i=>i<6?'基础规则':i===10||i===12||i===13?'计分与终局':i>=14?'棋盘与布局':'战术与死活';
function showLessons(){
 openModal(`<h2>一步一步，读懂围棋</h2><p>${lessons.length} 节互动课，从基础规则到 19 路标准棋盘。原有课程进度会继续保留。</p><div class="course-filters" role="group" aria-label="课程分类">${['全部课程','基础规则','战术与死活','计分与终局','棋盘与布局'].map((label,i)=>`<button class="${i===0?'selected':''}" data-course-filter="${label}">${label}</button>`).join('')}</div><div class="lesson-grid">${lessons.map((l,i)=>`<button class="lesson-option" data-open-lesson="${i}" data-category="${lessonCategory(i)}"><span>${lessonNumber(i)} · ${l.tag}</span>${stats.completed.includes(i)?'<span class="done-mark">✓ 已完成</span>':''}<h3>${l.title}</h3><p>${l.desc}</p></button>`).join('')}</div>`,'规则课程 · '+lessons.length+' 节互动课');
 $$('[data-open-lesson]').forEach(b=>b.onclick=()=>openLesson(+b.dataset.openLesson));
 $$('[data-course-filter]').forEach(button=>button.onclick=()=>{const filter=button.dataset.courseFilter;$$('[data-course-filter]').forEach(b=>b.classList.toggle('selected',b===button));$$('[data-open-lesson]').forEach(b=>b.hidden=filter!=='全部课程'&&b.dataset.category!==filter);});
}
function openLesson(index){
 const l=lessons[index],b=Array(l.n*l.n).fill(0);l.b.forEach(([i,c])=>b[i]=c);
 let selectedPoints=[],done=false,localBoard=b.slice(),last=-1,phase=0,deadMarks=[],capturedMarks=[];
 const answerMarkup=l.mode==='score'?'<button class="button" data-answer="0">黑 5 · 白 5</button><button class="button" data-answer="1">黑 10 · 白 10</button><button class="button" data-answer="2">黑 15 · 白 15</button>':l.answers?l.answers.map((a,i)=>`<button class="button" data-answer="${i}">${a}</button>`).join(''):l.mode==='passes'?'<button class="button" id="lesson-pass">黑方停一手</button>':'';
 openModal(`<h2>${l.title}</h2><p>${l.text}</p><div class="lesson-instruction">${l.task}</div><div class="lesson-board-scroll ${l.n===19?'standard-lesson':''}"><div class="mini-board"><svg id="lesson-board" viewBox="0 0 560 560" role="group" aria-label="${l.n} 路互动练习棋盘"></svg></div></div>${answerMarkup?`<div class="lesson-answers">${answerMarkup}</div>`:''}<div class="lesson-feedback" id="lesson-feedback" aria-live="polite">${l.mode==='score'?'别忘记把棋盘上的活子也加进去。':'在小棋盘上操作，试试看。'}</div><div class="modal-actions"><button class="button" id="lesson-all">全部课程</button><button class="button" id="lesson-reset">重做本课</button><button class="button primary" id="lesson-next" ${stats.completed.includes(index)?'':'disabled'}>${index===lessons.length-1?'回棋盘试一试':'下一课 →'}</button></div>`,'围棋课程 · '+lessonNumber(index)+' / '+lessons.length);
 const feedback=message=>$('#lesson-feedback').textContent=message;
 function redraw(){
  let html=boardSVG(localBoard,l.n,{interactive:true,mini:l.n!==19,last,dead:deadMarks,captured:capturedMarks,inf:l.mode==='compare'?influence(localBoard,l.n):null});
  const pad=42,step=476/(l.n-1);
  if(['libs','eyes','coordinates'].includes(l.mode))for(const p of selectedPoints)html+=`<circle cx="${pad+p%l.n*step}" cy="${pad+Math.floor(p/l.n)*step}" r="${Math.min(12,step*.3)}" fill="#baca94" stroke="#6f8d4e" stroke-width="2" pointer-events="none"/>`;
  $('#lesson-board').innerHTML=html;
 }
 function complete(message){done=true;feedback('✓ '+message);$('#lesson-next').disabled=false;if(!stats.completed.includes(index)){stats.completed.push(index);save();}updateJourney();}
 function handle(i){
  if(done)return;
  if(['libs','eyes','coordinates'].includes(l.mode)){
   if(!l.targets.includes(i)){feedback(l.mode==='coordinates'?'找找字母和行号：D4 在左下，Q16 在右上。':l.mode==='eyes'?'试试被黑棋包在内部的空点。':'找与黑子上下左右直接相邻的空点。');return;}
   if(!selectedPoints.includes(i))selectedPoints.push(i);redraw();feedback(`找到了 ${selectedPoints.length} / ${l.targets.length} 个目标。`);
   if(selectedPoints.length===l.targets.length)complete(l.success||(l.mode==='eyes'?'这两只真眼独立存在，黑棋不能被直接提走。':'找齐了！斜线相邻的空点不算气。'));
   return;
  }
  if(l.mode==='suicide'){if(i!==l.target){feedback('先点击正中心的空点，观察落子是否合法。');return;}const r=play(b,i,1,l.n);if(r.error)complete('黑子在这里落下后没有气，也无法提子，所以不能落子。');return;}
  if(['capture','connect','move','dame'].includes(l.mode)){
   if(i!==l.target){feedback(l.mode==='connect'?'找找左右黑棋之间的断点。':'再读一遍练习目标，观察哪一口气或空点最关键。');return;}
   const r=play(b,i,1,l.n);if(r.error){feedback(r.error);return;}localBoard=r.board;last=i;capturedMarks=r.captured;redraw();
   complete(l.success||(l.mode==='capture'?'最后一口气被填住，白子已被提走。':'这三颗黑子已经连成一块，现在共享所有的气。'));return;
  }
  if(l.mode==='ko'){
   if(phase===0){if(i!==l.target){feedback('先执黑在 C3 提走 B3 的白子。');return;}const r=play(localBoard,i,1,l.n,[key(b)]);if(r.error){feedback(r.error);return;}localBoard=r.board;last=i;phase=1;redraw();feedback('已提一子。现在点击 B3，尝试让白棋立即提回来。');}
   else{if(i!==l.recapture){feedback('请点击刚才被提走的 B3，尝试白棋立即回提。');return;}const r=play(localBoard,i,2,l.n,[key(b),key(localBoard)]);if(r.error)complete(l.success);}
   return;
  }
  if(l.mode==='seki'){
   if(i!==l.target){feedback('先点击右上角 C3 的公气。');return;}const first=play(b,i,1,l.n);if(first.error){feedback(first.error);return;}const response=play(first.board,l.response,2,l.n);if(response.error){feedback(response.error);return;}localBoard=response.board;last=l.response;capturedMarks=response.captured;redraw();complete(l.success);return;
  }
  if(l.mode==='dead'){
   if(![6,7].includes(i)){feedback('请点击黑棋包围的两颗内部白子之一。');return;}phase++;deadMarks=phase%2?group(b,i,l.n).stones:[];redraw();
   if(phase===3)complete(l.success);else feedback(phase===1?'已标记整块白棋。再点一次，取消标记。':'已取消。再点一次，重新确认这块死棋。');return;
  }
  if(l.mode==='compare'){
   if(!l.targets.includes(i)){feedback('请分别尝试 C7（三路）和 D6（四路）。');return;}const r=play(b,i,1,l.n);if(r.error){feedback(r.error);return;}localBoard=r.board;last=i;if(!selectedPoints.includes(i))selectedPoints.push(i);redraw();feedback(`${coord(i,l.n)}：落子后有 ${r.libs} 口气。${i===20?'三路更靠近边线，通常重实地。':'四路更靠近中腹，通常重发展。'}再试另一个落点。`);if(selectedPoints.length===2)complete(l.success);return;
  }
 }
 redraw();
 $('#lesson-board').onclick=e=>{const t=e.target.closest('[data-i]');if(t)handle(+t.dataset.i);};
 $('#lesson-board').onkeydown=e=>{const t=e.target.closest('[data-i]');if(!t)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();handle(+t.dataset.i);}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-l.n,ArrowDown:l.n}[e.key],p=Math.max(0,Math.min(l.n*l.n-1,+t.dataset.i+delta)),next=$(`#lesson-board [data-i="${p}"]`);t.setAttribute('tabindex','-1');next.setAttribute('tabindex','0');next.focus();}};
 $$('[data-answer]').forEach(el=>el.onclick=()=>{if(done)return;const correct=l.mode==='score'?1:l.answer;if(+el.dataset.answer===correct)complete(l.success||'黑白各有 5 颗活子和 5 个空点，各得 10 点，中立 5 点。');else feedback(l.mode==='score'?'两边各有 5 颗活子、5 个围住的空点，中间 5 点不属于任何一方。再算一次。':'再看看课程中的规则说明，不要仅凭外形判断活棋或死棋。');});
 if(l.mode==='passes')$('#lesson-pass').onclick=()=>{if(done)return;phase++;if(phase===1){feedback('黑方已停一手，棋局还没有结束。白方仍可以落子，也可以停一手。');$('#lesson-pass').textContent='白方停一手';}else{$('#lesson-pass').disabled=true;complete(l.success);}};
 $('#lesson-all').onclick=showLessons;$('#lesson-reset').onclick=()=>openLesson(index);$('#lesson-next').onclick=()=>index===lessons.length-1?closeModal():openLesson(index+1);
}

$$('[data-lesson]').forEach(b=>b.onclick=()=>openLesson(+b.dataset.lesson));$('#all-lessons').onclick=showLessons;$('#focus-btn').onclick=()=>openLesson(0);
function showProgress(){openModal(`<h2>一点一点，都算进步</h2><p>你的学习进度保存在当前浏览器里。换设备或清除浏览器数据后，进度不会同步。</p><div class="stats-grid"><div class="stat-box"><strong>${stats.moves}</strong><span>亲手落子</span></div><div class="stat-box"><strong>${stats.completed.length} / ${lessons.length}</strong><span>完成入门课</span></div><div class="stat-box"><strong>${stats.games}</strong><span>完成棋局</span></div></div>${lessons.map((l,i)=>`<div class="setting-row"><label>${String(i+1).padStart(2,'0')} · ${l.title}</label><span style="font-size:11px;color:#879a73">${stats.completed.includes(i)?'✓ 已学会':'等待探索'}</span></div>`).join('')}<div class="modal-actions"><button class="button primary" id="progress-learn">${stats.completed.length===lessons.length?'再复习一次':'继续学习 →'}</button></div>`,'我的学习 · 每一步都算数');$('#progress-learn').onclick=()=>openLesson(lessons.findIndex((l,i)=>!stats.completed.includes(i))<0?0:lessons.findIndex((l,i)=>!stats.completed.includes(i)));}
$$('[data-nav]').forEach(b=>b.onclick=()=>{$$('[data-nav]').forEach(x=>x.classList.toggle('active',x===b));if(b.dataset.nav==='rules')showLessons();else if(b.dataset.nav==='progress')showProgress();else{closeModal();window.scrollTo({top:0,behavior:'smooth'});}});
$('#help-btn').onclick=()=>openModal('<h2>你好，我们从第一手开始</h2><ol class="rule-steps"><li><b>01 · 在交叉点落子</b>你与 AI 轮流落子，黑棋先行。点击或轻触空交叉点立即落子，无需二次确认。默认开启预览：电脑悬停查看，手机长按约 0.4 秒查看，按住拖动换点，松手不会落子；可以随时关闭。支持 9、13 和 19 路棋盘。</li><li><b>02 · 换个视图看一看</b>点击「气」观察连接和生存空间；用「势力」观察影响范围；用「地盘」理解计分。</li><li><b>03 · 看不懂，就动手练</b>下方每节入门课都有小棋盘练习。随时可以悔棋，或让 AI 推荐一个落点。</li><li><b>04 · 最后一起数子</b>双方连续停一手进入数子，也能手动结束。标记已确定的死棋，再确认中国规则计分结果。</li></ol><p>推荐落点和实时分数来自本地搜索与估计。复杂死活值得继续下棋验证，不必急着下结论。</p>','欢迎来到一目');
$('#global-mode-btn').onclick=()=>setGlobalMode(!globalMode);
window.addEventListener('resize',updateGlobalBoardSize);
window.visualViewport?.addEventListener('resize',updateGlobalBoardSize);
$('#preview-toggle').checked=previewEnabled;
$('#preview-toggle').onchange=e=>{touchPreview.cancel();cancelScheduledPreview();previewEnabled=e.target.checked;preview=null;try{localStorage.setItem('yimu-preview-enabled',JSON.stringify(previewEnabled));}catch{}draw();};
$('#board').addEventListener('pointermove',e=>{if((e.pointerType!=='mouse'&&(e.pointerType!=='pen'||e.buttons))||$('#modal').open||touchPreview.active)return;const t=e.target.closest('[data-i]');if(t)schedulePreview(+t.dataset.i);});
$('#board').addEventListener('pointerleave',()=>{if(touchPreview.active)return;cancelScheduledPreview();if(preview){preview=null;draw();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#modal').open){touchPreview.cancel();if(globalMode){e.preventDefault();setGlobalMode(false);return;}cancelScheduledPreview();if(preview){preview=null;draw();}}});
draw();updateJourney();if(!state.ended&&state.turn!==state.human)askAI();
