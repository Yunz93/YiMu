const coord=(i,n)=>'ABCDEFGHJKLMNOPQRST'[i%n]+(n-Math.floor(i/n));
const signed=value=>(value>=0?'+':'')+value;
const category=i=>i<6?'基础规则':[10,12,13].includes(i)?'计分与终局':i>=14?'棋盘与布局':'战术与死活';
module.exports={coord,signed,category};
