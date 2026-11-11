// Prepare committed Base64-encoded media as ordinary local WebP files.
// Encoding source images as text lets the GitHub contents-only integration
// transport their exact bytes; generated files remain same-origin site assets.
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
const media=[
 ['data/image-assets/sturdy-watermelon-front.webp.b64','public/assets/sturdy-watermelon-front.webp'],
 ['data/image-assets/sturdy-watermelon-back.webp.b64','public/assets/sturdy-watermelon-back.webp']
];
for(const [source,target] of media){
 const from=resolve(source),to=resolve(target);
 if(!existsSync(from))continue;
 const encoded=readFileSync(from,'utf8').trim();
 const image=Buffer.from(encoded,'base64');
 if(image.toString('ascii',0,4)!=='RIFF'||image.toString('ascii',8,12)!=='WEBP')throw Error('Invalid source product image: '+source);
 if(existsSync(to)&&readFileSync(to).equals(image))continue;
 mkdirSync(dirname(to),{recursive:true});
 writeFileSync(to,image);
}
