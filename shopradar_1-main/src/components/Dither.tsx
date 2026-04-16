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

    // Set canvas size
    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setSize();

    const gl = canvas.getContext('webgl') as WebGLRenderingContext;
    if (!gl) return;

    gl.viewport(0, 0, canvas.width, canvas.height);

    const vertSrc = `
      attribute vec2 a_pos;
      void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
    `;

    const fragSrc = `
      precision mediump float;
      uniform vec2 u_res;
      uniform float u_time;
      uniform float u_speed;
      uniform float u_freq;
      uniform float u_amp;
      uniform vec3 u_color;
      uniform vec2 u_mouse;
      uniform float u_mrad;
      uniform float u_px;
      uniform float u_cnum;

      float rand(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = rand(i);
        float b = rand(i + vec2(1,0));
        float c = rand(i + vec2(0,1));
        float d = rand(i + vec2(1,1));
        return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p *= u_freq;
          a *= u_amp;
        }
        return v;
      }

      void main() {
        vec2 coord = floor(gl_FragCoord.xy / u_px) * u_px;
        vec2 uv = (coord / u_res) * 2.0 - 1.0;
        uv.x *= u_res.x / u_res.y;

        vec2 p = uv + vec2(u_time * u_speed);
        float f = fbm(p + fbm(p + fbm(p)));

        // Mouse interaction
        vec2 m = (u_mouse / u_res) * 2.0 - 1.0;
        m.y *= -1.0;
        m.x *= u_res.x / u_res.y;
        float dist = length(uv - m);
        f -= 0.4 * (1.0 - smoothstep(0.0, u_mrad, dist));

        // Dither
        vec2 sc = floor(gl_FragCoord.xy / u_px);
        int bx = int(mod(sc.x, 4.0));
        int by = int(mod(sc.y, 4.0));
        float threshold = 0.0;
        if (bx == 0 && by == 0) threshold = 0.0/16.0;
        else if (bx == 2 && by == 0) threshold = 8.0/16.0;
        else if (bx == 0 && by == 2) threshold = 2.0/16.0;
        else if (bx == 2 && by == 2) threshold = 10.0/16.0;
        else if (bx == 1 && by == 1) threshold = 5.0/16.0;
        else if (bx == 3 && by == 1) threshold = 13.0/16.0;
        else if (bx == 1 && by == 3) threshold = 7.0/16.0;
        else if (bx == 3 && by == 3) threshold = 15.0/16.0;
        else if (bx == 0 && by == 1) threshold = 4.0/16.0;
        else if (bx == 2 && by == 1) threshold = 12.0/16.0;
        else if (bx == 0 && by == 3) threshold = 6.0/16.0;
        else if (bx == 2 && by == 3) threshold = 14.0/16.0;
        else if (bx == 1 && by == 0) threshold = 3.0/16.0;
        else if (bx == 3 && by == 0) threshold = 11.0/16.0;
        else if (bx == 1 && by == 2) threshold = 1.0/16.0;
        else threshold = 9.0/16.0;

        float step = 1.0 / (u_cnum - 1.0);
        float dithered = floor((f + (threshold - 0.5) * step) * (u_cnum - 1.0) + 0.5) / (u_cnum - 1.0);
        dithered = clamp(dithered, 0.0, 1.0);

        vec3 col = u_color * dithered;
        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const compileShader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compileShader(gl.VERTEX_SHADER, vertSrc));
    gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, fragSrc));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = (n: string) => gl.getUniformLocation(prog, n);
    const uRes = u('u_res'), uTime = u('u_time'), uSpeed = u('u_speed');
    const uFreq = u('u_freq'), uAmp = u('u_amp'), uColor = u('u_color');
    const uMouse = u('u_mouse'), uMrad = u('u_mrad');
    const uPx = u('u_px'), uCnum = u('u_cnum');

    const onResize = () => {
      setSize();
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener('resize', onResize);

    const onMouseMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };
    if (enableMouseInteraction) window.addEventListener('mousemove', onMouseMove);

    const start = performance.now();
    const render = () => {
      const t = (performance.now() - start) / 1000;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform1f(uSpeed, waveSpeed);
      gl.uniform1f(uFreq, waveFrequency);
      gl.uniform1f(uAmp, waveAmplitude);
      gl.uniform3f(uColor, waveColor[0], waveColor[1], waveColor[2]);
      gl.uniform2f(uMouse, mouse.current.x, canvas.height - mouse.current.y);
      gl.uniform1f(uMrad, mouseRadius);
      gl.uniform1f(uPx, pixelSize);
      gl.uniform1f(uCnum, colorNum);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animRef.current = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', onResize);
      if (enableMouseInteraction) window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0, left: 0,
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  );
}
