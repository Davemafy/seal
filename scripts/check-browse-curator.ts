import {curateViaSeal} from './curator-client';

const payload={
 sourceId:'maryland-judiciary-news',
 sourceUrl:'https://www.mdcourts.gov/media/news/2026/pr20260806',
 title:'SCAM ALERT: Maryland Judiciary warns of text scams about traffic violations',
 text:'SCAM ALERT: Maryland Judiciary warns of text scams about traffic violations. The Maryland Judiciary warns that these text messages are a scam and recipients should not use the payment route in the message.'
};

let last='';
for(let attempt=1;attempt<=12;attempt++){
 try{
  const result=await curateViaSeal(payload);
  if(!result)throw new Error('OIDC curator bridge is not configured');
  if(typeof result!=='object'||result===null||!('publish' in result))throw new Error('Curator returned an invalid response');
  console.log('CURATOR_BRIDGE_OK');
  process.exit(0);
 }catch(error){
  last=error instanceof Error?error.message:String(error);
  console.log(`CURATOR_BRIDGE_WAIT ${attempt}/12: ${last}`);
  if(attempt<12)await new Promise(resolve=>setTimeout(resolve,10000));
 }
}
throw new Error(`Curator bridge did not become ready: ${last}`);
