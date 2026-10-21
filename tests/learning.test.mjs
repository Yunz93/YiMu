import test from 'node:test';
import assert from 'node:assert/strict';
import {previewMove,play,group,groups,key,score,estimate,neighbors} from '../dist/engine.js';
import {lessons} from '../dist/lessons.js';

const setup=index=>{const l=lessons[index],b=Array(l.n*l.n).fill(0);l.b.forEach(([i,c])=>b[i]=c);return {l,b};};

test('试落与正式落子的规则和估算一致，原棋盘与劫历史不变',()=>{
 const {l,b}=setup(1),original=b.slice(),history=[key(b)],savedHistory=history.slice();
 const p=previewMove(b,l.target,1,l.n,history),r=play(b,l.target,1,l.n,history);
 assert.deepEqual(b,original);assert.deepEqual(history,savedHistory);
 assert.deepEqual(p.board,r.board);assert.deepEqual(p.captured,[12]);assert.equal(p.libs,group(r.board,l.target,l.n).libs.size);
 assert.deepEqual(p.after,estimate(r.board,l.n));assert.equal(p.blackDelta,p.after.black-p.before.black);
 assert.equal(p.blackDelta+p.whiteDelta+p.neutralDelta,0);
});
test('试落拦截占用点、自杀和劫回提',()=>{
 const {l,b}=setup(2);assert(previewMove(b,7,1,l.n).error);assert.match(previewMove(b,12,1,l.n).error,/禁入点/);
 const k=setup(8),capture=play(k.b,k.l.target,1,k.l.n),history=[key(k.b),key(capture.board)];
 assert.deepEqual(capture.captured,[k.l.recapture]);assert.match(previewMove(capture.board,k.l.recapture,2,k.l.n,history).error,/重复/);
});
test('19 路棋盘有361点，角边不跨行，中心与角的气正确',()=>{
 const b=Array(361).fill(0),center=previewMove(b,180,1,19),corner=previewMove(b,360,1,19);
 assert.equal(center.libs,4);assert.equal(corner.libs,2);assert.equal(center.after.owner.length,361);
 assert.equal(center.after.black+center.after.white+center.after.neutral,361);
 assert.deepEqual(neighbors(18,19).sort((a,b)=>a-b),[17,37]);assert.deepEqual(neighbors(19,19).sort((a,b)=>a-b),[0,20,38]);
 assert.equal(b.filter(Boolean).length,0);
});
test('课程初始棋形不包含已无气但仍留在盘上的棋子',()=>{
 assert.equal(lessons.length,16);
 lessons.forEach((l,i)=>{const {b}=setup(i);assert.equal(new Set(l.b.map(([p])=>p)).size,l.b.length,`重复点：${i}`);for(const g of groups(b,l.n))assert(g.libs.size>0,`第 ${i+1} 课存在零气棋块`);});
});
test('救棋与禁入点例外课程实际得到所述的气和提子',()=>{
 const rescue=setup(6),r=play(rescue.b,rescue.l.target,1,rescue.l.n);assert.equal(group(rescue.b,12,5).libs.size,1);assert.equal(r.libs,3);
 const exception=setup(7),e=play(exception.b,exception.l.target,1,exception.l.n);assert(!e.error);assert.equal(e.captured.length,2);assert.equal(e.libs,2);
});
test('公活教学模型中，无论哪方先填公气，另一方均可提掉先手棋块',()=>{
 const {l,b}=setup(11);assert.equal(score(b,l.n,0).neutral,2);
 const blackFirst=play(b,2,1,l.n),whiteReply=play(blackFirst.board,6,2,l.n);assert.equal(whiteReply.captured.length,5);
 const whiteFirst=play(b,2,2,l.n),blackReply=play(whiteFirst.board,6,1,l.n);assert.equal(blackReply.captured.length,4);
});
test('单官课程按中国规则确实增加一个黑方占点',()=>{
 const {l,b}=setup(10),before=score(b,l.n,0),r=play(b,l.target,1,l.n),after=score(r.board,l.n,0);
 assert.equal(before.black,10);assert.equal(after.black,11);assert.equal(after.white,10);assert.equal(after.neutral,before.neutral-1);
});
test('19路课程的坐标目标确实为 D4、Q16 星位',()=>{
 const l=lessons[14],columns='ABCDEFGHJKLMNOPQRST';
 assert.deepEqual(l.targets.map(i=>columns[i%19]+(19-Math.floor(i/19))),['D4','Q16']);
});
test('标准棋盘讲解能区分四路角部、沿边和中腹',()=>{
 const b=Array(361).fill(0);
 assert.match(previewMove(b,288,1,19).explanation.title,/一角/);
 assert.match(previewMove(b,9*19+2,1,19).explanation.title,/沿边/);
 assert.match(previewMove(b,180,1,19).explanation.title,/中腹/);
});
