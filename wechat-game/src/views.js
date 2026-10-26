const E=require('../shared/engine');
const {lessons}=require('../shared/lessons');
const {category}=require('../utils/format');
const {drawBoard}=require('./board');
const {COLORS:C}=require('./painter');
// Fullscreen uses the whole safe viewport, with controls anchored at its bottom.
function fullscreenView(a,p,w){
 const d=a.snapshot(),s=a.session.state,h=a.viewport.height,scoreH=36,dockH=80,dockY=h-dockH;
 const size=Math.min(w,Math.max(1,dockY-scoreH-8)),bx=(w-size)/2,by=scoreH+4+(dockY-scoreH-8-size)/2;
 p.stone(18,18,8,1);p.text(d.score.black,34,5,w<320?18:22,C.ink,'600');
 p.stone(w-18,18,8,2);p.text(d.score.white+s.komi,w-34,5,w<320?18:22,'#91a080','600','right');
 p.text(d.turn,w/2,4,10,C.green,'normal','center');p.text(d.scoreLabel+' · 白贴 7.5',w/2,21,9,C.muted,'normal','center');
 p.hit('score-analysis',8,0,w-16,scoreH,()=>a.showAnalysis());
 if(a.aiError){p.card(w/2-62,0,124,scoreH,'#fbf2e8',null,6);p.text('AI 未完成 · 点此重试',w/2,13,10,C.risk,'normal','center');p.hit('retry-ai',w/2-62,0,124,scoreH,()=>a.askAI(s.turn===s.human));}
 drawBoard(p,bx,by,size,d.board);a.boardRect={x:bx,y:by+p.offset,size,n:s.n,kind:'game'};
 p.ctx.fillStyle=C.paper;p.ctx.fillRect(0,dockY,w,dockH);p.rule(0,dockY,w);
 const tw=w-108;p.card(8,dockY+3,tw,32,'#f1f4ed',null,6);
 ['棋盘','气','势力','地盘'].forEach((label,i)=>{const id=['normal','liberties','influence','territory'][i],bw=(tw-6)/4,x=11+i*bw;if(a.view===id)p.card(x,dockY+6,bw,26,C.paper,null,4);p.text(label,x+bw/2,dockY+13,10,a.view===id?C.green:C.muted,a.view===id?'600':'normal','center');p.hit('view-'+id,x,dockY,bw,36,()=>{a.view=id;a.render();});});
 p.toggle('preview-toggle','预览',w-92,dockY+1,84,a.previewEnabled,()=>a.togglePreview(),a.busy||s.ended);
 const actions=[['undo','悔一手','undo',()=>a.undo(),!s.moves.length||s.scored],['hint','给我提示','bulb',()=>a.askAI(true),a.busy||s.ended],['pass',s.ended?'继续对弈':'停一手','pause',()=>a.pass(),a.busy||s.scored],['finish',s.scored?'开启新局':s.ended?'确认结果':'结束数子','flag',()=>a.finish(),a.busy]];
 actions.forEach(([id,label,icon,fn,disabled],i)=>p.button(id,label,i*w/4,dockY+36,w/4,44,fn,{quiet:true,icon,disabled}));
 return h;
}
// The board and its controls share one quiet surface, as on the web edition.
function gameView(a,p,w){
 if(a.globalMode)return fullscreenView(a,p,w);
 const d=a.snapshot(),s=a.session.state,x=12,cw=w-24,ix=x+12,iw=cw-24;
 let y=6;
 const size=iw;
 const panelHeight=148+size+96;
 p.card(x,y,cw,panelHeight);
 {
  p.text('边下边学',ix,y+14,13,C.ink,'600');p.card(ix+65,y+12,49,19,C.sage,null,4);p.text(s.n+' 路棋盘',ix+89.5,y+16,9,C.green,'normal','center');
  p.button('new','新局',w-153,y+3,66,36,()=>a.openSettings(true),{quiet:true,icon:'plus'});
  p.button('settings','设置',w-85,y+3,61,36,()=>a.openSettings(false),{quiet:true,icon:'settings'});
  y+=44;
 }
 // The estimated points stay alongside each player; the center is reserved for turn state.
 p.stone(ix+10,y+15,10,1);p.text(s.human===1?'你 · 执黑':'一目 AI · 黑',ix+27,y+2,11,C.ink,'600');p.text(d.score.black,ix+27,y+21,24,C.ink,'600');
 p.stone(w-ix-10,y+15,10,2);p.text(s.human===2?'你 · 执白':'一目 AI · 白',w-ix-27,y+2,11,C.ink,'600','right');p.text(d.score.white+s.komi,w-ix-27,y+21,24,'#91a080','600','right');
 p.text(d.scoreLabel,w/2,y+5,9,C.muted,'normal','center');p.circle(w/2-p.ctx.measureText(d.turn).width/2-5,y+29,2.3,'#89a675');p.text(d.turn,w/2,y+23,10,C.green,'normal','center');
 p.hit('score-analysis',ix,y,iw,52,()=>a.showAnalysis());y+=56;
 {
  const total=s.n*s.n,track=iw,black=Math.min(total,d.score.black),white=Math.min(total-black,d.score.white);
  p.card(ix,y,track,3,'#e7ebe2',null,1);if(black)p.card(ix,y,track*black/total,3,'#69805b',null,1);if(white)p.card(ix+track-track*white/total,y,track*white/total,3,'#c4d1b3',null,1);
  y+=10;p.toggle('preview-toggle','落子前预览',ix,y,128,a.previewEnabled,()=>a.togglePreview(),a.busy||s.ended);p.text('轻点落子 · 长按试落',w-ix,y+11,9,C.muted,'normal','right');y+=38;
 }
 const bx=(w-size)/2;drawBoard(p,bx,y,size,d.board);a.boardRect={x:bx,y:y+p.offset,size,n:s.n,kind:'game'};y+=size+8;
 const tabsX=ix;
 p.icon('eye',tabsX,y+10,14,C.muted);p.text('看懂棋盘',tabsX+20,y+11,10,C.muted);
 const tx=tabsX+96,tw=iw-96;
 p.card(tx,y+2,tw,32,'#f1f4ed',null,6);
 ['棋盘','气','势力','地盘'].forEach((label,i)=>{const id=['normal','liberties','influence','territory'][i],bw=(tw-6)/4,bx=tx+3+i*bw;if(a.view===id)p.card(bx,y+5,bw,26,C.paper,null,4);p.text(label,bx+bw/2,y+12,10,a.view===id?C.green:C.muted,a.view===id?'600':'normal','center');p.hit('view-'+id,bx,y,bw,38,()=>{a.view=id;a.render();});});y+=42;
 const actions=[['undo','悔一手','undo',()=>a.undo(),!s.moves.length||s.scored],['hint','给我提示','bulb',()=>a.askAI(true),a.busy||s.ended],['pass',s.ended?'继续对弈':'停一手','pause',()=>a.pass(),a.busy||s.scored],['finish',s.scored?'开启新局':s.ended?'确认结果':'结束数子','flag',()=>a.finish(),a.busy]];
 const ax=ix,aw=iw;p.rule(ax,y,aw);actions.forEach(([id,label,icon,fn,disabled],i)=>p.button(id,label,ax+i*aw/4,y+2,aw/4,42,fn,{quiet:true,icon,disabled}));y+=48;
 // Keep card height tied to its contents, with the coach immediately after it.
 y=6+panelHeight+12;
 if(a.aiError){const h=p.lines(a.aiError,cw-24,12).length*19+54;p.card(x,y,cw,h,'#fbf2e8',null);p.paragraph(a.aiError,x+12,y+10,cw-24,{size:12,lineHeight:19,color:C.risk});p.button('retry-ai','重试 AI',x+12,y+h-36,cw-24,28,()=>a.askAI(s.turn===s.human));y+=h+12;}
 const coachLines=p.lines(d.coach.title,cw-32,15).slice(0,2).length,bodyLines=p.lines(d.coach.text,cw-32,12).slice(0,3).length;
 const ch=143+coachLines*22+bodyLines*20;
 p.card(x,y,cw,ch);p.card(x+14,y+14,26,26,C.sage,null,8);p.icon('spark',x+19,y+19,16,'#7b955e');p.text('一目陪你看棋',x+49,y+20,12,C.ink,'600');p.circle(w-69,y+25,2,'#8caf72');p.text('实时讲解',w-61,y+20,9,C.muted);
 let cy=y+53;p.text(d.coach.label,x+16,cy,10,C.muted);p.text(d.coach.tag,w-28,cy,10,C.green,'normal','right');cy+=23;
 cy+=p.paragraph(d.coach.title,x+16,cy,cw-32,{size:15,lineHeight:22,color:C.ink,maxLines:2})+8;
 cy+=p.paragraph(d.coach.text,x+16,cy,cw-32,{size:12,lineHeight:20,maxLines:3})+10;
 p.rule(x+16,cy,cw-32);p.button('analysis','查看具体依据与后续应对',x+16,cy+1,cw-32,36,()=>a.showAnalysis(),{quiet:true});p.icon('arrow',w-42,cy+11,14,C.muted);y+=ch+12;
 const verdict=!s.board.some(Boolean)?'棋局刚刚开始，一切皆有可能。':`${d.score.diff===0?'双方持平':(d.score.diff>0?'黑':'白')+'方'+(s.ended?'':'估算')+'领先 '+Math.abs(d.score.diff).toFixed(1)+' 点'} · ${d.score.neutral} 点${s.ended?'中立':'未定'}`;
 p.card(x,y,cw,61,C.sage,null,9);p.text(verdict,x+14,y+12,11,C.green);p.text('中国规则 · 白贴 7.5 点 · 局中估算仅供参考',x+14,y+35,9,C.muted);p.hit('verdict-analysis',x,y,cw,61,()=>a.showAnalysis());y+=75;
 p.button('new-bottom','开启新对局',x,y,cw,40,()=>a.openSettings(true),{icon:'plus'});y+=52;
 y+=p.paragraph('AI 为本地搜索入门陪练。势力和占点是估算，不自动判断复杂死活。',x+4,y,cw-8,{size:10,lineHeight:18});return y+20;
}
function lessonArt(p,x,y,size,l){
 p.card(x,y,size,size,'#eef1e2',null,7);const c=p.ctx,step=size/4;
 c.save();c.beginPath();c.rect(x,y,size,size);c.clip();c.strokeStyle='#bbc7a4';c.lineWidth=.5;
 for(let i=0;i<5;i++){const q=step/2+i*step;c.beginPath();c.moveTo(x+q,y);c.lineTo(x+q,y+size);c.moveTo(x,y+q);c.lineTo(x+size,y+q);c.stroke();}
 const stones=l.b.length>9?l.b.filter((_,i)=>i%3===0).slice(0,6):l.b.slice(0,6);
 for(const [i,color] of stones){const px=x+size*.15+(i%l.n)/(l.n-1)*size*.7,py=y+size*.15+Math.floor(i/l.n)/(l.n-1)*size*.7;p.stone(px,py,Math.max(3,Math.min(7,size/(l.n+2))),color);}
 if(l.mode==='libs')for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]])p.circle(x+size/2+dx*size*.25,y+size/2+dy*size*.25,2.4,'#dce6c9','#94aa71',.7);
 c.restore();
}
function learnView(a,p,w){
 const stats=a.stats(),cw=w-24,x=12;let y=6;
 p.text('一点一点，把围棋学会',x+4,y+4,20,C.ink,'600');p.text('YOUR NEXT STEP',x+4,y+35,9,C.muted);y+=62;
 p.card(x,y,cw,102);const sw=(cw-24)/3;
 [[stats.completed.length+' / 16','已完成课程'],[stats.moves,'亲手落子'],[stats.games,'完成棋局']].forEach(([value,label],i)=>{const sx=x+12+i*sw;p.text(value,sx+sw/2,y+17,23,i===0?C.green:C.ink,'600','center');p.text(label,sx+sw/2,y+49,10,C.muted,'normal','center');if(i<2){p.ctx.fillStyle=C.border;p.ctx.fillRect(sx+sw,y+22,1,34);}});
 p.card(x+16,y+80,cw-32,4,'#e8ede2',null,2);if(stats.completed.length)p.card(x+16,y+80,(cw-32)*stats.completed.length/16,4,'#88a074',null,2);y+=116;
 const first=lessons.findIndex((l,i)=>!stats.completed.includes(i)),next=first<0?0:first;
 p.card(x,y,cw,110,C.sage,'#e0e7d5');lessonArt(p,x+14,y+20,64,lessons[next]);
 p.text(first<0?'随时回来，温故知新':'下一步 · '+String(next+1).padStart(2,'0'),x+93,y+17,10,C.muted);
 p.paragraph(lessons[next].title,x+93,y+37,cw-108,{size:14,lineHeight:21,color:C.ink,maxLines:1});
 p.button('continue-learning',first<0?'重新复习':stats.completed.length?'继续学习':'开始学习',x+87,y+66,cw-101,32,()=>a.openLesson(next),{quiet:true,icon:'arrow',selected:true});p.hit('continue-learning-card',x,y,cw,110,()=>a.openLesson(next));y+=130;
 p.text('全部入门课',x+4,y,13,C.ink,'600');p.text('16 节互动练习',w-16,y+1,10,C.muted,'normal','right');y+=30;
 let cx=x;for(const name of ['全部课程','基础规则','战术与死活','计分与终局','棋盘与布局']){const width=name.length*11+20;if(cx+width>w-12){cx=x;y+=38;}p.button('category-'+name,name,cx,y,width,32,()=>{a.filters.category=name;a.scroll.learn=0;a.render();},{selected:a.filters.category===name});cx+=width+6;}y+=46;
 const fw=(cw-8)/3;p.card(x,y,cw,34,'#eef2e9',null,7);['全部进度','待学习','已完成'].forEach((label,i)=>{if(a.filters.status===i)p.card(x+3+i*fw,y+3,fw-2,28,C.paper,null,5);p.text(label,x+3+i*fw+(fw-2)/2,y+11,11,a.filters.status===i?C.green:C.muted,'normal','center');p.hit('status-'+i,x+3+i*fw,y,fw-2,34,()=>{a.filters.status=i;a.scroll.learn=0;a.render();});});y+=50;
 const visible=lessons.map((l,i)=>({l,i,done:stats.completed.includes(i)})).filter(o=>(a.filters.category==='全部课程'||category(o.i)===a.filters.category)&&(a.filters.status===0||o.done===(a.filters.status===2)));
 for(const {l,i,done} of visible){
  p.card(x,y,cw,100);lessonArt(p,x+12,y+23,54,l);const tx=x+80,tw=cw-108;
  p.text(String(i+1).padStart(2,'0')+' · '+l.tag,tx,y+15,9,C.muted);p.paragraph(l.title,tx,y+34,tw,{size:13,lineHeight:19,color:C.ink,maxLines:1});p.paragraph(l.desc,tx,y+60,tw,{size:10,lineHeight:16,maxLines:1});p.icon(done?'check':'arrow',w-38,y+17,13,done?'#799862':'#a1ae96');p.text(done?'已完成':'互动练习',tx,y+79,8,done?C.green:C.muted);p.hit('lesson-'+i,x,y,cw,100,()=>a.openLesson(i));y+=110;
 }
 if(!visible.length){p.card(x,y,cw,100);p.text('当前筛选下暂时没有课程',w/2,y+15,13,C.muted,'normal','center');p.button('reset-filters','查看全部课程',x+16,y+49,cw-32,33,()=>{a.filters={category:'全部课程',status:0};a.render();});y+=114;}
 y+=p.paragraph('学习记录保存在本机。每次学一个小知识，再回棋盘试一试。',x+4,y,cw-8,{size:10,lineHeight:18});return y+20;
}
function lessonView(a,p,w){
 const m=a.lesson,l=m.lesson,x=16,cw=w-32;let y=10;
 p.text(l.tag,x,y,10,C.green);y+=24;
 y+=p.paragraph(l.title,x,y,cw,{size:20,lineHeight:28,color:C.ink})+14;
 y+=p.paragraph(l.text,x,y,cw,{size:13,lineHeight:22})+14;
 const taskHeight=p.lines(l.task,cw-24,13).length*21+22;p.card(x,y,cw,taskHeight,C.sage,null);p.paragraph(l.task,x+12,y+11,cw-24,{size:13,lineHeight:21,color:C.green});y+=taskHeight+15;
 drawBoard(p,x,y,cw,{n:l.n,board:m.board,last:m.last,captured:m.captured,selected:['libs','eyes','coordinates'].includes(l.mode)?m.selected:[],dead:m.dead,inf:l.mode==='compare'?E.influence(m.board,l.n):[]});a.boardRect={x,y:y+p.offset,size:cw,n:l.n,kind:'lesson'};y+=cw+16;
 const answers=l.mode==='score'?['黑 5 · 白 5','黑 10 · 白 10','黑 15 · 白 15']:l.answers||[];
 answers.forEach((label,index)=>{const height=p.lines(label,cw-28,13).length*21+20;p.card(x,y,cw,height,C.sage,null);p.paragraph(label,x+14,y+10,cw-28,{size:13,lineHeight:21,color:C.green});if(!m.done)p.hit('answer-'+index,x,y,cw,height,()=>a.answerLesson(index));y+=height+10;});
 if(l.mode==='passes'){p.button('lesson-pass',m.phase===0?'黑方停一手':'白方停一手',x,y,cw,37,()=>a.passLesson(),{disabled:m.done});y+=48;}
 y+=p.paragraph(m.feedback,x,y,cw,{size:13,lineHeight:22,color:m.done?C.green:C.muted})+18;
 const bw=(cw-8)/2;p.button('lesson-all','返回学习中心',x,y,bw,35,()=>a.navigate('learn'));p.button('lesson-reset','重做本课',x+bw+8,y,bw,35,()=>{m.reset();a.render();});y+=46;
 p.button('lesson-next',m.index===15?'回棋盘试一试':'下一课 →',x,y,cw,38,()=>m.index===15?a.navigate('game'):a.openLesson(m.index+1),{primary:true,disabled:!m.done&&!a.stats().completed.includes(m.index)});return y+56;
}
function aboutView(a,p,w){
 const x=16,cw=w-32;let y=10;
 p.text('让每一手，都看得懂。',x,y,22,C.ink,'600');y+=37;p.text('YiMu · 一目小游戏 '+a.config.version,x,y,12,C.muted);y+=32;
 const sections=[['关于一目','互动课程、落子讲解、局面预览和本地 AI 陪练，帮助初学者理解围棋。AI 棋力未经段级位评定，复杂死活需要继续验证。'],['隐私与本机数据','本版本无需登录。棋局、课程完成记录、累计统计、预览设置保存在当前设备的微信小游戏存储中，不会自动同步到网页版、普通小程序或其他设备。'],['本地计算','应用代码不向自建服务器或外部 AI 服务上传棋局，未接入广告、统计 SDK 或网络字体。窗口尺寸、像素比和安全区域仅在本地用于适配界面。'],['分享与清除','分享只携带首页或课程入口，不包含棋局、身份或学习记录。清理小游戏存储、更换设备可能丢失进度；下方可主动清除本机记录。']];
 for(const [title,text] of sections){p.text(title,x,y,16,C.ink,'600');y+=29;y+=p.paragraph(text,x,y,cw,{size:13,lineHeight:22})+24;}
 if(a.config.contact)y+=p.paragraph('反馈联系方式：'+a.config.contact,x,y,cw,{size:13,lineHeight:22})+18;
 if(a.config.filingNumber)y+=p.paragraph('备案号：'+a.config.filingNumber,x,y,cw,{size:12,lineHeight:20})+18;
 p.button('clear-data','清除本机棋局与学习记录',x,y,cw,37,()=>a.clearData(),{danger:true});return y+60;
}
function modalView(a,p,w,h){
 const m=a.modal,x=10,width=w-20,bx=x+16,bw=width-32,bottom=h-a.safeBottom-10;
 const headingLines=p.lines(m.title,width-92,16).slice(0,2),headerHeight=Math.max(60,headingLines.length*23+28);
 const groups=[['棋盘大小','size',[[9,'9 路'],[13,'13 路'],[19,'19 路']]],['你执哪一方','human',[[1,'执黑 · 先行'],[2,'执白 · 后行']]],['AI 思考程度','difficulty',[[0,'轻松入门'],[1,'认真思考'],[2,'深入挑战']]]];
 const note='调整棋盘或执子方会开启新局，课程和累计统计会保留。';
 const contentHeight=m.kind==='settings'?groups.length*90+p.lines(note,bw,12).length*21+16:(m.sections||[]).reduce((sum,section)=>sum+(section.heading?p.lines(section.heading,bw,14).length*22+8:0)+p.lines(section.text,bw,13).length*22+22,12);
 const sheetHeight=Math.min(bottom-a.headerTop,Math.max(220,contentHeight+headerHeight+70)),y=bottom-sheetHeight,bodyTop=y+headerHeight,bodyBottom=bottom-62;
 p.ctx.fillStyle='rgba(28,47,31,.35)';p.ctx.fillRect(0,0,w,h);p.card(x,y,width,sheetHeight,'#fcfdf9',null,16);p.hits=[];
 headingLines.forEach((line,i)=>p.text(line,bx,y+20+i*23,16,C.ink,'600'));p.button('modal-close','关闭',w-74,y+14,48,32,()=>a.closeModal(),{quiet:true});p.rule(bx,bodyTop-1,bw);
 p.startScroll(bodyTop,bodyBottom,m.scroll||0);let cy=12;
 if(m.kind==='settings'){
  for(const [title,field,options] of groups){p.text(title,bx,cy,13,C.ink,'600');cy+=28;const itemw=(bw-(options.length-1)*7)/options.length;options.forEach(([value,label],i)=>p.button('setting-'+field+'-'+value,label,bx+i*(itemw+7),cy,itemw,36,()=>{m[field]=value;a.render();},{selected:m[field]===value}));cy+=62;}
  cy+=p.paragraph(note,bx,cy,bw,{size:12,lineHeight:21})+4;
 }else{
  for(const section of m.sections||[]){if(section.heading)cy+=p.paragraph(section.heading,bx,cy,bw,{size:14,lineHeight:22,color:section.risk?C.risk:C.green})+8;cy+=p.paragraph(section.text,bx,cy,bw,{size:13,lineHeight:22,color:section.risk?C.risk:C.muted})+22;}
 }
 m.maxScroll=Math.max(0,cy-(bodyBottom-bodyTop));p.endScroll(h);p.rule(bx,bodyBottom,bw);
 p.button('modal-confirm',m.kind==='settings'?'保存设置':'返回，自己决定',bx,bottom-48,bw,36,()=>m.kind==='settings'?a.applySettings():a.closeModal(),{primary:true});
 a.modalViewport={top:bodyTop,bottom:bodyBottom};
}
function previewView(a,p,w){const trial=a.preview;if(!trial)return;const y=a.viewport.top+5,x=12,cw=w-24,title=trial.error?'不能在这里落子':trial.explanation.title,reason=trial.error||trial.explanation.risks[0]||trial.explanation.reasons[0];const h=trial.error?111:145;p.card(x,y,cw,h,'#f5faee','#cbdcbf');p.paragraph(title,x+12,y+11,cw-24,{size:14,lineHeight:20,color:C.green,maxLines:1});if(!trial.error)p.text(`${trial.libs} 口气 · 提 ${trial.captured.length} 子 · 黑 ${a.signed(trial.blackDelta)} / 白 ${a.signed(trial.whiteDelta)}`,x+12,y+37,12,C.green);p.paragraph(reason,x+12,y+(trial.error?36:60),cw-24,{size:12,lineHeight:18,maxLines:3});p.text('按住拖动换点 · 松手不落子',x+12,y+h-22,10,C.muted);}
module.exports={gameView,learnView,lessonView,aboutView,modalView,previewView};
