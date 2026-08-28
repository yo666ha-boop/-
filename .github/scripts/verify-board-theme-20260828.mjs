import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('shogi-v21528/board-theme21537.js','utf8');
const canonical=fs.readFileSync('shogi-v21528/coi-serviceworker.js','utf8');
const root=fs.readFileSync('coi-serviceworker.js','utf8');

for(const token of [
  "bright:{label:'明るい木目'}",
  "classic:{label:'従来'}",
  "contrast:{label:'くっきり'}",
  'data-board-theme="bright"',
  'data-board-theme="contrast"',
  "const KEY='ai-shogi-board-theme'",
  "version:'21537a'"
]){
  if(!source.includes(token))throw new Error('missing theme contract: '+token);
}
if(!canonical.includes("./board-theme21537.js?v=21537a"))throw new Error('canonical COI does not load board theme');
if(!canonical.includes("ai-shogi-coi-reload-21537a"))throw new Error('canonical COI cache/reload key not bumped');
if(!root.includes("/shogi-v21528/coi-serviceworker.js?v=21537a"))throw new Error('Vercel root shim not bumped');

const store=new Map();
const elements=new Map();
const controls={children:[],appendChild(el){this.children.push(el);elements.set(el.id,el)}};
const head={appendChild(el){elements.set(el.id||('head-'+elements.size),el)}};
function element(tag){
  return {
    tagName:String(tag).toUpperCase(),id:'',className:'',type:'',textContent:'',attributes:{},listeners:{},
    setAttribute(k,v){this.attributes[k]=String(v)},
    addEventListener(k,fn){this.listeners[k]=fn},
    click(){this.listeners.click?.()}
  };
}
const document={
  readyState:'complete',documentElement:{dataset:{}},head,
  getElementById:id=>elements.get(id)||null,
  querySelector:q=>q==='.controls'?controls:null,
  createElement:element,
  addEventListener(){}
};
const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))};
class MutationObserver{constructor(fn){this.fn=fn}observe(){}}
const context={window:null,document,localStorage,MutationObserver,console};
context.window=context;
vm.runInNewContext(source,context,{filename:'board-theme21537.js'});

const api=context.AI_SHOGI_BOARD_THEME;
if(!api)throw new Error('theme API missing');
if(api.get()!=='bright')throw new Error('default theme is not bright');
const btn=elements.get('boardThemeBtn');
if(!btn)throw new Error('theme button missing');
if(!btn.textContent.includes('明るい木目'))throw new Error('bright label missing');
btn.click();
if(api.get()!=='classic'||store.get('ai-shogi-board-theme')!=='classic')throw new Error('classic switch/persist failed');
btn.click();
if(api.get()!=='contrast')throw new Error('contrast switch failed');
api.set('bright');
if(api.get()!=='bright')throw new Error('API set bright failed');

console.log('PASS_BROWSER_BOARD_THEME_21537A');
console.log(JSON.stringify({themes:api.themes,defaultTheme:'bright',button:btn.textContent,persisted:store.get('ai-shogi-board-theme')}));
