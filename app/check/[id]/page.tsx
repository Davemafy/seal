import SealApp from '../../seal-app';

export default async function CheckPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 return <SealApp initialWorkspaceId={decodeURIComponent(id)}/>;
}
