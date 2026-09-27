import SealApp from '../../seal-app';

export default async function CheckPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const slug=decodeURIComponent(id);
 const workspaceId=slug==='primary'?'primary':slug.startsWith('check-')?slug:`check-${slug}`;
 return <SealApp initialWorkspaceId={workspaceId}/>;
}
