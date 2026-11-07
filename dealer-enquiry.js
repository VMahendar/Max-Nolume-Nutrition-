const form=document.getElementById('dealerForm');
let leadKey=crypto.randomUUID();
form.addEventListener('input',()=>{leadKey=crypto.randomUUID()});
form.addEventListener('submit',async function(e){
 e.preventDefault();if(!this.reportValidity())return;
 const v=Object.fromEntries(new FormData(this).entries()),button=this.querySelector('[type="submit"]');
 const status=document.getElementById('dealerLeadStatus');
 let message="Hello Max Volume Nutrition, I would like to request wholesale dealer terms.\n\nBusiness: "+v.business+"\nContact: "+v.contact+"\nMobile: "+v.phone+"\nRegion: "+v.region+"\nCity / area: "+v.city+"\nBusiness type: "+v.kind+"\nGSTIN: "+(v.gst||"Not provided")+"\nRequirements: "+v.requirement+"\n\nPlease review my enquiry and share dealer terms, stock and delivery/serviceability. No online payment was made.";
 button.disabled=true;status.textContent='Recording your enquiry...';
 try{
  const response=await fetch('/api/enquiries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestKey:leadKey,kind:'wholesale',business:v.business,name:v.contact,phone:v.phone,region:v.region,city:v.city,businessType:v.kind,gstin:v.gst,requirements:v.requirement,acknowledgeStorage:document.getElementById('dealerLeadConsent').checked}),signal:AbortSignal.timeout(10000)});
  const data=await response.json();if(!response.ok||!data.recorded)throw Error(data.error||'Not recorded');
  message+='\n\nEnquiry reference: '+data.id;
  status.textContent='Your enquiry was recorded as '+data.id+'. Please send the prepared WhatsApp message.';
 }catch(error){
  status.textContent='Your enquiry was NOT saved in the website. Please press Send in WhatsApp to reach our team.';
 }
 button.disabled=false;window.location.assign('https://wa.me/917708830513?text='+encodeURIComponent(message));
});
