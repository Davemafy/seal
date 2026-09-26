import SealApp from './seal-app';
import {getBrowseCase} from '@/lib/browse-cases';

export default async function Home({searchParams}:{searchParams:Promise<{case?:string}>}){
 const params=await searchParams;
 const selected=getBrowseCase(params.case);
 return <SealApp initialText={selected?.runText||''}/>;
}
