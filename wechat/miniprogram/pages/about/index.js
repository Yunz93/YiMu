const config=require('../../config');
const Store=require('../../utils/storage');
Page({data:{config},copyWebsite(){wx.setClipboardData({data:config.website});},copyRepository(){wx.setClipboardData({data:config.repository});},clearData(){wx.showModal({title:'清除本机进度？',content:'将删除本机的小程序棋局、课程进度、累计统计、预览和音效设置，无法恢复。网页版数据不受影响。',confirmText:'确认清除',confirmColor:'#a16f4e',success:r=>{if(r.confirm)wx.showToast({title:Store.clear()?'本机进度已清除':'清除失败，请重试',icon:'none'});}});}});
