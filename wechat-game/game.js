const {YiMuGame}=require('./src/app');
const canvas=wx.createCanvas();
const game=new YiMuGame(wx,canvas,{
 requestFrame:typeof requestAnimationFrame==='function'?(fn)=>requestAnimationFrame(fn):undefined,
 cancelFrame:typeof cancelAnimationFrame==='function'?(id)=>cancelAnimationFrame(id):undefined
});
game.start();
