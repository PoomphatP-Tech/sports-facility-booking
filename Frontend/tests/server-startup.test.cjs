const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

function load(file, globals = {}, mocks = {}, replacements = {}) {
  let source = fs.readFileSync(path.join(__dirname, '../app', file), 'utf8');
  for (const [from,to] of Object.entries(replacements)) source = source.replaceAll(from,to);
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const module = {exports:{}};
  vm.runInNewContext('(function(require,module,exports){' + outputText + '\n})',{URL,AbortController,...globals})(
    id => { if (!(id in mocks)) throw new Error('Unexpected import: '+id); return mocks[id]; }, module,module.exports,
  );
  return module.exports;
}
const {resolveApiUrl} = load('config/api-url.ts');
const flush = () => new Promise(setImmediate);
const response = (data = {serverready:true}, ok = true) => ({ok,json:async()=>data});

function readinessFixture(fetcher = async()=>response(), storageBlocked = false) {
  let now = 1_000_000, nextId = 0, ready = 0, unavailable = 0;
  const timers = new Map(), cache = new Map(), requests = [];
  const window = {};
  Object.defineProperty(window,'localStorage',{get(){
    if(storageBlocked) throw new Error('Storage blocked');
    return {getItem:key=>cache.get(key)??null,setItem:(key,value)=>cache.set(key,value)};
  }});
  const {checkServerReadiness} = load('services/server-readiness.service.ts',{
    window,Date:{now:()=>now},
    fetch:(...args)=>{requests.push(args);return fetcher(...args);},
    setTimeout:(callback,delay)=>{const id=++nextId;timers.set(id,{callback,at:now+delay});return id;},
    clearTimeout:id=>timers.delete(id),
  });
  return {
    requests,cache,timers,get ready(){return ready;},get unavailable(){return unavailable;},
    start:(apiUrl='https://backend.example.test/api')=>checkServerReadiness({apiUrl,onReady:()=>ready++,onUnavailable:()=>unavailable++}),
    async next(){const [id,timer]=[...timers.entries()].sort((a,b)=>a[1].at-b[1].at)[0]??[];assert.ok(timer,'Expected a scheduled retry/timeout');timers.delete(id);now=timer.at;timer.callback();await flush();},
  };
}

test('production rejects missing, blank, local and invalid API configuration',()=>{
  for(const url of [undefined,'','  ','http://localhost:5000/api','https://localhost/api','https://test.localhost/api','https://127.0.0.1/api','https://[::1]/api','http://backend.example.test/api','/api','ftp://backend.example.test/api']) {
    assert.throws(()=>resolveApiUrl(url,true),/VITE_API_URL/);
  }
  assert.equal(resolveApiUrl(' https://backend.example.test/api/// ',true),'https://backend.example.test/api');
  assert.equal(resolveApiUrl('https://127.example.test/api',true),'https://127.example.test/api');
  assert.equal(resolveApiUrl('http://localhost:5000/api',false),'http://localhost:5000/api');
});

test('runtime configuration uses localhost only for development when no API URL is set',()=>{
  const config=(env)=>load('config/api.ts',{}, {'./api-url':{resolveApiUrl}}, {'import.meta.env':JSON.stringify(env)});
  assert.equal(config({DEV:true,PROD:false}).API_URL,'http://localhost:5000/api');
  assert.throws(()=>config({DEV:false,PROD:true}),/VITE_API_URL/);
  assert.equal(config({DEV:false,PROD:true,VITE_API_URL:'https://backend.example.test/api/'}).API_URL,'https://backend.example.test/api');
});

test('a ready backend opens the app and caches readiness for that API URL',async()=>{
  const f=readinessFixture();f.start();await flush();
  assert.equal(f.ready,1);assert.equal(f.unavailable,0);assert.equal(f.timers.size,0);
  assert.equal(f.requests[0][0],'https://backend.example.test/api/ping');
  assert.equal(f.requests[0][1].cache,'no-store');
  assert.ok(f.cache.has('serverready:https://backend.example.test/api'));
});

test('transient failures are retried until a valid serverready response arrives',async()=>{
  let attempt=0;
  const f=readinessFixture(async()=>{
    attempt++;
    if(attempt===1) throw new Error('Cold start connection reset');
    if(attempt===2) return response(null,false);
    if(attempt===3) return {ok:true,json:async()=>{throw new Error('HTML instead of JSON');}};
    if(attempt===4) return response({serverready:false});
    return response();
  });
  f.start();await flush();
  for(let i=0;i<4;i++) await f.next();
  assert.equal(f.requests.length,5);assert.equal(f.ready,1);assert.equal(f.unavailable,0);
});

test('persistent failure stops after eight attempts and a retry can start a fresh check',async()=>{
  let available=false;
  const f=readinessFixture(async()=>response({serverready:available}));
  const stop=f.start();await flush();
  for(let i=0;i<7;i++) await f.next();
  assert.equal(f.requests.length,8);assert.equal(f.ready,0);assert.equal(f.unavailable,1);assert.equal(f.timers.size,0);
  stop();available=true;f.start();await flush();assert.equal(f.ready,1);
});

test('a request that never responds is aborted and retried instead of waiting forever',async()=>{
  const f=readinessFixture((_,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('Timeout')))));
  const stop=f.start();await f.next();
  assert.equal(f.requests[0][1].signal.aborted,true);
  await f.next();assert.equal(f.requests.length,2);
  stop();await flush();assert.equal(f.timers.size,0);assert.equal(f.unavailable,0);
});

test('restricted browser storage does not block an otherwise ready server',async()=>{
  const f=readinessFixture(async()=>response(),true);f.start();await flush();assert.equal(f.ready,1);
});

test('readiness from a different backend or expired cache cannot bypass the ping',async()=>{
  const f=readinessFixture();
  f.cache.set('serverready','true');f.cache.set('serverreadyExpiresAt','9999999999999');
  f.cache.set('serverready:https://old-backend.example.test/api','9999999999999');
  f.cache.set('serverready:https://backend.example.test/api','1');
  f.start();await flush();assert.equal(f.requests.length,1);
  f.start();assert.equal(f.requests.length,1);assert.equal(f.ready,2);
});

test('unmounting cancels scheduled retries and ignores late successful responses',async()=>{
  const failed=readinessFixture(async()=>response(null,false));const stopRetry=failed.start();await flush();stopRetry();assert.equal(failed.timers.size,0);
  let resolve;
  const late=readinessFixture(()=>new Promise(done=>{resolve=done;}));const stop=late.start();stop();resolve(response());await flush();
  assert.equal(late.ready,0);assert.equal(late.unavailable,0);assert.equal(late.cache.size,0);
});

test('unavailable startup screen exposes a working retry button',()=>{
  const jsx=(type,props)=>({type,props});
  const {default:ColdStart}=load('routes/cold-start.tsx',{}, {'react/jsx-runtime':{jsx,jsxs:jsx},'~/constants/app.constants':{APP_BRAND_NAME:'Demo'}});
  const all=node=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(all):[node,...all(node.props?.children)];
  let retried=false;
  const error=all(ColdStart({unavailable:true,onRetry:()=>{retried=true;}}));
  assert.ok(error.some(n=>n.props?.role==='alert'));
  error.find(n=>n.type==='button').props.onClick();assert.equal(retried,true);
  assert.equal(error.some(n=>n.props?.className?.includes('spinner-border')),false);
});
