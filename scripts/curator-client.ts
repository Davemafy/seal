type CuratorPayload={
 sourceId:string;
 sourceUrl:string;
 title:string;
 text:string;
};

const transientStatuses=new Set([429,502,503,504]);

function retryDelay(response:Response,attempt:number){
 const retryAfter=Number(response.headers.get('retry-after')||'');
 if(Number.isFinite(retryAfter)&&retryAfter>0)return Math.min(retryAfter*1000,2000);
 return attempt===0?250:750;
}

export async function curateViaSeal(payload:CuratorPayload){
 const requestUrl=process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
 const requestToken=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
 const configured=process.env.SEAL_CURATOR_URL;
 if(!requestUrl||!requestToken||!configured)return null;

 const endpoint=new URL(configured);
 if(endpoint.origin!=='https://seal.imafidondavid1.workers.dev'||endpoint.pathname!=='/api/browse-curate'){
  throw new Error('Curator endpoint is not the SEAL production endpoint');
 }

 const oidcUrl=new URL(requestUrl);
 oidcUrl.searchParams.set('audience','seal-browse-feed');
 const oidcResponse=await fetch(oidcUrl,{
  signal:AbortSignal.timeout(10000),
  headers:{Authorization:`Bearer ${requestToken}`}
 });
 if(!oidcResponse.ok)throw new Error(`GitHub OIDC ${oidcResponse.status}`);
 const oidc=await oidcResponse.json() as {value?:string};
 if(!oidc.value)throw new Error('GitHub OIDC token missing');

 for(let attempt=0;attempt<3;attempt++){
  const response=await fetch(endpoint,{
   method:'POST',
   signal:AbortSignal.timeout(25000),
   headers:{
    Authorization:`Bearer ${oidc.value}`,
    'Content-Type':'application/json'
   },
   body:JSON.stringify(payload)
  });
  if(response.ok)return response.json() as Promise<unknown>;
  if(!transientStatuses.has(response.status)||attempt===2)throw new Error(`SEAL curator ${response.status}`);
  await new Promise(resolve=>setTimeout(resolve,retryDelay(response,attempt)));
 }

 throw new Error('SEAL curator unavailable');
}
