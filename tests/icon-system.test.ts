import {describe,it,expect} from 'vitest';
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {join,extname} from 'node:path';

const ROOT=process.cwd();
const TEXT_EXTENSIONS=new Set(['.ts','.tsx','.js','.jsx','.css','.md','.json','.yml','.yaml']);
const SKIP=new Set(['node_modules','.git','.next','test-results','playwright-report']);
const forbiddenGlyphs=[0x2192,0x2190,0x2197,0x2198,0x2199,0x2196,0x21e2,0x279c,0x279d,0x279e,0x2794,0x27a4,0x00bb,0x203a,0x276f].map(code=>String.fromCodePoint(code));
const deprecatedNames=['Design'+'Chevron','design'+'-chevron'];

function textFiles(dir:string):string[]{
 return readdirSync(dir).flatMap(name=>{
  if(SKIP.has(name))return [];
  const path=join(dir,name);
  const stat=statSync(path);
  if(stat.isDirectory())return textFiles(path);
  return TEXT_EXTENSIONS.has(extname(name).toLowerCase())?[path]:[];
 });
}

describe('SEAL directional icon system',()=>{
 it('contains no decorative arrow glyphs or deprecated generic chevrons',()=>{
  const violations:string[]=[];
  for(const path of textFiles(ROOT)){
   const source=readFileSync(path,'utf8');
   const glyph=forbiddenGlyphs.find(mark=>source.includes(mark));
   const deprecated=deprecatedNames.find(name=>source.includes(name));
   if(glyph||deprecated)violations.push(path.replace(ROOT+'/',''));
  }
  expect(violations).toEqual([]);
 });
});
