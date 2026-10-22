// Generated from dist/ by scripts/build-wechat.mjs. Do not edit.
const BLACK=1, WHITE=2;
const key=b=>b.join('');
function neighbors(i,n){const a=[];if(i>=n)a.push(i-n);if(i<n*(n-1))a.push(i+n);if(i%n)a.push(i-1);if(i%n<n-1)a.push(i+1);return a;}
function group(b,i,n){const color=b[i],stones=[],libs=new Set(),seen=new Set([i]),todo=[i];if(!color)return {stones,libs};while(todo.length){const p=todo.pop();stones.push(p);for(const q of neighbors(p,n)){if(!b[q])libs.add(q);else if(b[q]===color&&!seen.has(q)){seen.add(q);todo.push(q);}}}return {stones,libs};}
function play(board,i,color,n,history=[]){if(i<0||i>=n*n||board[i])return {error:'这里已经有棋子了，请选择空的交叉点。'};const b=board.slice();b[i]=color;const captured=[];for(const p of neighbors(i,n)){if(b[p]===3-color){const g=group(b,p,n);if(!g.libs.size){captured.push(...g.stones);for(const q of g.stones)b[q]=0;}}}const own=group(b,i,n);if(!own.libs.size)return {error:'这是禁入点：落子后没有气，也不能提走对方棋子。'};if(history.includes(key(b)))return {error:'这一步会重复之前的局面。请先在别处落子，再考虑打劫。'};return {board:b,captured,libs:own.libs.size,stones:own.stones};}
function groups(b,n){const out=[],seen=new Set();for(let i=0;i<b.length;i++)if(b[i]&&!seen.has(i)){const g=group(b,i,n);g.stones.forEach(p=>seen.add(p));out.push({...g,color:b[i]});}return out;}
function distances(b,color,n){const d=Array(b.length).fill(999),q=[];b.forEach((v,i)=>{if(v===color){d[i]=0;q.push(i);}});for(let j=0;j<q.length;j++)for(const p of neighbors(q[j],n)){if(!b[p]&&d[p]>d[q[j]]+1){d[p]=d[q[j]]+1;q.push(p);}}return d;}
function influence(b,n){const a=distances(b,1,n),c=distances(b,2,n);return b.map((v,i)=>v===1?1:v===2?-1:a[i]===999&&c[i]===999?0:Math.max(-1,Math.min(1,(c[i]-a[i])/4))*Math.max(0,1-Math.min(a[i],c[i])/7));}
function estimate(b,n,komi=7.5){const inf=influence(b,n);let black=0,white=0,neutral=0;const owner=inf.map((v,i)=>{if(b[i]===1){black++;return 1;}if(b[i]===2){white++;return 2;}if(v>=.44){black++;return 1;}if(v<=-.44){white++;return 2;}neutral++;return 0;});return {black,white,neutral,komi,diff:black-white-komi,owner,inf};}
function score(b,n,komi=7.5,dead=[]){const clean=b.slice(),removed=[0,0,0];for(const i of dead){removed[clean[i]]++;clean[i]=0;}const owner=clean.slice(),seen=new Set();let black=clean.filter(x=>x===1).length,white=clean.filter(x=>x===2).length,neutral=0;for(let i=0;i<clean.length;i++)if(!clean[i]&&!seen.has(i)){const region=[],border=new Set(),q=[i];seen.add(i);while(q.length){const p=q.pop();region.push(p);for(const v of neighbors(p,n)){if(clean[v])border.add(clean[v]);else if(!seen.has(v)){seen.add(v);q.push(v);}}}const c=border.size===1?[...border][0]:0;region.forEach(p=>owner[p]=c);if(c===1)black+=region.length;else if(c===2)white+=region.length;else neutral+=region.length;}return {black,white,neutral,komi,diff:black-white-komi,owner,removed};}
function isEye(b,i,c,n){return neighbors(i,n).every(p=>b[p]===c);}
function tactical(b,i,c,n,h=[]){const r=play(b,i,c,n,h);if(r.error)return null;let value=r.captured.length*22;const seen=new Set();for(const p of neighbors(i,n)){if(!b[p]||seen.has(p))continue;const g=group(b,p,n);g.stones.forEach(x=>seen.add(x));if(b[p]===c){if(g.libs.size===1)value+=14+g.stones.length*5;else if(g.libs.size===2)value+=3;}else{const after=group(r.board,p,n);if(after.stones.length&&after.libs.size===1)value+=8+after.stones.length*2;}}
if(r.libs===1&&!r.captured.length)value-=25+r.stones.length*5;if(isEye(b,i,c,n))value-=35;
const x=i%n,y=Math.floor(i/n),edge=Math.min(x,y,n-1-x,n-1-y),count=b.filter(Boolean).length;
if(count<4&&Math.min(x,n-1-x)>=2&&Math.min(x,n-1-x)<=3&&Math.min(y,n-1-y)>=2&&Math.min(y,n-1-y)<=3)value+=8;
if(count<n*2){value+=[-3,1,4,2][Math.min(edge,3)];let nearest=99;for(let p=0;p<b.length;p++)if(b[p])nearest=Math.min(nearest,Math.abs(x-p%n)+Math.abs(y-Math.floor(p/n)));if(nearest>=3&&nearest<=5)value+=3;if(nearest===1)value-=1;}
value+=Math.min(r.libs,5)*.5;return {...r,value};}
function positionValue(b,c,n){const e=estimate(b,n,0);let v=(e.black-e.white)*(c===1?1:-1);for(const g of groups(b,n)){const sign=g.color===c?1:-1;if(g.libs.size===1)v-=sign*(6+g.stones.length*5);else if(g.libs.size===2)v-=sign*(1+g.stones.length);else v+=sign*Math.min(g.libs.size,6)*.15;}return v;}
function candidates(b,c,n,h=[],limit=14){const list=[];for(let i=0;i<b.length;i++)if(!b[i]){const r=tactical(b,i,c,n,h);if(r)list.push({i,...r});}return list.sort((a,b)=>b.value-a.value||a.i-b.i).slice(0,limit);}
const moveCoord=(i,n)=>'ABCDEFGHJKLMNOPQRST'[i%n]+(n-Math.floor(i/n));
// Explanations report verifiable changes in this position, rather than inferring intent
// from adjacency alone. They are shared by played moves, previews and AI suggestions.
function explain(before,after,i,c,n,captured=[],history=[]){
 const g=group(after,i,n),all=groups(before,n),touch=neighbors(i,n);
 const allies=all.filter(a=>a.color===c&&a.stones.some(p=>touch.includes(p)));
 const enemies=all.filter(a=>a.color===3-c&&a.stones.some(p=>touch.includes(p)));
 const label=a=>`${moveCoord(Math.min(...a.stones),n)} 一带的 ${a.stones.length} 颗${a.color===c?'己方':'对方'}棋子`;
 const changed=enemies.filter(a=>after[a.stones[0]]===3-c).map(a=>({before:a,after:group(after,a.stones[0],n)}));
 const atari=changed.filter(a=>a.after.libs.size===1),pressed=changed.filter(a=>a.after.libs.size===2&&a.before.libs.size>2);
 const rescued=all.filter(a=>a.color===c&&a.libs.size===1&&after[a.stones[0]]===c&&group(after,a.stones[0],n).libs.size>1);
 const strengthened=allies.filter(a=>a.libs.size===2&&g.libs.size>=3);
 const reasons=[],risks=[],replyHistory=[...history,key(before),key(after)];let title,tag,followUp='';
 if(captured.length)reasons.push(`在 ${moveCoord(i,n)} 填掉最后一口气，实际提走对方 ${captured.length} 颗子；提子本身不会在中国规则下重复加分。`);
 for(const a of rescued)reasons.push(`${label(a)}原来只剩 1 口气，现在变为 ${group(after,a.stones[0],n).libs.size} 口，解除了眼前的打吃，但尚不能据此判断已经做活。`);
 if(allies.length>1)reasons.push(`把原本分开的 ${allies.length} 块棋在 ${moveCoord(i,n)} 实际连成一块，共享 ${g.libs.size} 口气，封住了这里的连接缺口。`);
 for(const a of atari)reasons.push(`${label(a.before)}的气从 ${a.before.libs.size} 口降到 1 口，最后一口气在 ${moveCoord([...a.after.libs][0],n)}。`);
 for(const a of pressed)reasons.push(`${label(a.before)}的气从 ${a.before.libs.size} 口压缩到 2 口，增加了对方补棋的压力。`);
 for(const a of strengthened)reasons.push(`${label(a)}原有 2 口气，连接落子后共有 ${g.libs.size} 口，给这块弱棋增加了腾挪空间。`);
 if(allies.length===1&&!rescued.includes(allies[0])&&!strengthened.length){
  const a=allies[0],delta=g.libs.size-a.libs.size;
  reasons.push(`${label(a)}由 ${a.libs.size} 口气变为 ${g.libs.size} 口，棋子从 ${a.stones.length} 颗增至 ${g.stones.length} 颗。${delta>0?'新增的气提供了继续活动的空间。':'新增一颗子不一定更安全，需要看是否有补断或围地的实际价值。'}`);
  if(delta<0)risks.push(`本块的气净减少 ${-delta} 口；即使同时在进攻，也要留意自身气紧，不能只按棋子数量判断强弱。`);
 }
 if(g.libs.size===1){
  const p=[...g.libs][0],r=play(after,p,3-c,n,replyHistory);
  risks.unshift(r.error?`本块 ${g.stones.length} 颗子仅剩 ${moveCoord(p,n)} 一口气；对手目前在这里回提受规则限制，仍需关注后续劫争或救棋。`:`对手若在 ${moveCoord(p,n)} 落子，可立即提走本块 ${g.stones.length} 颗子；不能只看提子收益或估算占点。`);
  if(!r.error)followUp=`先检查对手 ${moveCoord(p,n)} 的提子手段，再考虑救棋或制造更紧迫的威胁。`;
 }
 // A move elsewhere may leave an existing group in atari. Do not praise it as safe.
 for(const a of all.filter(a=>a.color===c&&a.libs.size===1&&after[a.stones[0]]===c)){
  const now=group(after,a.stones[0],n);if(now.stones.includes(i)||now.libs.size!==1)continue;
  const p=[...now.libs][0],r=play(after,p,3-c,n,replyHistory);
  if(!r.error&&r.captured.includes(a.stones[0]))risks.push(`${label(a)}仍只剩 ${moveCoord(p,n)} 一口气；这一步没有救到它，对手可提走这块棋。`);
 }
 const eyeFill=isEye(before,i,c,n)&&!captured.length;
 if(eyeFill)risks.push('这个空点四周已是己方棋子，可能在填自己的眼或内部空点。没有提子、补断等需要时，不应只为增加盘上棋子数而下在这里。');
 if(captured.length){tag='提子';title=`提走 ${captured.length} 颗子${rescued.length?'，同时解救被打吃的棋':''}`;}
 else if(g.libs.size===1){tag='危险';title='落子后仍被打吃，需要先看风险';}
 else if(rescued.length){tag='救棋';title=`救出被打吃的棋，增加到 ${g.libs.size} 口气`;}
 else if(atari.length){tag='打吃';title=`打吃 ${atari.reduce((s,a)=>s+a.before.stones.length,0)} 颗子，形成提子威胁`;}
 else if(allies.length>1){tag='连接';title=`连接 ${allies.length} 块棋，封住连接缺口`;}
 else if(eyeFill){tag='填眼';title='这里可能在填自己的眼，先检查必要性';}
 else if(strengthened.length){tag='补强';title='给弱棋增加气，减轻受攻压力';}
 else if(pressed.length){tag='紧气';title='压缩对方到两口气，开始施压';}
 else if(enemies.length>1){tag='断点';title='占住对方两块棋之间的连接点';reasons.push(`对方在这个空点周围有 ${enemies.length} 块尚未直线连接的棋。占住 ${moveCoord(i,n)} 会阻止它们在这里直接连接，但不能保证它们无法从别处联络。`);}
 else if(allies.length){
  const a=allies[0],delta=g.libs.size-a.libs.size;
  tag=delta>0?'出头':delta<0?'气紧':'补形';title=delta>0?`向外出头，净增加 ${delta} 口气`:delta<0?'落子使本块的气变少了':'补形，但没有增加本块的气';
 }
 else{
  const x=i%n,y=Math.floor(i/n),dx=Math.min(x,n-x-1),dy=Math.min(y,n-y-1),edge=Math.min(dx,dy),corner=dx<=3&&dy<=3;
  const distance=p=>Math.abs(x-p%n)+Math.abs(y-Math.floor(p/n));
  const nearEnemy=all.filter(a=>a.color===3-c).sort((a,b)=>Math.min(...a.stones.map(distance))-Math.min(...b.stones.map(distance)))[0];
  const nearAlly=all.filter(a=>a.color===c).sort((a,b)=>Math.min(...a.stones.map(distance))-Math.min(...b.stones.map(distance)))[0];
  if(nearEnemy&&Math.min(...nearEnemy.stones.map(distance))<=3){tag='接近';title='接近对方，争夺周围空间';reasons.push(`落点距${label(nearEnemy)}最近 ${Math.min(...nearEnemy.stones.map(distance))} 格，但尚未直接紧气。这是争夺附近空间，也会让新子更容易受到接触战的压力。`);}
  else if(nearAlly&&Math.min(...nearAlly.stones.map(distance))<=3){tag='呼应';title='与己方棋子呼应，拓展活动范围';reasons.push(`落点距${label(nearAlly)}最近 ${Math.min(...nearAlly.stones.map(distance))} 格，能够向这一侧发展；两者尚未直线连接，仍要检查中间的断点。`);}
  else{tag=edge<=3?'布局':'扩张';title=corner?'占据一角，建立自己的据点':edge<=3?'沿边发展，借助边界围地':'向中腹发展，拓展影响力';reasons.push(corner?`这是距两侧边线第 ${dx+1} 路、第 ${dy+1} 路的角部落点，两条边有助于围空。${edge===2?'三路偏重实地。':edge===3?'四路兼顾向外发展。':edge<2?'位置偏低，需留意发展效率。':''}`:edge<=3?`这是距最近边线第 ${edge+1} 路的沿边落点，能借助一条边围空；还要与两侧棋子保持呼应。`:'这一步位于中腹，主要争取向四周的影响。周围缺少边界，不能把影响范围直接算成已经围住的地。');}
 }
 if(!followUp&&atari.length){const a=atari[0],p=[...a.after.libs][0],r=play(after,p,3-c,n,replyHistory);followUp=r.error?`对方在最后一口气 ${moveCoord(p,n)} 直接延伸目前不合法，但仍可能在别处提子或打劫，不能直接认定已死。`:`对方可能在 ${moveCoord(p,n)} 接着逃跑，逃出后共有 ${r.libs} 口气${r.captured.length?`，还会提走你 ${r.captured.length} 颗子`:''}；打吃并不保证下一手吃到。`;}
 if(!followUp)followUp=rescued.length||strengthened.length?'下一步检查对手是否还能继续紧气，以及己方是否能连接或形成眼位。':allies.length>1?'接着留意两侧的薄弱处；连接增加整体性，仍不等于已经做活。':'下一步观察对手靠近、分断或抢占空点后的变化，再决定继续发展还是补棋。';
 const e0=estimate(before,n,0),e1=estimate(after,n,0),ownDelta=c===1?e1.black-e0.black:e1.white-e0.white,oppDelta=c===1?e1.white-e0.white:e1.black-e0.black;
 return {title,tag,libs:g.libs.size,reasons,risks,followUp,ownDelta,oppDelta,
  text:[...reasons.slice(0,3),risks[0]||followUp].join(''),
  facts:{connectedGroups:allies.length,rescuedGroups:rescued.length,atariGroups:atari.length,pressuredGroups:pressed.length,captured:captured.length,stones:g.stones.length}};
}

// Pure analysis: previews use the same legality and scoring functions as real moves.
function previewMove(board,i,color,n,history=[],komi=7.5){
 const result=play(board,i,color,n,history);
 if(result.error)return {i,error:result.error};
 const before=estimate(board,n,komi),after=estimate(result.board,n,komi);
 return {...result,i,before,after,blackDelta:after.black-before.black,whiteDelta:after.white-before.white,neutralDelta:after.neutral-before.neutral,explanation:explain(board,result.board,i,color,n,result.captured,history)};
}

module.exports={BLACK,WHITE,key,neighbors,group,play,groups,influence,estimate,score,isEye,tactical,positionValue,candidates,explain,previewMove};
