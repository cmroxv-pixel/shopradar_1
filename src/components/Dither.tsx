'use client';
import { useEffect, useRef } from 'react';

interface DitherProps {
  waveSpeed?: number;
  waveFrequency?: number;
  waveAmplitude?: number;
  waveColor?: [number, number, number];
  colorNum?: number;
  pixelSize?: number;
  enableMouseInteraction?: boolean;
  mouseRadius?: number;
}

export default function Dither({
  waveSpeed = 0.04,
  waveFrequency = 2.5,
  waveAmplitude = 0.35,
  waveColor = [0.1, 0.4, 1.0],
  colorNum = 4,
  pixelSize = 3,
  enableMouseInteraction = true,
  mouseRadius = 0.8,
}: DitherProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return;

    const vertSrc = `
      attribute vec2 a_position;
      void main() { gl_Position = vec4(a_position, 0, 1); }
    `;

    const fragSrc = `
      precision highp float;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform float u_speed;
      uniform float u_freq;
      uniform float u_amp;
      uniform vec3 u_color;
      uniform vec2 u_mouse;
      uniform float u_mouseRadius;
      uniform float u_pixelSize;
      uniform float u_colorNum;

      vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
      vec4 perm(vec4 x){return mod289(((x*34.)+1.)*x);}
      float noise(vec2 P){
        vec4 Pi=floor(P.xyxy)+vec4(0,0,1,1);
        vec4 Pf=fract(P.xyxy)-vec4(0,0,1,1);
        Pi=mod289(Pi);
        vec4 ix=Pi.xzxz, iy=Pi.yyww;
        vec4 fx=Pf.xzxz, fy=Pf.yyww;
        vec4 i=perm(perm(ix)+iy);
        vec4 gx=fract(i*(1./41.))*2.-1.;
        vec4 gy=abs(gx)-.5;
        gx-=floor(gx+.5);
        vec2 g00=vec2(gx.x,gy.x),g10=vec2(gx.y,gy.y);
        vec2 g01=vec2(gx.z,gy.z),g11=vec2(gx.w,gy.w);
        vec4 n=1.79284-.85373*vec4(dot(g00,g00),dot(g01,g01),dot(g10,g10),dot(g11,g11));
        g00*=n.x;g01*=n.y;g10*=n.z;g11*=n.w;
        vec2 f=Pf.xy*Pf.xy*Pf.xy*(Pf.xy*(Pf.xy*6.-15.)+10.);
        float n00=dot(g00,fx.xw),n10=dot(g10,vec2(fx.y,fy.y));
        float n01=dot(g01,vec2(fx.z,fy.z)),n11=dot(g11,fx.yw);
        vec2 nx=mix(vec2(dot(g00,fx.xw),dot(g01,vec2(fx.z,fy.z))),vec2(dot(g10,vec2(fx.y,fy.y)),dot(g11,fx.yw)),f.x);
        return 2.3*mix(nx.x,nx.y,f.y);
      }

      float fbm(vec2 p){
        float v=0.,a=1.,f=u_freq;
        for(int i=0;i<4;i++){v+=a*abs(noise(p));p*=f;a*=u_amp;}
        return v;
      }

      const float bayer[64] = float[64](
        0.,48.,12.,60.,3.,51.,15.,63.,
        32.,16.,44.,28.,35.,19.,47.,31.,
        8.,56.,4.,52.,11.,59.,7.,55.,
        40.,24.,36.,20.,43.,27.,39.,23.,
        2.,50.,14.,62.,1.,49.,13.,61.,
        34.,18.,46.,30.,33.,17.,45.,29.,
        10.,58.,6.,54.,9.,57.,5.,53.,
        42.,26.,38.,22.,41.,25.,37.,21.
      );

      void main(){
        vec2 pixel = floor(gl_FragCoord.xy / u_pixelSize) * u_pixelSize;
        vec2 uv = pixel / u_resolution - 0.5;
        uv.x *= u_resolution.x / u_resolution.y;

        vec2 p2 = uv - u_time * u_speed;
        float f = fbm(uv + fbm(p2));

        vec2 m = (u_mouse / u_resolution - 0.5) * vec2(1,-1);
        m.x *= u_resolution.x / u_resolution.y;
        float d = length(uv - m);
        f -= 0.5 * (1. - smoothstep(0., u_mouseRadius, d));

        vec3 col = mix(vec3(0.), u_color, f);

        int xi = int(mod(gl_FragCoord.x / u_pixelSize, 8.));
        int yi = int(mod(gl_FragCoord.y / u_pixelSize, 8.));
        float threshold = bayer[yi*8+xi] / 64. - 0.25;
        float step = 1. / (u_colorNum - 1.);
        col += threshold * step;
        col = clamp(col - 0.2, 0., 1.);
        col = floor(col * (u_colorNum - 1.) + 0.5) / (u_colorNum - 1.);

        gl_FragColor = vec4(col, 1.);
      }
    `;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src); gl.compileShader(s); return s;
    };

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vertSrc));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fragSrc));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(prog, name);
    const uRes = u('u_resolution'), uTime = u('u_time'), uSpeed = u('u_speed');
    const uFreq = u('u_freq'), uAmp = u('u_amp'), uColor = u('u_color');
    const uMouse = u('u_mouse'), uMouseR = u('u_mouseRadius');
    const uPixel = u('u_pixelSize'), uColorNum = u('u_colorNum');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const onMouseMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };
    if (enableMouseInteraction) window.addEventListener('mousemove', onMouseMove);

    let start = performance.now();
    const render = () => {
      const t = (performance.now() - start) / 1000;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform1f(uSpeed, waveSpeed);
      gl.uniform1f(uFreq, waveFrequency);
      gl.uniform1f(uAmp, waveAmplitude);
      gl.uniform3f(uColor, waveColor[0], waveColor[1], waveColor[2]);
      gl.uniform2f(uMouse, mouse.current.x, canvas.height - mouse.current.y);
      gl.uniform1f(uMouseR, mouseRadius);
      gl.uniform1f(uPixel, pixelSize);
      gl.uniform1f(uColorNum, colorNum);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animRef.current = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      if (enableMouseInteraction) window.removeEventListener('mousemove', onMouseMove);
    };
  }, [waveSpeed, waveFrequency, waveAmplitude, waveColor, colorNum, pixelSize, enableMouseInteraction, mouseRadius]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
}
