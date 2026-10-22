// All geometry uses the same 560-unit grid as the website and native Mini Program.
function drawBoard(p,x,y,size,{n,board,last=-1,previewAt=-1,hintAt=-1,captured=[],liberties=[],groupStones=[],inf=[],owners=[],selected=[],dead=[]}){
 const c=p.ctx,step=476/(n-1),r=step*.435,at=i=>[42+i%n*step,42+Math.floor(i/n)*step];
 c.save();c.translate(x,y);c.scale(size/560,size/560);p.card(0,0,560,560,'#e8c894','#d5b47c',8);
 for(let i=0;i<n*n;i++)if(!board[i]){const [a,b]=at(i),v=inf[i];if(Math.abs(v)>.06){c.fillStyle=v>0?`rgba(66,107,69,${Math.abs(v)*.48})`:`rgba(255,253,240,${Math.abs(v)*.6})`;c.fillRect(a-step*.48,b-step*.48,step*.96,step*.96);}}
 c.strokeStyle='#997b47';c.lineWidth=.9;for(let k=0;k<n;k++){const q=42+k*step;c.beginPath();c.moveTo(42,q);c.lineTo(518,q);c.moveTo(q,42);c.lineTo(q,518);c.stroke();p.text('ABCDEFGHJKLMNOPQRST'[k],q,16,11,'#897047','normal','center');p.text(n-k,22,q-6,11,'#897047','normal','center');p.text('ABCDEFGHJKLMNOPQRST'[k],q,534,11,'#897047','normal','center');}
 const stars=n===19?[3,9,15]:n===13?[3,6,9]:n===9?[2,4,6]:n===5?[2]:[];for(const a of stars)for(const b of stars){if(n!==19&&stars.length===3&&((a===stars[1])!==(b===stars[1])))continue;p.circle(42+a*step,42+b*step,2.5,'#8d7248');}
 for(let i=0;i<n*n;i++)if(!board[i]&&owners[i]){const [a,b]=at(i);c.fillStyle=owners[i]===1?'#40543b':'#fffdf4';c.fillRect(a-4,b-4,8,8);}
 for(const i of liberties){const [a,b]=at(i);p.circle(a,b,step*.12,'#dce9c5','#729152',1.5);}
 for(let i=0;i<board.length;i++)if(board[i]){const [a,b]=at(i);c.globalAlpha=dead.includes(i)?0.35:i===previewAt?0.65:1;if(groupStones.includes(i))p.circle(a,b,r+4,null,'#7d9b5a',2);const g=c.createRadialGradient(a-r*.25,b-r*.3,r*.05,a,b,r);g.addColorStop(0,board[i]===1?'#61685a':'#ffffff');g.addColorStop(1,board[i]===1?'#172117':'#d9dfcf');p.circle(a,b,r,g,board[i]===2?'#cbd0c1':null,.8);c.globalAlpha=1;if(i===last)p.circle(a,b,r*.2,null,board[i]===1?'#dfe8cf':'#72885e',1.8);if(dead.includes(i)){c.strokeStyle='#a36e4e';c.lineWidth=2;c.beginPath();c.moveTo(a-5,b-5);c.lineTo(a+5,b+5);c.moveTo(a-5,b+5);c.lineTo(a+5,b-5);c.stroke();}}
 for(const i of captured){const [a,b]=at(i);c.setLineDash([3,3]);p.circle(a,b,r*.8,'#f2dfc5','#a57751',1.5);c.setLineDash([]);}
 for(const i of selected){const [a,b]=at(i);p.circle(a,b,Math.min(11,step*.26),'#c8d99e','#718d4e',2);}
 if(previewAt>=0){const [a,b]=at(previewAt);c.setLineDash([3,3]);p.circle(a,b,r+3,null,'#608a4c',2);c.setLineDash([]);}
 if(hintAt>=0&&!board[hintAt]){const [a,b]=at(hintAt);c.setLineDash([4,4]);p.circle(a,b,r*.8,null,'#608a4c',2);c.setLineDash([]);p.circle(a,b,3,'#608a4c');}
 c.restore();
}
module.exports={drawBoard};
