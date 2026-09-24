import {NextResponse} from 'next/server';import {z} from 'zod';import {claimSchema} from '@/lib/types';import {verifyClaims} from '@/lib/resolver';
const request=z.object({claims:z.array(claimSchema).max(60),court_name:z.string().max(300),mode:z.enum(['LIVE','SNAPSHOT'])});
export async function POST(req:Request){try{const data=request.parse(await req.json());return NextResponse.json(await verifyClaims(data.claims,data.court_name,data.mode));}catch{return NextResponse.json({error:'Could not verify this request.'},{status:400});}}
