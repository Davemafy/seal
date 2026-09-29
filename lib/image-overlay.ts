import type {Token} from './types';

export type NormalizedBox={x:number;y:number;width:number;height:number};
export type RectLike={left:number;top:number;width:number;height:number};

export function mapNormalizedBoxToFrame(box:NormalizedBox,image:RectLike,frame:Pick<RectLike,'left'|'top'>){
 return {
  left:image.left-frame.left+box.x*image.width,
  top:image.top-frame.top+box.y*image.height,
  width:box.width*image.width,
  height:box.height*image.height
 };
}

export function sameRenderedImageRect(
 a:{preview:string;left:number;top:number;width:number;height:number}|null,
 b:{preview:string;left:number;top:number;width:number;height:number},
 tolerance=.5
){
 return Boolean(
  a
  &&a.preview===b.preview
  &&Math.abs(a.left-b.left)<=tolerance
  &&Math.abs(a.top-b.top)<=tolerance
  &&Math.abs(a.width-b.width)<=tolerance
  &&Math.abs(a.height-b.height)<=tolerance
 );
}


export function ocrLineRegions(tokens:Token[],page=1){
 const source=tokens
  .filter(token=>token.page===page&&token.text.trim()&&token.width>.003&&token.height>.003)
  .filter(token=>typeof token.confidence!=='number'||token.confidence>=35)
  .sort((a,b)=>a.y-b.y||a.x-b.x);
 if(!source.length)return [];

 const rows:Array<{tokens:Token[];center:number;height:number}>=[];
 for(const token of source){
  const center=token.y+token.height/2;
  let best=-1,bestDistance=Infinity;
  for(let index=0;index<rows.length;index++){
   const row=rows[index];
   const distance=Math.abs(row.center-center);
   const tolerance=Math.max(.009,Math.min(.028,Math.max(row.height,token.height)*.62));
   if(distance<=tolerance&&distance<bestDistance){best=index;bestDistance=distance}
  }
  if(best<0){
   rows.push({tokens:[token],center,height:token.height});
  }else{
   const row=rows[best];
   row.tokens.push(token);
   row.height=Math.max(row.height,token.height);
   row.center=row.tokens.reduce((sum,item)=>sum+item.y+item.height/2,0)/row.tokens.length;
  }
 }

 return rows.flatMap(row=>{
  const ordered=[...row.tokens].sort((a,b)=>a.x-b.x);
  const groups:Token[][]=[];
  let current:Token[]=[];
  for(const token of ordered){
   const previous=current[current.length-1];
   const gap=previous?token.x-(previous.x+previous.width):0;
   const split=Boolean(previous)&&gap>Math.max(.045,Math.min(.14,(previous!.height+token.height)*1.7));
   if(split){groups.push(current);current=[]}
   current.push(token);
  }
  if(current.length)groups.push(current);

  return groups.flatMap(group=>{
   const x=Math.max(0,Math.min(...group.map(token=>token.x)));
   const y=Math.max(0,Math.min(...group.map(token=>token.y)));
   const right=Math.min(1,Math.max(...group.map(token=>token.x+token.width)));
   const bottom=Math.min(1,Math.max(...group.map(token=>token.y+token.height)));
   const width=right-x,height=bottom-y;
   const text=group.map(token=>token.text).join(' ').replace(/\s+/g,' ').trim();
   const confidences=group.map(token=>token.confidence).filter((value):value is number=>typeof value==='number').sort((a,b)=>a-b);
   const confidence=confidences.length?confidences[Math.floor((confidences.length-1)*.25)]:100;
   const compact=text.replace(/\s/g,'');
   const letters=(compact.match(/\p{L}|\p{N}/gu)||[]).length;
   if(width<.012||height<.006||letters<2)return [];
   return [{x,y,width,height,text,confidence}];
  });
 }).sort((a,b)=>a.y-b.y||a.x-b.x);
}
