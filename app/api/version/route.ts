import {NextResponse} from 'next/server';

export const dynamic='force-dynamic';

export function GET(){
 return NextResponse.json(
  {sha:process.env.VERCEL_GIT_COMMIT_SHA||process.env.GITHUB_SHA||'unknown'},
  {headers:{'Cache-Control':'no-store, max-age=0'}}
 );
}
