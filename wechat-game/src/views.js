const E=require('../shared/engine');
const {lessons}=require('../shared/lessons');
const {category}=require('../utils/format');
const {drawBoard}=require('./board');
const {COLORS:C}=require('./painter');
const margin=16;
function gameView(a,p,w){
 const d=a.snapshot(),s=a.session.state,x=margin,cw=w-32;let y=10;
 if(!a.globalMode){p.text(`${s.n} 路${s.n===19?'标准棋盘':'棋盘'} · 你执${s.human===1?'黑':'白'}`,x,y,12,C.muted);p.text(a.saved?'本机存档':'暂未保存',w-16,y,11,a.saved?C.muted:C.risk,'normal','right');y+=24;}
 const scoreHeight=a.globalMode?54:68;p.card(x,y,cw,scoreHeight);p.text('黑 '+d.score.black,x+16,y+15,25,C.ink,'600');p.text('白 '+(d.score.white+s.komi),w-32,y+15,25,C.ink,'600','right');p.text(d.scoreLabel,w/2,y+10,10,C.muted,'normal','center');p.text(d.turn,w/2,y+30,11,C.green,'normal','center');p.text('点此看讲解',w/2,y+(a.globalMode?43:48),9,C.muted,'normal','center');p.hit('score-analysis',x,y,cw,scoreHeight,()=>a.showAnalysis());y+=scoreHeight+12;
 const size=a.globalMode?Math.max(80,Math.min(cw,a.viewport.height-204)):cw;
 const bx=(w-size)/2;drawBoard(p,bx,y,size,d.board);a.boardRect={x:bx,y:y+p.offset,size,n:s.n,kind:'game'};y+=size+12;
 const vwidth=(cw-88-12)/4;['棋盘','气','势力','地盘'].forEach((label,i)=>{const id=['normal','liberties','influence','territory'][i];p.button('view-'+id,label,x+i*(vwidth+3),y,vwidth,33,()=>{a.view=id;a.render();},{selected:a.view===id});});
 p.button('preview-toggle',a.previewEnabled?'预览 开':'预览 关',w-96,y,80,33,()=>a.togglePreview(),{selected:a.previewEnabled,disabled:a.busy||s.ended});y+=45;
 const bw=(cw-16)/3;
 const actions=[['undo','悔一手',()=>a.undo(),!s.moves.length||s.scored],['hint','给我提示',()=>a.askAI(true),a.busy||s.ended],['pass',s.ended?'继续对弈':'停一手',()=>a.pass(),a.busy||s.scored],['finish',s.scored?'开启新局':s.ended?'确认结果':'结束数子',()=>a.finish(),a.busy],['new','新对局',()=>a.openSettings(true),false],['settings','对局设置',()=>a.openSettings(false),false]];
 if(a.globalMode){const gw=(cw-18)/4;actions.slice(0,4).forEach(([id,label,fn,disabled],i)=>p.button(id,label,x+i*(gw+6),y,gw,34,fn,{disabled}));y+=42;}else{actions.forEach(([id,label,fn,disabled],i)=>p.button(id,label,x+(i%3)*(bw+8),y+Math.floor(i/3)*42,bw,34,fn,{disabled}));y+=86;}
 if(a.aiError){const h=p.lines(a.aiError,cw-24,12).length*19+54;p.card(x,y,cw,h,'#fbf2e8',null);p.paragraph(a.aiError,x+12,y+10,cw-24,{size:12,lineHeight:19,color:C.risk});p.button('retry-ai','重试 AI',x+12,y+h-36,cw-24,28,()=>a.askAI(s.turn===s.human));y+=h+12;}
 if(a.globalMode){p.text(s.n+' 路 · 点比分看讲解，长按预览不落子',w/2,y,10,C.muted,'normal','center');return y+24;}
 y+=p.paragraph('轻点立即落子 · 长按约 0.4 秒预览，松手不落子。',x,y,cw,{size:11,lineHeight:18})+8;
 const verdict=!s.board.some(Boolean)?'棋局刚刚开始，一切皆有可能。':`${d.score.diff===0?'双方持平':(d.score.diff>0?'黑':'白')+'方'+(s.ended?'':'估算')+'领先 '+Math.abs(d.score.diff).toFixed(1)+' 点'} · ${d.score.neutral} 点${s.ended?'中立':'未定'}`;
 y+=p.paragraph(verdict+' 白方含 7.5 点贴目。',x,y,cw,{size:11,lineHeight:18})+12;
 p.card(x,y,cw,226);p.text('一目陪你看棋',x+14,y+13,15,C.ink,'600');p.text(d.coach.tag,w-32,y+15,11,C.green,'normal','right');p.text(d.coach.label,x+14,y+39,11,C.muted);p.paragraph(d.coach.title,x+14,y+60,cw-28,{size:16,lineHeight:23,color:C.ink,maxLines:2});p.paragraph(d.coach.text,x+14,y+112,cw-28,{size:12,lineHeight:20,maxLines:3});p.button('analysis','查看具体依据与后续应对 ↗',x+14,y+182,cw-28,31,()=>a.showAnalysis());y+=240;
 y+=p.paragraph('AI 为本地搜索入门陪练。势力和占点是估算，不自动判断复杂死活。',x,y,cw,{size:11,lineHeight:18});return y+20;
}
function learnView(a,p,w){
 const stats=a.stats(),cw=w-32,x=16;let y=10;
 p.text('每次学一点，再回棋盘试一试。',x,y,13,C.muted);y+=30;
 const sw=(cw-16)/3;[[stats.completed.length+' / 16','已完成课程'],[stats.moves,'亲手落子'],[stats.games,'完成棋局']].forEach(([value,label],i)=>{const sx=x+i*(sw+8);p.card(sx,y,sw,74,C.sage,null);p.text(value,sx+sw/2,y+13,23,C.green,'600','center');p.text(label,sx+sw/2,y+47,11,C.muted,'normal','center');});y+=88;
 p.card(x,y,cw,5,'#e5ecde',null,2);if(stats.completed.length)p.card(x,y,cw*stats.completed.length/16,5,'#799d65',null,2);y+=19;
 const first=lessons.findIndex((l,i)=>!stats.completed.includes(i)),next=first<0?0:first;
 p.card(x,y,cw,107);p.text(first<0?'全部学完，随时回来巩固':'下一节未完成课程',x+12,y+11,11,C.muted);p.paragraph(lessons[next].title,x+12,y+32,cw-24,{size:16,lineHeight:21,color:C.ink,maxLines:1});p.button('continue-learning',first<0?'重新复习':stats.completed.length?'继续学习 →':'开始学习 →',x+12,y+64,cw-24,31,()=>a.openLesson(next),{primary:true});y+=122;
 let cx=x;for(const name of ['全部课程','基础规则','战术与死活','计分与终局','棋盘与布局']){const width=name.length*12+20;if(cx+width>w-16){cx=x;y+=39;}p.button('category-'+name,name,cx,y,width,30,()=>{a.filters.category=name;a.scroll.learn=0;a.render();},{selected:a.filters.category===name});cx+=width+7;}y+=44;
 const fw=(cw-16)/3;['全部进度','待学习','已完成'].forEach((label,i)=>p.button('status-'+i,label,x+i*(fw+8),y,fw,30,()=>{a.filters.status=i;a.scroll.learn=0;a.render();},{selected:a.filters.status===i}));y+=44;
 const visible=lessons.map((l,i)=>({l,i,done:stats.completed.includes(i)})).filter(o=>(a.filters.category==='全部课程'||category(o.i)===a.filters.category)&&(a.filters.status===0||o.done===(a.filters.status===2)));
 p.text(visible.length+' 节课程',x,y,12,C.muted);y+=25;
 for(const {l,i,done} of visible){p.card(x,y,cw,118);p.text(String(i+1).padStart(2,'0')+' · '+l.tag,x+12,y+11,10,C.muted);p.text(done?'✓ 已完成':'待学习',w-28,y+11,10,C.green,'normal','right');p.paragraph(l.title,x+12,y+34,cw-24,{size:15,lineHeight:20,color:C.ink,maxLines:1});p.paragraph(l.desc,x+12,y+60,cw-24,{size:12,lineHeight:18,maxLines:1});p.text(done?'复习本课 →':'开始学习 →',x+12,y+91,12,C.green);p.hit('lesson-'+i,x,y,cw,118,()=>a.openLesson(i));y+=130;}
 if(!visible.length){p.card(x,y,cw,100);p.text('当前筛选下暂时没有课程',w/2,y+15,13,C.muted,'normal','center');p.button('reset-filters','查看全部课程',x+16,y+49,cw-32,33,()=>{a.filters={category:'全部课程',status:0};a.render();});y+=114;}
 y+=p.paragraph('学习记录保存在本机，不会自动与网页或其他设备同步。',x,y,cw,{size:11,lineHeight:18});return y+20;
}
function lessonView(a,p,w){
 const m=a.lesson,l=m.lesson,x=16,cw=w-32;let y=10;
 y+=p.paragraph(l.title,x,y,cw,{size:22,lineHeight:29,color:C.ink})+14;
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
 p.button('copy-website','复制网页版地址',x,y,cw,37,()=>a.copy(a.config.website));y+=48;p.button('copy-repository','复制开源项目地址',x,y,cw,37,()=>a.copy(a.config.repository));y+=48;
 if(a.config.contact)y+=p.paragraph('反馈联系方式：'+a.config.contact,x,y,cw,{size:13,lineHeight:22})+18;
 if(a.config.filingNumber)y+=p.paragraph('备案号：'+a.config.filingNumber,x,y,cw,{size:12,lineHeight:20})+18;
 p.button('clear-data','清除本机棋局与学习记录',x,y,cw,37,()=>a.clearData(),{danger:true});return y+60;
}
function modalView(a,p,w,h){
 const m=a.modal,x=10,y=a.headerTop,width=w-20,bottom=h-a.safeBottom-10,bodyTop=y+55,bodyBottom=bottom-58;
 p.ctx.fillStyle='rgba(28,47,31,.45)';p.ctx.fillRect(0,0,w,h);p.card(x,y,width,bottom-y,'#fcfdf9',null,14);p.hits=[];p.text(m.title,x+14,y+17,17,C.ink,'600');p.button('modal-close','关闭',w-72,y+11,48,31,()=>a.closeModal());
 p.startScroll(bodyTop,bodyBottom,m.scroll||0);let cy=8;const bx=x+14,bw=width-28;
 if(m.kind==='settings'){
  const groups=[['棋盘大小','size',[[9,'9 路'],[13,'13 路'],[19,'19 路']]],['你执哪一方','human',[[1,'执黑 · 先行'],[2,'执白 · 后行']]],['AI 思考程度','difficulty',[[0,'轻松入门'],[1,'认真思考'],[2,'深入挑战']]]];
  for(const [title,field,options] of groups){p.text(title,bx,cy,14,C.ink,'600');cy+=30;const itemw=(bw-(options.length-1)*7)/options.length;options.forEach(([value,label],i)=>p.button('setting-'+field+'-'+value,label,bx+i*(itemw+7),cy,itemw,36,()=>{m[field]=value;a.render();},{selected:m[field]===value}));cy+=60;}
  cy+=p.paragraph('改变棋盘或执子方会开启新对局，已完成课程和累计统计会保留。',bx,cy,bw,{size:12,lineHeight:21});
 }else{
  for(const section of m.sections||[]){if(section.heading){p.text(section.heading,bx,cy,15,section.risk?C.risk:C.green,'600');cy+=28;}cy+=p.paragraph(section.text,bx,cy,bw,{size:13,lineHeight:22,color:section.risk?C.risk:C.muted})+20;}
 }
 m.maxScroll=Math.max(0,cy-(bodyBottom-bodyTop));p.endScroll(h);
 p.button('modal-confirm',m.kind==='settings'?'保存设置':'返回，自己决定',x+14,bottom-46,width-28,35,()=>m.kind==='settings'?a.applySettings():a.closeModal(),{primary:true});
 a.modalViewport={top:bodyTop,bottom:bodyBottom};
}
function previewView(a,p,w){const trial=a.preview;if(!trial)return;const y=a.viewport.top+5,x=12,cw=w-24,title=trial.error?'不能在这里落子':trial.explanation.title,reason=trial.error||trial.explanation.risks[0]||trial.explanation.reasons[0];const h=trial.error?111:145;p.card(x,y,cw,h,'#f5faee','#cbdcbf');p.paragraph(title,x+12,y+11,cw-24,{size:14,lineHeight:20,color:C.green,maxLines:1});if(!trial.error)p.text(`${trial.libs} 口气 · 提 ${trial.captured.length} 子 · 黑 ${a.signed(trial.blackDelta)} / 白 ${a.signed(trial.whiteDelta)}`,x+12,y+37,12,C.green);p.paragraph(reason,x+12,y+(trial.error?36:60),cw-24,{size:12,lineHeight:18,maxLines:3});p.text('按住拖动换点 · 松手不落子',x+12,y+h-22,10,C.muted);}
module.exports={gameView,learnView,lessonView,aboutView,modalView,previewView};
