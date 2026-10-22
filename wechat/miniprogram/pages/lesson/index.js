const {Lesson}=require('../../utils/lesson');
const {lessons}=require('../../shared/lessons');
const {influence}=require('../../shared/engine');
const Store=require('../../utils/storage');
Page({
 data:{valid:false},
 onLoad(query){const index=Number(query.id);if(!Number.isInteger(index)||!lessons[index]){this.setData({error:'没有找到这节课程，请返回学习中心。'});return;}this._lesson=new Lesson(index);const l=this._lesson.lesson;wx.setNavigationBarTitle({title:l.title});const answers=l.mode==='score'?['黑 5 · 白 5','黑 10 · 白 10','黑 15 · 白 15']:l.answers||[];this.setData({valid:true,lesson:l,index,total:lessons.length,answers});this.resize();this.refresh();},
 onResize(){this.resize();},
 onHide(){const board=this.selectComponent('#lesson-board');if(board)board.cancelGesture();},
 resize(){const info=wx.getWindowInfo?wx.getWindowInfo():wx.getSystemInfoSync();this.setData({boardSize:Math.floor(info.windowWidth-48)});},
 refresh(){const model=this._lesson;if(!model)return;const l=model.lesson;this.setData({board:model.board,last:model.last,captured:model.captured,selected:['libs','eyes','coordinates'].includes(l.mode)?model.selected:[],dead:model.dead,inf:l.mode==='compare'?influence(model.board,l.n):[],feedback:model.feedback,done:model.done,phase:model.phase,nextEnabled:model.done||Store.stats().completed.includes(model.index)});},
 finishInteraction(completed){if(completed&&!Store.completeLesson(this._lesson.index))wx.showToast({title:'本课已完成，但进度暂未保存，请检查存储空间。',icon:'none'});this.refresh();},
 pick(e){this.finishInteraction(this._lesson.click(e.detail.i));},
 answer(e){this.finishInteraction(this._lesson.answer(Number(e.currentTarget.dataset.index)));},
 pass(){this.finishInteraction(this._lesson.pass());},
 reset(){this._lesson.reset();this.refresh();},
 all(){wx.switchTab({url:'/pages/learn/index'});},
 next(){if(!this.data.nextEnabled)return;if(this._lesson.index===lessons.length-1){wx.switchTab({url:'/pages/game/index'});return;}wx.redirectTo({url:'/pages/lesson/index?id='+(this._lesson.index+1)});},
 onShareAppMessage(){return this._lesson?{title:'一目互动课 · '+this._lesson.lesson.title,path:'/pages/lesson/index?id='+this._lesson.index}:{title:'一目 · 学习中心',path:'/pages/learn/index'};}
});
