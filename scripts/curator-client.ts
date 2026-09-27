type CuratorPayload={
 sourceId:string;
 sourceUrl:string;
 title:string;
 text:string;
};

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

 const response=await fetch(endpoint,{
  method:'POST',
  signal:AbortSignal.timeout(25000),
  headers:{
   Authorization:`Bearer ${oidc.value}`,
   'Content-Type':'application/json'
  },
  body:JSON.stringify(payload)
 });
 if(!response.ok)throw new Error(`SEAL curator ${response.status}`);
 return response.json() as Promise<unknown>;
}
