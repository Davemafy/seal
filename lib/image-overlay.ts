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
