'use client';
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

type Uniforms = Record<string, { value: number[] | number[][] | number; type: string }>;

const ShaderMesh = ({ source, uniforms }: { source: string; uniforms: Uniforms }) => {
  const { size } = useThree();
  const ref = useRef<THREE.Mesh>(null);

  const material = useMemo(() => {
    const prepared: any = {};
    for (const k in uniforms) {
      const u: any = uniforms[k];
      if (u.type === 'uniform1f') prepared[k] = { value: u.value };
      else if (u.type === 'uniform1i') prepared[k] = { value: u.value };
      else if (u.type === 'uniform1fv') prepared[k] = { value: u.value };
      else if (u.type === 'uniform3fv') {
        prepared[k] = {
          value: (u.value as number[][]).map((v: number[]) => new THREE.Vector3().fromArray(v))
        };
      }
    }
    prepared['u_time'] = { value: 0 };
    prepared['u_resolution'] = { value: new THREE.Vector2(size.width * 2, size.height * 2) };

    return new THREE.ShaderMaterial({
      vertexShader: `
        precision mediump float;
        uniform vec2 u_resolution;
        out vec2 fragCoord;
        void main(){
          gl_Position = vec4(position.xy, 0.0, 1.0);
          fragCoord = (position.xy + vec2(1.0)) * 0.5 * u_resolution;
          fragCoord.y = u_resolution.y - fragCoord.y;
        }`,
      fragmentShader: source,
      uniforms: prepared,
      glslVersion: THREE.GLSL3,
      blending: THREE.CustomBlending,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneFactor,
    });
  }, [size.width, size.height, source]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as any).uniforms.u_time.value = clock.getElapsedTime();
  });

  return (
    <mesh ref={ref as any}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

// Color presets per page
const VARIANTS: Record<string, { colors: number[][]; opacity: number; speed: number; dotSize: number }> = {
  search:    { colors: [[0, 102, 255], [0, 102, 255], [0, 153, 255]], opacity: 0.55, speed: 3,   dotSize: 3 },
  watchlist: { colors: [[255, 60, 100], [255, 100, 60], [200, 40, 120]], opacity: 0.5, speed: 3.5, dotSize: 3 },
  settings:  { colors: [[80, 80, 80], [120, 120, 120], [60, 60, 60]], opacity: 0.45, speed: 4,   dotSize: 2.5 },
  auth:      { colors: [[255, 255, 255], [255, 255, 255], [200, 200, 200]], opacity: 0.6, speed: 3,   dotSize: 4 },
};

interface DotCanvasProps {
  variant?: keyof typeof VARIANTS;
  className?: string;
}

const FRAGMENT_SOURCE = `
  precision mediump float;
  in vec2 fragCoord;
  uniform float u_time;
  uniform float u_opacities[10];
  uniform vec3 u_colors[6];
  uniform float u_total_size;
  uniform float u_dot_size;
  uniform vec2 u_resolution;
  out vec4 fragColor;
  float PHI = 1.61803398874989484820459;
  float random(vec2 xy){ return fract(tan(distance(xy*PHI,xy)*0.5)*xy.x); }
  void main(){
    vec2 st = fragCoord.xy;
    st.x -= abs(floor((mod(u_resolution.x,u_total_size)-u_dot_size)*0.5));
    st.y -= abs(floor((mod(u_resolution.y,u_total_size)-u_dot_size)*0.5));
    float opacity = step(0.0,st.x)*step(0.0,st.y);
    vec2 st2 = vec2(int(st.x/u_total_size),int(st.y/u_total_size));
    float show_offset = random(st2);
    float rand = random(st2*floor((u_time/5.0)+show_offset+5.0));
    opacity *= u_opacities[int(rand*10.0)];
    opacity *= 1.0-step(u_dot_size/u_total_size,fract(st.x/u_total_size));
    opacity *= 1.0-step(u_dot_size/u_total_size,fract(st.y/u_total_size));
    vec3 color = u_colors[int(show_offset*6.0)];
    vec2 center_grid = u_resolution/2.0/u_total_size;
    float dist = distance(center_grid,st2);
    float offset = dist*0.01+random(st2)*0.15;
    opacity *= step(offset,u_time*0.5);
    fragColor = vec4(color,opacity);
    fragColor.rgb *= fragColor.a;
  }`;

export default function DotCanvas({ variant = 'search', className }: DotCanvasProps) {
  const v = VARIANTS[variant];

  const colorsArray = [v.colors[0], v.colors[0], v.colors[1], v.colors[1], v.colors[2], v.colors[2]];

  const uniforms = useMemo(() => ({
    u_colors: {
      value: colorsArray.map(c => [c[0]/255, c[1]/255, c[2]/255]),
      type: 'uniform3fv',
    },
    u_opacities: {
      value: [0.08, 0.08, 0.12, 0.12, 0.18, 0.18, 0.22, 0.22, 0.28, 0.35],
      type: 'uniform1fv',
    },
    u_total_size: { value: 22, type: 'uniform1f' },
    u_dot_size:   { value: v.dotSize, type: 'uniform1f' },
  }), [variant]);

  return (
    <div
      className={className}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    >
      <Canvas style={{ width: '100%', height: '100%' }}>
        <ShaderMesh source={FRAGMENT_SOURCE} uniforms={uniforms} />
      </Canvas>
    </div>
  );
}
