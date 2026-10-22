import test from 'node:test';
import assert from 'node:assert/strict';
import {previewMove,play,group,key} from '../dist/engine.js';
import {chooseMove} from '../dist/ai.js';
import {lessons} from '../dist/lessons.js';

const board=(stones,n=5)=>{const b=Array(n*n).fill(0);stones.forEach(([i,c])=>b[i]=c);return b;};
const analysis=(stones,i,c=1,n=5)=>previewMove(board(stones,n),i,c,n).explanation;

test('救棋讲解指出原棋块、坐标和实际气数变化，不再统称延伸',()=>{
 const l=lessons[6],e=analysis(l.b,l.target);
 assert.equal(e.tag,'救棋');assert.equal(e.facts.rescuedGroups,1);
 assert.match(e.text,/C3.*原来只剩 1 口气.*变为 3 口/);
 assert.match(e.text,/尚不能.*已经做活/);
});
test('打吃讲解标明目标和最后一口气，并验证对手逃跑后的气',()=>{
 const b=board([[12,2],[7,1],[11,1]]),p=previewMove(b,13,1,5),e=p.explanation;
 assert.equal(e.tag,'打吃');assert.equal(e.facts.atariGroups,1);
 assert.match(e.text,/C3.*从 2 口降到 1 口.*C2/);
 const reply=play(p.board,17,2,5,[key(b),key(p.board)]);
 assert.equal(reply.libs,3);assert.match(e.followUp,/C2.*共有 3 口气/);
 assert.match(e.followUp,/不保证/);
});
test('紧气与补强根据不同棋块的气数生成不同目的',()=>{
 const attack=analysis([[12,2],[7,1]],11),defend=analysis([[12,1],[7,2],[11,2]],17);
 assert.equal(attack.tag,'紧气');assert.match(attack.text,/从 3 口压缩到 2 口/);
 assert.equal(defend.tag,'补强');assert.match(defend.text,/原有 2 口气.*共有 4 口/);
});
test('连接使用去重后的棋块数和共享气，不把同块的多个邻子当成多块',()=>{
 const e=analysis([[11,1],[13,1]],12);assert.equal(e.tag,'连接');
 assert.equal(e.facts.connectedGroups,2);assert.match(e.text,/分开的 2 块棋/);
 const same=analysis([[6,1],[7,1],[8,1],[11,1],[13,1],[16,1],[17,1],[18,1]],12);
 assert.equal(same.facts.connectedGroups,1);assert.equal(same.tag,'填眼');
 assert.match(same.risks.join(''),/填自己的眼/);assert.equal(same.ownDelta,0);
});
test('邻接落子既报告出头增气，也报告进攻时自身气变少的代价',()=>{
 const out=analysis([[12,1]],13);assert.equal(out.tag,'出头');assert.match(out.text,/4 口气变为 6 口/);
 const tight=analysis([[12,1],[8,2],[14,2],[18,2]],13);
 assert.match(tight.reasons.join(''),/4 口气变为 3 口/);assert.match(tight.risks.join(''),/气净减少 1 口/);
});
test('占断点、隔空呼应和接近敌棋的说明不虚构实际连接或吃子',()=>{
 const cut=analysis([[11,2],[13,2]],12);assert.equal(cut.tag,'断点');assert.match(cut.text,/不能保证.*别处联络/);
 const support=analysis([[40,1]],42,1,9);assert.equal(support.tag,'呼应');assert.match(support.text,/尚未直线连接/);
 const approach=analysis([[40,2]],42,1,9);assert.equal(approach.tag,'接近');assert.match(approach.text,/尚未直接紧气/);
});
test('脱先未救的打吃棋块会显示实际提子点和受威胁棋块',()=>{
 const e=analysis(lessons[6].b,0);assert.match(e.risks.join(''),/C3.*仍只剩 C2 一口气.*没有救到/);
});
test('自身一气给出合法提子应手，劫则阻止立即回提的错误建议',()=>{
 const danger=analysis([[7,2],[11,2],[13,2]],12);
 assert.equal(danger.tag,'危险');assert.match(danger.risks.join(''),/C2.*立即提走/);
 const l=lessons[8],b=board(l.b),p=previewMove(b,l.target,1,5);
 assert.equal(p.explanation.tag,'提子');assert.equal(p.libs,1);
 assert.match(p.explanation.risks.join(''),/回提受规则限制/);
 assert.doesNotMatch(p.explanation.risks.join(''),/可立即提走/);
});
test('分析应手也遵守历史超级劫，不建议已被禁止的逃跑',()=>{
 const b=board([[12,2],[7,1],[11,1]]),r=play(b,13,1,5),escape=play(r.board,17,2,5);
 const p=previewMove(b,13,1,5,[key(escape.board)]);
 assert.match(p.explanation.followUp,/直接延伸目前不合法/);
});
test('双方视角和19路坐标正确，分析不改变棋盘和历史',()=>{
 const b=board([[180,2],[161,1],[179,1],[181,1]],19),original=b.slice(),history=[key(b)],saved=history.slice();
 const p=previewMove(b,199,2,19,history);
 assert.equal(p.explanation.tag,'救棋');assert.match(p.explanation.text,/K10.*己方/);
 assert.equal(p.explanation.ownDelta,p.whiteDelta);assert.equal(p.explanation.oppDelta,p.blackDelta);
 assert.deepEqual(b,original);assert.deepEqual(history,saved);
 assert.equal(p.libs,group(p.board,199,19).libs.size);
});
test('AI推荐带回真实搜索过的合法应手与备选，便于解释推荐依据',()=>{
 const b=Array(81).fill(0),history=[key(b)],result=chooseMove(b,1,9,history,0);
 assert(result.i>=0);assert(result.compared>1);assert.equal(result.alternatives.length,2);
 const r=play(b,result.i,1,9,history);assert(!r.error);
 assert(Number.isInteger(result.reply));assert(!play(r.board,result.reply,2,9,[...history,key(r.board)]).error);
 assert.equal(new Set([result.i,...result.alternatives]).size,3);
 for(const i of result.alternatives)assert(!play(b,i,1,9,history).error);
 assert.deepEqual(b,Array(81).fill(0));assert.deepEqual(history,[key(b)]);
});
