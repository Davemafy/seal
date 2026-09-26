"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import * as THREE from "three";
import "./film.css";

const TOTAL = 15;

function makeNoticeTexture(renderer: THREE.WebGLRenderer) {
  const c=document.createElement("canvas"); c.width=1536;c.height=2048;
  const x=c.getContext("2d")!; x.fillStyle="#eeeae0";x.fillRect(0,0,c.width,c.height);
  x.fillStyle="#111";x.font="700 44px Arial";x.fillText("SUPERIOR COURT",120,150);
  x.font="900 94px Arial";x.fillText("NOTICE TO APPEAR",120,310);
  x.fillRect(120,365,1290,5);x.font="36px Georgia";
  ["You are required to appear in court on","MARCH 14, 2024 at 9:00 AM.","Failure to appear may result in further action.","Case 24-1842  ·  Division 04"].forEach((s,i)=>x.fillText(s,120,560+i*125));
  x.fillStyle="#d8ff36";x.fillRect(112,640,750,85);x.fillStyle="#111";x.font="700 40px Arial";x.fillText("MARCH 14, 2024 at 9:00 AM.",130,698);
  for(let i=0;i<20;i++){x.globalAlpha=.15;x.fillRect(120,1120+i*32,1180-(i%4)*110,4)} x.globalAlpha=1;
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();return tex;
}

function FilmWorld(){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{const canvas=ref.current;if(!canvas)return;
  const r=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});r.setPixelRatio(Math.min(devicePixelRatio,2));r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.05;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x070707);scene.fog=new THREE.FogExp2(0x070707,.042);
  const cam=new THREE.PerspectiveCamera(36,1,.1,100);cam.position.set(0,0,8.5);
  const tex=makeNoticeTexture(r);const geo=new THREE.PlaneGeometry(4.5,6,70,90);
  const mat=new THREE.MeshStandardMaterial({map:tex,roughness:.88,metalness:0,side:THREE.DoubleSide});const paper=new THREE.Mesh(geo,mat);scene.add(paper);
  const pos=geo.attributes.position as THREE.BufferAttribute;const base=new Float32Array(pos.array as ArrayLike<number>);
  const source=new THREE.Mesh(new THREE.PlaneGeometry(4.5,6,32,32),new THREE.MeshStandardMaterial({map:tex,roughness:.82,side:THREE.DoubleSide}));source.position.set(0,0,-6);source.visible=false;scene.add(source);
  const fragments=new THREE.Group();scene.add(fragments);const fragMat=new THREE.MeshStandardMaterial({color:0xeeeae0,roughness:.8});
  for(let i=0;i<46;i++){const w=.25+Math.random()*.8,h=.08+Math.random()*.25,m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),fragMat);m.position.set((Math.random()-.5)*7,(Math.random()-.5)*5,-4-Math.random()*10);m.rotation.z=(Math.random()-.5)*.5;fragments.add(m)}
  const light=new THREE.DirectionalLight(0xffffff,4.2);light.position.set(-3,4,7);scene.add(light);scene.add(new THREE.AmbientLight(0xffffff,1.8));const edge=new THREE.PointLight(0xd8ff36,90,18);edge.position.set(4,-3,4);scene.add(edge);
  const state={bend:0,tear:0};const tl=gsap.timeline({paused:true});
  tl.to(cam.position,{z:3.1,y:.55,duration:2.1,ease:"power3.inOut"},0)
    .to(state,{bend:1,duration:1.4,ease:"power2.inOut"},1.4)
    .to(cam.position,{z:.45,y:-.65,duration:1.7,ease:"expo.inOut"},2.4)
    .to(paper.rotation,{y:.22,z:-.04,duration:1.2,ease:"power2.inOut"},2.3)
    .to(state,{tear:1,duration:.65,ease:"expo.in"},3.65)
    .set(paper,{visible:false},4.3).to(cam.position,{z:-5,duration:2.0,ease:"power2.inOut"},4.3)
    .to(fragments.rotation,{z:.32,y:.45,duration:2.0,ease:"power1.inOut"},4.3)
    .set(source,{visible:true},6.0).fromTo(source.scale,{x:.08,y:.08},{x:1,y:1,duration:.75,ease:"expo.out"},6.0)
    .to(cam.position,{z:3.8,y:0,duration:1.0,ease:"expo.inOut"},6.55)
    .to(fragments.scale,{x:.01,y:.01,z:.01,duration:.65,ease:"expo.in"},7.0)
    .to(source.rotation,{z:Math.PI/2,duration:.75,ease:"power3.inOut"},7.35).to(source.scale,{x:2.3,y:.72,duration:.8,ease:"expo.inOut"},7.35)
    .to(source.position,{z:1.2,duration:.8,ease:"expo.inOut"},7.35).to(source.material,{opacity:0,duration:.35},8.05);
  (source.material as THREE.Material).transparent=true;
  let start=performance.now(),raf=0;
  const resize=()=>{r.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()};resize();addEventListener("resize",resize);
  const draw=(now:number)=>{const t=((now-start)/1000)%TOTAL;tl.time(t,false);for(let i=0;i<pos.count;i++){const ox=base[i*3],oy=base[i*3+1];const wave=Math.sin((oy+3)*2.2+t*1.7)*.035*state.bend;const curl=Math.pow(Math.abs(ox)/2.25,2)*.22*state.bend;pos.setZ(i,wave+curl);if(state.tear>.01&&oy<-.1)pos.setX(i,ox+Math.sign(ox||1)*state.tear*Math.max(0,-oy)*.13)}pos.needsUpdate=true;r.render(scene,cam);raf=requestAnimationFrame(draw)};raf=requestAnimationFrame(draw);
  return()=>{cancelAnimationFrame(raf);removeEventListener("resize",resize);tex.dispose();geo.dispose();mat.dispose();r.dispose()}
 },[]);return <canvas ref={ref} className="filmGL"/>;
}

