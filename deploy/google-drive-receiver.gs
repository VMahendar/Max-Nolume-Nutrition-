// Deploy as Google Apps Script Web App: execute as me; access anyone.
// Store MVN_FOLDER_ID and MVN_AUTH_KEY_B64 in Script Properties, NOT in this source.
// Only authenticated encrypted backup blobs are accepted.
function reply_(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
function hex_(bytes){return bytes.map(function(b){return ('0'+(b&255).toString(16)).slice(-2);}).join('');}
function equal_(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;var diff=0;for(var i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
function doPost(e){
 try{
  if(!e||!e.postData||typeof e.postData.contents!=='string'||e.postData.contents.length>9000000)return reply_({ok:false,error:'size'});
  var props=PropertiesService.getScriptProperties(),folderId=props.getProperty('MVN_FOLDER_ID'),secret=props.getProperty('MVN_AUTH_KEY_B64');
  if(!folderId||!secret)return reply_({ok:false,error:'configuration'});
  var b=JSON.parse(e.postData.contents);
  if(b.version!==1||!/^mvn-20\d{2}-\d{2}-\d{2}\.sqlite\.enc$/.test(b.name||'')||
     !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(b.timestamp||'')||
     !/^[0-9a-f]{32}$/.test(b.nonce||'')||!/^[0-9a-f]{64}$/.test(b.signature||'')||
     typeof b.archive!=='string'||b.archive.length>8500000)return reply_({ok:false,error:'input'});
  if(Math.abs(Date.now()-Date.parse(b.timestamp))>600000)return reply_({ok:false,error:'timestamp'});
  var message=[b.timestamp,b.nonce,b.name,hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,b.archive))].join('\n');
  var expected=hex_(Utilities.computeHmacSha256Signature(Utilities.newBlob(message).getBytes(),Utilities.base64Decode(secret)));
  if(!equal_(expected,b.signature))return reply_({ok:false,error:'unauthorized'});
  var folder=DriveApp.getFolderById(folderId),existing=folder.getFilesByName(b.name);
  if(existing.hasNext())return reply_({ok:true,name:b.name,alreadyExists:true});
  folder.createFile(Utilities.newBlob(Utilities.base64Decode(b.archive),'application/octet-stream',b.name));
  var files=folder.getFiles(),cutoff=Date.now()-30*86400000;
  while(files.hasNext()){
   var f=files.next();
   if(/^mvn-20\d{2}-\d{2}-\d{2}\.sqlite\.enc$/.test(f.getName())&&f.getDateCreated().getTime()<cutoff)f.setTrashed(true);
  }
  return reply_({ok:true,name:b.name});
 }catch(err){return reply_({ok:false,error:'upload_failed'});}
}
function doGet(){return reply_({ok:false,error:'POST_only'});}
