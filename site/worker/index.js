import {handleApi} from './api.js';
import assets from './assets.generated.js';
export default {async fetch(request,env,ctx){const url=new URL(request.url);let response;if(url.pathname.startsWith('/api/'))response=await handleApi(request,env);else{
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 const key=url.pathname==='/'?'/index.html':url.pathname,asset=assets[key];
 if(!asset)return new Response('Not found',{status:404});
 response=new Response(request.method==='HEAD'?null:asset.body,{headers:{'Content-Type':asset.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}});
 }
 const headers=new Headers(response.headers);headers.set('Referrer-Policy','strict-origin-when-cross-origin');headers.set('X-Content-Type-Options','nosniff');
 return new Response(response.body,{status:response.status,headers});
}};
