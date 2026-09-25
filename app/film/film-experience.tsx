"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import * as THREE from "three";
import "./film.css";

const TOTAL = 15;

function WebGLWorld({ root }: { root: React.RefObject<HTMLDivElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x090909, 0.055);
    const camera = new THREE.PerspectiveCamera(42, 1, .1, 100);
    camera.position.set(0, 0, 10);

    const group = new THREE.Group(); scene.add(group);
    const paperMat = new THREE.MeshPhysicalMaterial({ color: 0xf1f0e9, roughness: .58, metalness: .02, side: THREE.DoubleSide });
    const acidMat = new THREE.MeshPhysicalMaterial({ color: 0xd8ff36, roughness: .22, metalness: .12, emissive: 0x314000, emissiveIntensity: .35 });
    const chromeMat = new THREE.MeshPhysicalMaterial({ color: 0x999999, roughness: .08, metalness: .95 });
    const pageGeo = new THREE.PlaneGeometry(3.2, 4.4, 24, 32);
    const pages: THREE.Mesh[] = [];
    for (let i=0;i<13;i++) {
      const m = new THREE.Mesh(pageGeo, i===6 ? acidMat : paperMat);
      m.position.set((i%4-1.5)*3.5, (Math.floor(i/4)-1)*3.2, -i*1.55);
      m.rotation.set((i%3-.8)*.11, (i%2 ? 1 : -1)*.18, (i-6)*.025);
      group.add(m); pages.push(m);
    }
    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.25,.36,160,24), chromeMat);
    knot.position.set(0,0,-4); knot.scale.setScalar(.001); scene.add(knot);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.15,.035,12,160), acidMat);
    ring.position.z=-1; ring.scale.setScalar(.001); scene.add(ring);
    scene.add(new THREE.AmbientLight(0xffffff, 2.1));
    const key = new THREE.PointLight(0xffffff, 80, 35); key.position.set(-5,5,7); scene.add(key);
    const acid = new THREE.PointLight(0xd8ff36, 120, 30); acid.position.set(5,-3,3); scene.add(acid);

    const resize=()=>{const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}; resize(); addEventListener("resize",resize);
    const tl = gsap.timeline({ paused:true });
    tl.to(camera.position,{z:5.2,duration:1.6,ease:"power3.inOut"},1.55)
      .to(group.rotation,{y:.7,x:-.16,duration:2.1,ease:"power2.inOut"},2.0)
      .to(camera.position,{z:-2.5,x:1.2,duration:2.4,ease:"power4.inOut"},3.25)
      .to(group.rotation,{y:-.35,z:.14,duration:2.0,ease:"power3.inOut"},4.0)
      .to(pages.map(p=>p.position),{x:(i)=>((i%5)-2)*4.8,y:(i)=>(Math.floor(i/5)-1)*4.2,z:(i)=>-2-i*.65,duration:1.25,stagger:.025,ease:"expo.out"},4.25)
      .to(knot.scale,{x:1,y:1,z:1,duration:.65,ease:"back.out(1.8)"},6.1)
      .to(knot.rotation,{x:2.4,y:3.7,z:.8,duration:2.1,ease:"power2.inOut"},6.1)
      .to(ring.scale,{x:1,y:1,z:1,duration:.5,ease:"expo.out"},7.15)
      .to(camera.position,{z:8,x:0,duration:1.1,ease:"expo.inOut"},7.35)
      .to(group.scale,{x:.01,y:.01,z:.01,duration:.7,ease:"expo.in"},8.1)
      .to([knot.scale,ring.scale],{x:.001,y:.001,z:.001,duration:.5,ease:"expo.in"},8.1);

    let raf=0, start=performance.now();
    const draw=(now:number)=>{const t=((now-start)/1000)%TOTAL;tl.time(t,false);knot.rotation.z += .0015;renderer.render(scene,camera);raf=requestAnimationFrame(draw)}; raf=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(raf);removeEventListener("resize",resize);renderer.dispose();pageGeo.dispose();paperMat.dispose();acidMat.dispose();chromeMat.dispose()};
  },[root]);
  return <canvas ref={canvasRef} className="filmGL"/>;
}

