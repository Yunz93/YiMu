// Generated from dist/ by scripts/build-wechat.mjs. Do not edit.
const {candidates,positionValue,play,group,neighbors,isEye,key}=require('./engine');
const performance={now:()=>Date.now()};
function rollout(b,c,n,limit){b=b.slice();let passes=0;for(let k=0;k<limit;k++){let best=null,bv=-Infinity;const empty=[];for(let i=0;i<b.length;i++)if(!b[i])empty.push(i);if(!empty.length)break;
const sample=empty.sort(()=>Math.random()-.5).slice(0,Math.min(empty.length,12));
for(const i of sample){const r=play(b,i,c,n);if(r.error||isEye(b,i,c,n))continue;let v=r.captured.length*12+Math.random()*5;if(r.libs===1)v-=12;for(const q of neighbors(i,n))if(b[q]){const g=group(b,q,n);if(b[q]===c&&g.libs.size===1)v+=8+g.stones.length*2;else if(b[q]===3-c&&g.libs.size===2)v+=4;}if(v>bv){best=r;bv=v;}}
if(best){b=best.board;passes=0;}else passes++;if(passes===2)break;c=3-c;}return b;}
function chooseMove(board,color,n,history,difficulty=1){const start=performance.now(),budget=[400,1100,2200][difficulty]||1100,roots=candidates(board,color,n,history,[10,16,22][difficulty]);if(!roots.length)return {i:-1,simulations:0};const initial=positionValue(board,color,n);
for(const r of roots){let worst=Infinity;r.reply=null;const replies=candidates(r.board,3-color,n,[...history,key(r.board)],difficulty===0?3:7);for(const s of replies){const value=positionValue(s.board,color,n)-s.value*.22;if(value<worst){worst=value;r.reply=s.i;}}r.base=(Number.isFinite(worst)?worst:positionValue(r.board,color,n))+r.value*.6;r.total=0;r.visits=0;}
roots.sort((a,b)=>b.base-a.base);const search=roots.slice(0,difficulty===0?4:7);let simulations=0;
while(performance.now()-start<budget){const total=simulations+1;let pick=search[0],best=-Infinity;for(const r of search){const v=r.visits?r.base*.7+r.total/r.visits*.3+6*Math.sqrt(Math.log(total+1)/r.visits):Infinity;if(v>best){best=v;pick=r;}}const end=rollout(pick.board,3-color,n,Math.min(n*n,55));pick.total+=positionValue(end,color,n);pick.visits++;simulations++;}
search.sort((a,b)=>(b.base*.8+(b.total/Math.max(1,b.visits))*.2)-(a.base*.8+(a.total/Math.max(1,a.visits))*.2));const best=search[0];const empties=board.filter(v=>!v).length;if(empties<n*n*.25&&best.base<initial-5&&best.value<1)return {i:-1,simulations};return {i:best.i,simulations,reply:best.reply,alternatives:search.slice(1,3).map(r=>r.i),compared:search.length};}

module.exports={chooseMove};
