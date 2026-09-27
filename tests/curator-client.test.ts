import {afterEach,describe,expect,it,vi} from 'vitest';
import {curateViaSeal} from '../scripts/curator-client';

const payload={
 sourceId:'maryland-judiciary-news',
 sourceUrl:'https://www.mdcourts.gov/media/news/2026/pr20260806',
 title:'Scam alert',
 text:'The Maryland Judiciary says this is a scam warning. '.repeat(3)
};

describe('Browse curator client',()=>{
 afterEach(()=>{
  vi.unstubAllGlobals();
  delete process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  delete process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  delete process.env.SEAL_CURATOR_URL;
 });

 it('retries a transient curator failure without bypassing the model gate',async()=>{
  process.env.ACTIONS_ID_TOKEN_REQUEST_URL='https://actions.example.test/oidc';
  process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN='request-token';
  process.env.SEAL_CURATOR_URL='https://seal.imafidondavid1.workers.dev/api/browse-curate';

  const fetchMock=vi.fn()
   .mockResolvedValueOnce(new Response(JSON.stringify({value:'signed-oidc'}),{status:200,headers:{'content-type':'application/json'}}))
   .mockResolvedValueOnce(new Response(JSON.stringify({error:'Curator provider unavailable'}),{status:502}))
   .mockResolvedValueOnce(new Response(JSON.stringify({publish:true}),{status:200,headers:{'content-type':'application/json'}}));
  vi.stubGlobal('fetch',fetchMock);

  await expect(curateViaSeal(payload)).resolves.toEqual({publish:true});
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(String(fetchMock.mock.calls[0]?.[0])).toContain('audience=seal-browse-feed');
  expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({method:'POST'});
  expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({method:'POST'});
 });

 it('fails closed on a non-transient curator response',async()=>{
  process.env.ACTIONS_ID_TOKEN_REQUEST_URL='https://actions.example.test/oidc';
  process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN='request-token';
  process.env.SEAL_CURATOR_URL='https://seal.imafidondavid1.workers.dev/api/browse-curate';

  const fetchMock=vi.fn()
   .mockResolvedValueOnce(new Response(JSON.stringify({value:'signed-oidc'}),{status:200,headers:{'content-type':'application/json'}}))
   .mockResolvedValueOnce(new Response(JSON.stringify({error:'Unauthorized'}),{status:401}));
  vi.stubGlobal('fetch',fetchMock);

  await expect(curateViaSeal(payload)).rejects.toThrow('SEAL curator 401');
  expect(fetchMock).toHaveBeenCalledTimes(2);
 });
});
