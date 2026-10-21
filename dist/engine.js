export const BLACK=1, WHITE=2;
export const key=b=>b.join('');
export function neighbors(i,n){const a=[];if(i>=n)a.push(i-n);if(i<n*(n-1))a.push(i+n);if(i%n)a.push(i-1);if(i%n<n-1)a.push(i+1);return a;}
export function group(b,i,n){const color=b[i],stones=[],libs=new Set(),seen=new Set([i]),todo=[i];if(!color)return {stones,libs};while(todo.length){const p=todo.pop();stones.push(p);for(const q of neighbors(p,n)){if(!b[q])libs.add(q);else if(b[q]===color&&!seen.has(q)){seen.add(q);todo.push(q);}}}return {stones,libs};}
export function play(board,i,color,n,history=[]){if(i<0||i>=n*n||board[i])return {error:'这里已经有棋子了，请选择空的交叉点。'};const b=board.slice();b[i]=color;const captured=[];for(const p of neighbors(i,n)){if(b[p]===3-color){const g=group(b,p,n);if(!g.libs.size){captured.push(...g.stones);for(const q of g.stones)b[q]=0;}}}const own=group(b,i,n);if(!own.libs.size)return {error:'这是禁入点：落子后没有气，也不能提走对方棋子。'};if(history.includes(key(b)))return {error:'这一步会重复之前的局面。请先在别处落子，再考虑打劫。'};return {board:b,captured,libs:own.libs.size,stones:own.stones};}
export function groups(b,n){const out=[],seen=new Set();for(let i=0;i<b.length;i++)if(b[i]&&!seen.has(i)){const g=group(b,i,n);g.stones.forEach(p=>seen.add(p));out.push({...g,color:b[i]});}return out;}
function distances(b,color,n){const d=Array(b.length).fill(999),q=[];b.forEach((v,i)=>{if(v===color){d[i]=0;q.push(i);}});for(let j=0;j<q.length;j++)for(const p of neighbors(q[j],n)){if(!b[p]&&d[p]>d[q[j]]+1){d[p]=d[q[j]]+1;q.push(p);}}return d;}
export function influence(b,n){const a=distances(b,1,n),c=distances(b,2,n);return b.map((v,i)=>v===1?1:v===2?-1:a[i]===999&&c[i]===999?0:Math.max(-1,Math.min(1,(c[i]-a[i])/4))*Math.max(0,1-Math.min(a[i],c[i])/7));}
export function estimate(b,n,komi=7.5){const inf=influence(b,n);let black=0,white=0,neutral=0;const owner=inf.map((v,i)=>{if(b[i]===1){black++;return 1;}if(b[i]===2){white++;return 2;}if(v>=.44){black++;return 1;}if(v<=-.44){white++;return 2;}neutral++;return 0;});return {black,white,neutral,komi,diff:black-white-komi,owner,inf};}
export function score(b,n,komi=7.5,dead=[]){const clean=b.slice(),removed=[0,0,0];for(const i of dead){removed[clean[i]]++;clean[i]=0;}const owner=clean.slice(),seen=new Set();let black=clean.filter(x=>x===1).length,white=clean.filter(x=>x===2).length,neutral=0;for(let i=0;i<clean.length;i++)if(!clean[i]&&!seen.has(i)){const region=[],border=new Set(),q=[i];seen.add(i);while(q.length){const p=q.pop();region.push(p);for(const v of neighbors(p,n)){if(clean[v])border.add(clean[v]);else if(!seen.has(v)){seen.add(v);q.push(v);}}}const c=border.size===1?[...border][0]:0;region.forEach(p=>owner[p]=c);if(c===1)black+=region.length;else if(c===2)white+=region.length;else neutral+=region.length;}return {black,white,neutral,komi,diff:black-white-komi,owner,removed};}
export function isEye(b,i,c,n){return neighbors(i,n).every(p=>b[p]===c);}
export function tactical(b,i,c,n,h=[]){const r=play(b,i,c,n,h);if(r.error)return null;let value=r.captured.length*22;const seen=new Set();for(const p of neighbors(i,n)){if(!b[p]||seen.has(p))continue;const g=group(b,p,n);g.stones.forEach(x=>seen.add(x));if(b[p]===c){if(g.libs.size===1)value+=14+g.stones.length*5;else if(g.libs.size===2)value+=3;}else{const after=group(r.board,p,n);if(after.stones.length&&after.libs.size===1)value+=8+after.stones.length*2;}}
if(r.libs===1&&!r.captured.length)value-=25+r.stones.length*5;if(isEye(b,i,c,n))value-=35;
const x=i%n,y=Math.floor(i/n),edge=Math.min(x,y,n-1-x,n-1-y),count=b.filter(Boolean).length;
if(count<4&&Math.min(x,n-1-x)>=2&&Math.min(x,n-1-x)<=3&&Math.min(y,n-1-y)>=2&&Math.min(y,n-1-y)<=3)value+=8;
if(count<n*2){value+=[-3,1,4,2][Math.min(edge,3)];let nearest=99;for(let p=0;p<b.length;p++)if(b[p])nearest=Math.min(nearest,Math.abs(x-p%n)+Math.abs(y-Math.floor(p/n)));if(nearest>=3&&nearest<=5)value+=3;if(nearest===1)value-=1;}
value+=Math.min(r.libs,5)*.5;return {...r,value};}
export function positionValue(b,c,n){const e=estimate(b,n,0);let v=(e.black-e.white)*(c===1?1:-1);for(const g of groups(b,n)){const sign=g.color===c?1:-1;if(g.libs.size===1)v-=sign*(6+g.stones.length*5);else if(g.libs.size===2)v-=sign*(1+g.stones.length);else v+=sign*Math.min(g.libs.size,6)*.15;}return v;}
export function candidates(b,c,n,h=[],limit=14){const list=[];for(let i=0;i<b.length;i++)if(!b[i]){const r=tactical(b,i,c,n,h);if(r)list.push({i,...r});}return list.sort((a,b)=>b.value-a.value||a.i-b.i).slice(0,limit);}
export function explain(before,after,i,c,n,captured){const name=c===1?'黑棋':'白棋',g=group(after,i,n),adj=neighbors(i,n),allies=adj.filter(p=>before[p]===c),enemies=adj.filter(p=>after[p]===3-c);const atari=[];for(const p of enemies){const a=group(after,p,n);if(a.libs.size===1&&!atari.some(x=>x.stones.includes(p)))atari.push(a);}
if(captured.length)return {title:`提走 ${captured.length} 颗${c===1?'白':'黑'}子`,text:`这一手填住了对方的最后一口气，${captured.length} 颗棋子被提走。腾出的交叉点也成为你的气。`,tag:'提子',libs:g.libs.size};
if(g.libs.size===1)return {title:'注意，这块棋只剩一口气',text:'这叫“打吃”。对手下一手可能提走这块棋，试着向外延伸，或者先提掉对方的棋子。',tag:'危险',libs:1};
if(atari.length)return {title:'打吃！对方只剩一口气',text:`你压缩了对方的生存空间，有 ${atari.reduce((s,a)=>s+a.stones.length,0)} 颗棋子面临被提走的危险。观察对方会怎样逃跑。`,tag:'打吃',libs:g.libs.size};
const distinct=new Set();for(const p of allies)distinct.add(Math.min(...group(before,p,n).stones));
if(distinct.size>1)return {title:'连接，让棋子一起呼吸',text:`你把 ${distinct.size} 块棋连接成一块，它们共享 ${g.libs.size} 口气。连接通常能减少被分断、包围的风险。`,tag:'连接',libs:g.libs.size};
if(allies.length)return {title:'延伸，扩大这一块棋的空间',text:`${name}向外多走了一步。这一块棋现在共有 ${g.stones.length} 颗棋子、${g.libs.size} 口气。相连的棋子会共享气。`,tag:'延伸',libs:g.libs.size};
const x=i%n,y=Math.floor(i/n),dx=Math.min(x,n-x-1),dy=Math.min(y,n-y-1),edge=Math.min(dx,dy),corner=dx<=3&&dy<=3;
return {title:corner?'占据一角，建立自己的据点':edge<=3?'沿边发展，借助边界围地':'向中腹发展，拓展影响力',text:corner?'角部有两条棋盘边界帮忙。三路通常侧重实地，四路通常兼顾向外发展；具体好坏还要看周围棋子。':edge<=3?'这颗棋子靠近一条棋盘边界，沿边发展通常比中腹更容易围地。还要留意与角部棋子的连接。':'这颗棋子影响着周围的交叉点。中腹空间大，发展更自由，但围成确定的地盘通常需要更多棋子。',tag:edge<=3?'布局':'扩张',libs:g.libs.size};}

// Pure analysis: previews use the same legality and scoring functions as real moves.
export function previewMove(board,i,color,n,history=[],komi=7.5){
 const result=play(board,i,color,n,history);
 if(result.error)return {i,error:result.error};
 const before=estimate(board,n,komi),after=estimate(result.board,n,komi);
 return {...result,i,before,after,blackDelta:after.black-before.black,whiteDelta:after.white-before.white,neutralDelta:after.neutral-before.neutral,explanation:explain(board,result.board,i,color,n,result.captured)};
}
