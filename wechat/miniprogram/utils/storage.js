const KEYS={game:'yimu-game',stats:'yimu-stats',preview:'yimu-preview-enabled'};
function read(key,fallback){try{const value=wx.getStorageSync(key);if(value===''||value===undefined||value===null)return fallback;return typeof value==='string'?JSON.parse(value):value;}catch{return fallback;}}
function write(key,value){try{wx.setStorageSync(key,value);return true;}catch{return false;}}
function stats(){const raw=read(KEYS.stats,{}),v=raw&&typeof raw==='object'?raw:{};return {moves:Number.isFinite(v.moves)&&v.moves>=0?v.moves:0,games:Number.isFinite(v.games)&&v.games>=0?v.games:0,completed:Array.isArray(v.completed)?[...new Set(v.completed.filter(i=>Number.isInteger(i)&&i>=0&&i<16))]:[]};}
function saveGame(session){const latest=stats();session.stats.completed=latest.completed;return write(KEYS.game,session.state)&&write(KEYS.stats,session.stats);}
function completeLesson(i){const value=stats();if(!value.completed.includes(i))value.completed.push(i);return write(KEYS.stats,value);}
function clear(){try{Object.values(KEYS).forEach(key=>wx.removeStorageSync(key));return true;}catch{return false;}}
module.exports={KEYS,read,write,stats,saveGame,completeLesson,clear};
