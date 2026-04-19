import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';
import { useEffect, useRef, useMemo, useCallback } from 'react';
import './FaultyTerminal.css';

const vertexShader = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision mediump float;
varying vec2 vUv;
uniform float iTime;
uniform vec3 iResolution;
uniform float uScale;
uniform vec2 uGridMul;
uniform float uDigitSize;
uniform float uScanlineIntensity;
uniform float uGlitchAmount;
uniform float uFlickerAmount;
uniform float uNoiseAmp;
uniform float uChromaticAberration;
uniform float uDither;
uniform float uCurvature;
uniform vec3 uTint;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform float uUseMouse;
uniform float uPageLoadProgress;
uniform float uUsePageLoadAnimation;
uniform float uBrightness;
float time;
float hash21(vec2 p){p=fract(p*234.56);p+=dot(p,p+34.56);return fract(p.x*p.y);}
float noise(vec2 p){return sin(p.x*10.0)*sin(p.y*(3.0+sin(time*0.090909)))+0.2;}
mat2 rotate(float a){float c=cos(a);float s=sin(a);return mat2(c,-s,s,c);}
float fbm(vec2 p){
  p*=1.1;float f=0.0;float amp=0.5*uNoiseAmp;
  f+=amp*noise(p);p=rotate(time*0.02)*p*2.0;amp*=0.454545;
  f+=amp*noise(p);p=rotate(time*0.02)*p*2.0;amp*=0.454545;
  f+=amp*noise(p);return f;
}
float pattern(vec2 p,out vec2 q,out vec2 r){
  q=vec2(fbm(p+vec2(1.0)),fbm(rotate(0.1*time)*p+vec2(1.0)));
  r=vec2(fbm(rotate(0.1)*q+vec2(0.0)),fbm(q+vec2(0.0)));
  return fbm(p+r);
}
float digit(vec2 p){
  vec2 grid=uGridMul*15.0;
  vec2 s=floor(p*grid)/grid;
  p=p*grid;
  vec2 q,r;
  float intensity=pattern(s*0.1,q,r)*1.3-0.03;
  if(uUseMouse>0.5){
    float d=distance(s,uMouse*uScale);
    float mi=exp(-d*8.0)*uMouseStrength*10.0;
    intensity+=mi+sin(d*20.0-iTime*5.0)*0.1*mi;
  }
  if(uUsePageLoadAnimation>0.5){
    float cr=fract(sin(dot(s,vec2(12.9898,78.233)))*43758.5453);
    intensity*=smoothstep(0.0,1.0,clamp((uPageLoadProgress-cr*0.8)/0.2,0.0,1.0));
  }
  p=fract(p)*uDigitSize;
  float px5=p.x*5.0;float py5=(1.0-p.y)*5.0;
  float x=fract(px5);float y=fract(py5);
  float i=floor(py5)-2.0;float j=floor(px5)-2.0;
  float n=i*i+j*j;float f=n*0.0625;
  float isOn=step(0.1,intensity-f);
  float brightness=isOn*(0.2+y*0.8)*(0.75+x*0.25);
  return step(0.0,p.x)*step(p.x,1.0)*step(0.0,p.y)*step(p.y,1.0)*brightness;
}
float onOff(float a,float b,float c){return step(c,sin(iTime+a*cos(iTime*b)))*uFlickerAmount;}
float displace(vec2 look){
  float y=look.y-mod(iTime*0.25,1.0);
  float w=1.0/(1.0+50.0*y*y);
  return sin(look.y*20.0+iTime)*0.0125*onOff(4.0,2.0,0.8)*(1.0+cos(iTime*60.0))*w;
}
vec3 getColor(vec2 p){
  float bar=step(mod(p.y+time*20.0,1.0),0.2)*0.4+1.0;
  bar*=uScanlineIntensity;
  float d=displace(p);
  p.x+=d+(uGlitchAmount!=1.0?d*(uGlitchAmount-1.0):0.0);
  float m=digit(p);
  const float o=0.002;
  float s=digit(p+vec2(-o,-o))+digit(p+vec2(0.0,-o))+digit(p+vec2(o,-o))+
          digit(p+vec2(-o,0.0))+digit(p+vec2(0.0,0.0))+digit(p+vec2(o,0.0))+
          digit(p+vec2(-o,o))+digit(p+vec2(0.0,o))+digit(p+vec2(o,o));
  return vec3(0.9)*m+s*0.1*vec3(1.0)*bar;
}
vec2 barrel(vec2 uv){vec2 c=uv*2.0-1.0;c*=1.0+uCurvature*dot(c,c);return c*0.5+0.5;}
void main(){
  time=iTime*0.333333;
  vec2 uv=vUv;
  if(uCurvature!=0.0)uv=barrel(uv);
  vec2 p=uv*uScale;
  vec3 col=getColor(p);
  if(uChromaticAberration!=0.0){
    vec2 ca=vec2(uChromaticAberration)/iResolution.xy;
    col.r=getColor(p+ca).r;col.b=getColor(p-ca).b;
  }
  col*=uTint*uBrightness;
  if(uDither>0.0)col+=(hash21(gl_FragCoord.xy)-0.5)*(uDither*0.003922);
  gl_FragColor=vec4(col,1.0);
}
`;

function hexToRgb(hex){
  let h=hex.replace('#','').trim();
  if(h.length===3)h=h.split('').map(c=>c+c).join('');
  const n=parseInt(h,16);
  return[((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255];
}

export default function FaultyTerminal({
  scale=1.5,gridMul=[2,1],digitSize=1.2,timeScale=0.5,pause=false,
  scanlineIntensity=0.5,glitchAmount=1,flickerAmount=1,noiseAmp=1,
  chromaticAberration=0,dither=0,curvature=0.1,tint='#ffffff',
  mouseReact=true,mouseStrength=0.5,
  dpr=Math.min(typeof window!=='undefined'?window.devicePixelRatio||1:1,2),
  pageLoadAnimation=false,brightness=0.6,className='',style,...rest
}){
  const containerRef=useRef(null);
  const mouseRef=useRef({x:0.5,y:0.5});
  const smoothMouseRef=useRef({x:0.5,y:0.5});
  const frozenTimeRef=useRef(0);
  const rafRef=useRef(0);
  const loadStartRef=useRef(0);
  const timeOffsetRef=useRef(Math.random()*100);
  const tintVec=useMemo(()=>hexToRgb(tint),[tint]);
  const ditherVal=useMemo(()=>typeof dither==='boolean'?(dither?1:0):dither,[dither]);
  const onMouseMove=useCallback(e=>{
    const el=containerRef.current;if(!el)return;
    const r=el.getBoundingClientRect();
    mouseRef.current={x:(e.clientX-r.left)/r.width,y:1-(e.clientY-r.top)/r.height};
  },[]);

  useEffect(()=>{
    const el=containerRef.current;if(!el)return;
    const renderer=new Renderer({dpr});
    const gl=renderer.gl;
    gl.clearColor(0,0,0,1);
    const program=new Program(gl,{
      vertex:vertexShader,fragment:fragmentShader,
      uniforms:{
        iTime:{value:0},
        iResolution:{value:new Color(gl.canvas.width,gl.canvas.height,gl.canvas.width/gl.canvas.height)},
        uScale:{value:scale},uGridMul:{value:new Float32Array(gridMul)},
        uDigitSize:{value:digitSize},uScanlineIntensity:{value:scanlineIntensity},
        uGlitchAmount:{value:glitchAmount},uFlickerAmount:{value:flickerAmount},
        uNoiseAmp:{value:noiseAmp},uChromaticAberration:{value:chromaticAberration},
        uDither:{value:ditherVal},uCurvature:{value:curvature},
        uTint:{value:new Color(tintVec[0],tintVec[1],tintVec[2])},
        uMouse:{value:new Float32Array([0.5,0.5])},
        uMouseStrength:{value:mouseStrength},uUseMouse:{value:mouseReact?1:0},
        uPageLoadProgress:{value:pageLoadAnimation?0:1},
        uUsePageLoadAnimation:{value:pageLoadAnimation?1:0},
        uBrightness:{value:brightness},
      }
    });
    const mesh=new Mesh(gl,{geometry:new Triangle(gl),program});
    const resize=()=>{
      renderer.setSize(el.offsetWidth,el.offsetHeight);
      program.uniforms.iResolution.value=new Color(gl.canvas.width,gl.canvas.height,gl.canvas.width/gl.canvas.height);
    };
    const ro=new ResizeObserver(resize);ro.observe(el);resize();
    const tick=t=>{
      rafRef.current=requestAnimationFrame(tick);
      if(pageLoadAnimation&&loadStartRef.current===0)loadStartRef.current=t;
      if(!pause){const e=(t*0.001+timeOffsetRef.current)*timeScale;program.uniforms.iTime.value=e;frozenTimeRef.current=e;}
      else program.uniforms.iTime.value=frozenTimeRef.current;
      if(pageLoadAnimation&&loadStartRef.current>0)
        program.uniforms.uPageLoadProgress.value=Math.min((t-loadStartRef.current)/2000,1);
      if(mouseReact){
        const sm=smoothMouseRef.current,m=mouseRef.current;
        sm.x+=(m.x-sm.x)*0.08;sm.y+=(m.y-sm.y)*0.08;
        program.uniforms.uMouse.value[0]=sm.x;program.uniforms.uMouse.value[1]=sm.y;
      }
      renderer.render({scene:mesh});
    };
    rafRef.current=requestAnimationFrame(tick);
    el.appendChild(gl.canvas);
    if(mouseReact)el.addEventListener('mousemove',onMouseMove);
    return()=>{
      cancelAnimationFrame(rafRef.current);ro.disconnect();
      if(mouseReact)el.removeEventListener('mousemove',onMouseMove);
      if(gl.canvas.parentElement===el)el.removeChild(gl.canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      loadStartRef.current=0;timeOffsetRef.current=Math.random()*100;
    };
  },[dpr,pause,timeScale,scale,gridMul,digitSize,scanlineIntensity,glitchAmount,
     flickerAmount,noiseAmp,chromaticAberration,ditherVal,curvature,tintVec,
     mouseReact,mouseStrength,pageLoadAnimation,brightness,onMouseMove]);

  return <div ref={containerRef} className={`faulty-terminal-container ${className}`} style={style} {...rest}/>;
}