export default function FilmExperience(){
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!root.current)return;
    const ctx=gsap.context(()=>{
      gsap.set(".shot",{autoAlpha:0});
      const tl=gsap.timeline({repeat:-1,repeatDelay:0,defaults:{ease:"power3.inOut"}});
      tl.set(".s0",{autoAlpha:1},0).fromTo(".s0 .mega",{yPercent:120,rotate:3},{yPercent:0,rotate:0,duration:.72,ease:"expo.out"},.1).to(".s0",{autoAlpha:0,duration:.18},1.3)
        .set(".s1",{autoAlpha:1},1.38).from(".s1 .word",{yPercent:130,stagger:.045,duration:.55,ease:"expo.out"},1.45).from(".s1 .micro",{opacity:0,y:30,duration:.4},1.85).to(".s1",{clipPath:"inset(0 0 100% 0)",duration:.38,ease:"expo.in"},3.05)
        .set(".s2",{autoAlpha:1},3.15).from(".claim2",{z:-900,scale:.25,opacity:0,rotateX:70,stagger:.09,duration:.75,ease:"expo.out"},3.2).to(".claim2",{x:(i)=>[-330,280,-120,360][i],y:(i)=>[-150,-70,160,170][i],rotate:(i)=>[-7,4,3,-4][i],duration:.8,ease:"power4.inOut"},4.0).to(".s2",{autoAlpha:0,duration:.2},5.25)
        .set(".s3",{autoAlpha:1},5.35).from(".source2",{scale:.1,opacity:0,stagger:.08,duration:.55,ease:"back.out(1.6)"},5.45).fromTo(".beam",{scaleX:0},{scaleX:1,duration:.8,ease:"expo.inOut"},6.0).from(".matchWord",{scale:4,filter:"blur(20px)",opacity:0,duration:.45,ease:"expo.out"},6.65).to(".s3",{autoAlpha:0,duration:.16},7.75)
        .set(".s4",{autoAlpha:1},7.82).from(".product",{scale:.42,rotateX:22,z:-700,filter:"blur(15px)",opacity:0,duration:.8,ease:"expo.out"},7.85).to(".product",{scale:1.07,duration:1.5,ease:"none"},8.65).to(".s4",{clipPath:"inset(0 0 0 100%)",duration:.32,ease:"expo.in"},10.05)
        .set(".s5",{autoAlpha:1},10.15).fromTo(".kinetic",{xPercent:110,skewX:-14},{xPercent:0,skewX:0,duration:.42,stagger:.62,ease:"expo.out"},10.2).to(".kinetic",{xPercent:-120,stagger:.62,duration:.3,ease:"expo.in"},10.8).to(".s5",{autoAlpha:0,duration:.1},12.8)
        .set(".s6",{autoAlpha:1},12.9).from(".sealFinal",{scale:1.8,letterSpacing:"1.4em",filter:"blur(25px)",opacity:0,duration:1,ease:"expo.out"},13.05).from(".tagFinal",{opacity:0,y:15,duration:.5},13.75).to(".endLine",{scaleX:1,duration:.75,ease:"expo.out"},13.45)
        .to(".s6",{autoAlpha:0,duration:.08},14.92);
      return()=>tl.kill();
    },root); return()=>ctx.revert();
  },[]);
  return <div ref={root} className="film2">
    <WebGLWorld root={root}/><div className="noise"/><div className="frame"><span>SEAL / FILM 001</span><span>15.00 SEC</span></div>
    <section className="shot s0"><div className="mega">SEAL</div><div className="tiny">VERIFY WHAT&apos;S ACTUALLY THERE.</div></section>
    <section className="shot s1"><div className="headline"><span className="word">A COURT</span><span className="word">MESSAGE</span><span className="word acidText">CAN CHANGE</span><span className="word">YOUR LIFE.</span></div><div className="micro">SO DON&apos;T GUESS WHAT IT MEANS.</div></section>
    <section className="shot s2"><div className="axis">01 — EXTRACT / 02 — VERIFY / 03 — CITE</div>{["COURT DATE","REQUIRED ACTION","SENDER","HEARING DETAILS"].map(x=><div className="claim2" key={x}>{x}<small>EXTRACTED CLAIM</small></div>)}</section>
    <section className="shot s3"><div className="source2 a">OFFICIAL NOTICE<small>courts.state.gov</small></div><div className="source2 b">DOCKET RECORD<small>case / 24-1842</small></div><div className="beam"/><div className="matchWord">MATCH<span>CLAIM × SOURCE</span></div></section>
    <section className="shot s4"><div className="product"><header><b>SEAL</b><span>Court message review</span></header><div className="productGrid"><div className="doc"><small>NOTICE TO APPEAR</small><h3>You are required to appear in court on <mark>Mar 14, 2024</mark>.</h3><p>Failure to appear may result in further action.</p></div><div className="result"><small>WHAT IT MEANS</small><h2>You need to appear in court on Mar 14.</h2><b>VERIFIED · OFFICIAL SOURCE</b><hr/><small>WHAT TO DO NEXT</small><p>Confirm the hearing using the court&apos;s official contact details.</p></div></div></div></section>
    <section className="shot s5"><div className="kinetic">WHAT IT SAYS.</div><div className="kinetic">WHAT THE COURT SAYS.</div><div className="kinetic">WHAT YOU DO NEXT.</div></section>
    <section className="shot s6"><div className="endLine"/><h1 className="sealFinal">SEAL</h1><p className="tagFinal">EVIDENCE BEFORE CONFIDENCE.</p></section>
    <div className="progress2"/>
  </div>
}
