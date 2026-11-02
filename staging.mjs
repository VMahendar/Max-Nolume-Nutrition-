import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import {passwordMatches} from './commerce.mjs';

export function stagingGate(env=process.env){
  if(env.STAGING_MODE!=='true')return async()=>true;
  const publicBrowsing=env.STAGING_PUBLIC_BROWSING==='true';
  const username=env.STAGING_USERNAME,stored=env.STAGING_PASSWORD_HASH;
  if(!publicBrowsing&&(!username||!/^[a-zA-Z0-9._-]{1,64}$/.test(username)||!/^([a-f0-9]{32}):([a-f0-9]{128})$/.test(stored||'')))throw Error('Staging requires a username and a valid password hash.');
  const directory=env.DATA_DIR;
  let marker;try{marker=JSON.parse(readFileSync(resolve(directory||'', 'staging-only.json'),'utf8'));}catch{}
  if(!directory||marker?.purpose!=='mvn-staging-test-data'||marker.version!==1)throw Error('Staging requires an isolated, initialized test-data directory.');
  const salt=randomBytes(32),failures=new Map();let accepted=null,busy=0;
  const digest=s=>createHash('sha256').update(salt).update(s).digest('hex');
  return async(req,res)=>{
    res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
    res.setHeader('Cache-Control','no-store');
    // Customer/admin authorization remains enforced by the application's own routes.
    if(publicBrowsing)return true;
    if(req.url==='/healthz'&&['GET','HEAD'].includes(req.method))return true;
    const header=req.headers.authorization||'';
    const reject=(status=401)=>{res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8',...(status===401?{'WWW-Authenticate':'Basic realm="Max Volume Nutrition staging", charset="UTF-8"'}:{'Retry-After':'60'})});res.end(status===401?'Staging access requires a password.':'Too many attempts. Try again in a minute.');return false;};
    if(typeof header!=='string'||header.length>1024||!/^Basic [A-Za-z0-9+/]+=*$/.test(header))return reject();
    const candidate=digest(header);if(candidate===accepted)return true;
    const key=req.socket.remoteAddress||'unknown',now=Date.now();
    if(failures.size>1000)for(const [ip,v] of failures)if(v.until<now)failures.delete(ip);
    let limit=failures.get(key);if(!limit||limit.until<now){limit={count:0,until:now+60000};failures.set(key,limit);}if(++limit.count>20||busy>=4)return reject(429);
    const decoded=Buffer.from(header.slice(6),'base64').toString('utf8'),colon=decoded.indexOf(':');
    if(colon<0||decoded.slice(0,colon)!==username)return reject();
    busy++;let valid=false;try{valid=await passwordMatches(decoded.slice(colon+1),stored);}finally{busy--;}
    if(!valid)return reject();accepted=candidate;failures.delete(key);return true;
  };
}