export default function FilmExperience(){const root=useRef<HTMLDivElement>(null);useEffect(()=>{if(!root.current)return;const ctx=gsap.context(()=>{gsap.set(".overlayShot",{autoAlpha:0});const tl=gsap.timeline({repeat:-1});
 tl.set(".o0",{autoAlpha:1},0).from(".o0 .eyebrow",{opacity:0,y:15,duration:.5},.2).from(".o0 .title",{clipPath:"inset(100% 0 0)",y:80,duration:.7,ease:"expo.out"},.35).to(".o0",{autoAlpha:0,duration:.25},2.45)
 .set(".o1",{autoAlpha:1},3.15).from(".claimLabel",{opacity:0,y:20,duration:.35},3.2).from(".claimHero",{scale:1.8,filter:"blur(18px)",opacity:0,duration:.55,ease:"expo.out"},3.35).to(".o1",{autoAlpha:0,duration:.2},4.25)
 .set(".o2",{autoAlpha:1},5.0).from(".token",{opacity:0,z:-500,stagger:.09,duration:.55,ease:"expo.out"},5.0).to(".token",{x:(i)=>[-360,250,-160,340,0][i],y:(i)=>[-170,-130,170,150,0][i],duration:.8,ease:"power3.inOut"},5.45).to(".o2",{autoAlpha:0,duration:.2},6.5)
 .set(".o3",{autoAlpha:1},6.55).from(".alignA",{x:-500,opacity:0,duration:.5,ease:"expo.out"},6.6).from(".alignB",{x:500,opacity:0,duration:.5,ease:"expo.out"},6.65).from(".verifiedWord",{scale:3,opacity:0,filter:"blur(20px)",duration:.45,ease:"expo.out"},7.15).to(".o3",{autoAlpha:0,duration:.2},7.8)
 .set(".o4",{autoAlpha:1},8.05).from(".product",{scale:.68,rotateX:18,filter:"blur(14px)",opacity:0,duration:.75,ease:"expo.out"},8.05).to(".product",{scale:1.04,duration:1.8,ease:"none"},8.8).to(".o4",{clipPath:"inset(0 0 100% 0)",duration:.4,ease:"expo.in"},10.2)
 .set(".o5",{autoAlpha:1},10.35).from(".manifesto span",{yPercent:120,stagger:.08,duration:.55,ease:"expo.out"},10.4).to(".manifesto",{scale:1.45,duration:1.45,ease:"power2.in"},11.0).to(".o5",{autoAlpha:0,duration:.18},12.35)
 .set(".o6",{autoAlpha:1},12.45).from(".sealFinal",{letterSpacing:"1.5em",scale:1.6,filter:"blur(24px)",opacity:0,duration:1.0,ease:"expo.out"},12.55).from(".tagFinal",{opacity:0,y:18,duration:.5},13.45).from(".ruleFinal",{scaleX:0,duration:.7,ease:"expo.out"},13.2).to(".o6",{autoAlpha:0,duration:.08},14.92);return()=>tl.kill()},root);return()=>ctx.revert()},[]);
 return <main ref={root} className="film3"><FilmWorld/><div className="grain"/><div className="hud"><span>SEAL / EVIDENCE STUDY 003</span><span>15.00</span></div>
 <section className="overlayShot o0"><div className="intro"><small className="eyebrow">COURT MESSAGE / RECEIVED 09:41</small><h1 className="title">DON&apos;T<br/>READ IT.<br/><i>VERIFY IT.</i></h1></div></section>
 <section className="overlayShot o1"><div className="claimLabel">CLAIM / 01</div><div className="claimHero">MARCH 14<br/><small>09:00 AM</small></div></section>
 <section className="overlayShot o2"><div className="token">DATE<small>MAR 14</small></div><div className="token">COURT<small>SUPERIOR</small></div><div className="token">ACTION<small>APPEAR</small></div><div className="token">CASE<small>24-1842</small></div><div className="token acidToken">VERIFY</div></section>
 <section className="overlayShot o3"><div className="alignA">MESSAGE<small>MAR 14 · 09:00</small></div><div className="alignB">OFFICIAL SOURCE<small>MAR 14 · 09:00</small></div><div className="verifiedWord">ALIGNED<small>CLAIM × SOURCE</small></div></section>
 <section className="overlayShot o4"><div className="product"><header><b>SEAL</b><span>Court message review</span></header><div className="productGrid"><div className="doc"><small>NOTICE TO APPEAR</small><h3>You are required to appear in court on <mark>Mar 14, 2024</mark>.</h3><p>Failure to appear may result in further action.</p></div><div className="result"><small>WHAT IT MEANS</small><h2>You need to appear in court on Mar 14.</h2><b>VERIFIED · OFFICIAL SOURCE</b><hr/><small>WHAT TO DO NEXT</small><p>Confirm the hearing using the court&apos;s official contact details.</p></div></div></div></section>
 <section className="overlayShot o5"><div className="manifesto"><span>MESSAGE.</span><span>SOURCE.</span><span className="acidText">EVIDENCE.</span></div></section>
 <section className="overlayShot o6"><div className="ruleFinal"/><h1 className="sealFinal">SEAL</h1><p className="tagFinal">EVIDENCE BEFORE CONFIDENCE.</p></section><div className="progress3"/></main>}
