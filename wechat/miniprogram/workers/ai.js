const {chooseMove}=require('./search');
worker.onMessage(message=>{
 const {id,board,color,n,history,difficulty}=message;
 try{worker.postMessage({id,...chooseMove(board,color,n,history,difficulty)});}
 catch(error){worker.postMessage({id,error:String(error)});}
});
