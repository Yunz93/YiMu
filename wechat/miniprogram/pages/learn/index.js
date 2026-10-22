const {lessons}=require('../../shared/lessons');
const Store=require('../../utils/storage');
const {category}=require('../../utils/format');
Page({
 data:{categories:['全部课程','基础规则','战术与死活','计分与终局','棋盘与布局'],category:'全部课程',statusLabels:['全部进度','待学习','已完成'],statusIndex:0,courses:[]},
 onShow(){this.refresh();},
 refresh(){const stats=Store.stats(),first=lessons.findIndex((l,i)=>!stats.completed.includes(i));this._resume=first<0?0:first;const courses=lessons.map((l,i)=>({id:i,number:String(i+1).padStart(2,'0'),title:l.title,desc:l.desc,tag:l.tag,category:category(i),done:stats.completed.includes(i)})).filter(l=>(this.data.category==='全部课程'||l.category===this.data.category)&&(this.data.statusIndex===0||l.done===(this.data.statusIndex===2)));
  this.setData({stats,total:lessons.length,percent:Math.round(stats.completed.length/lessons.length*100),resumeTitle:lessons[this._resume].title,resumeLabel:first<0?'重新复习':stats.completed.length?'继续学习':'开始学习',courses});
 },
 filterCategory(e){this.setData({category:e.currentTarget.dataset.category});this.refresh();},
 filterStatus(e){this.setData({statusIndex:Number(e.detail.value)});this.refresh();},
 resetFilters(){this.setData({category:'全部课程',statusIndex:0});this.refresh();},
 open(e){wx.navigateTo({url:'/pages/lesson/index?id='+e.currentTarget.dataset.id});},
 resume(){wx.navigateTo({url:'/pages/lesson/index?id='+this._resume});},
 onShareAppMessage(){return {title:'一目学习中心 · 16节互动课，慢慢学会围棋',path:'/pages/learn/index'};}
});
