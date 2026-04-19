'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import Link from 'next/link';
import { LiquidButton } from '@/components/ui/LiquidButton';

// ── Dot canvas shader ──────────────────────────────────────
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
      else if (u.type === 'uniform3fv') prepared[k] = { value: (u.value as number[][]).map((v: number[]) => new THREE.Vector3().fromArray(v)) };
    }
    prepared['u_time'] = { value: 0 };
    prepared['u_resolution'] = { value: new THREE.Vector2(size.width * 2, size.height * 2) };

    return new THREE.ShaderMaterial({
      vertexShader: `precision mediump float; uniform vec2 u_resolution; out vec2 fragCoord; void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); fragCoord = (position.xy + vec2(1.0)) * 0.5 * u_resolution; fragCoord.y = u_resolution.y - fragCoord.y; }`,
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

const DotCanvas = ({ reverse = false }: { reverse?: boolean }) => {
  const uniforms = useMemo(() => ({
    u_colors: {
      value: [[1,1,1],[1,1,1],[1,1,1],[1,1,1],[1,1,1],[1,1,1]],
      type: 'uniform3fv',
    },
    u_opacities: { value: [0.6,0.6,0.7,0.8,0.8,0.9,1.0,1.0,1.0,1], type: 'uniform1fv' },
    u_total_size: { value: 20, type: 'uniform1f' },
    u_dot_size: { value: 5, type: 'uniform1f' },
    u_reverse: { value: reverse ? 1 : 0, type: 'uniform1i' },
  }), [reverse]);

  const source = `
    precision mediump float;
    in vec2 fragCoord;
    uniform float u_time;
    uniform float u_opacities[10];
    uniform vec3 u_colors[6];
    uniform float u_total_size;
    uniform float u_dot_size;
    uniform vec2 u_resolution;
    uniform int u_reverse;
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
      float speed = 0.5;
      vec2 center_grid = u_resolution/2.0/u_total_size;
      float dist = distance(center_grid,st2);
      float max_dist = distance(center_grid,vec2(0.0));
      float offset = u_reverse==1 ? (max_dist-dist)*0.02+random(st2+42.0)*0.2 : dist*0.01+random(st2)*0.15;
      if(u_reverse==1){ opacity *= 1.0-step(offset,u_time*speed); }
      else { opacity *= step(offset,u_time*speed); }
      fragColor = vec4(color,opacity);
      fragColor.rgb *= fragColor.a;
    }`;

  return (
    <Canvas style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <ShaderMesh source={source} uniforms={uniforms} />
    </Canvas>
  );
};

// ── Sign-in form ───────────────────────────────────────────
export default function AuthClient() {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reverseCanvas, setReverseCanvas] = useState(false);
  const { signIn, signUp } = useAuth();
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);

  // Countdown timer when locked out
  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) { setLockedUntil(null); setAttempts(0); setLockCountdown(0); clearInterval(interval); }
      else setLockCountdown(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockedUntil && Date.now() < lockedUntil) {
      toast.error(`Too many attempts. Try again in ${lockCountdown}s`);
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      setReverseCanvas(true);
      toast.success('Welcome back!');
      setTimeout(() => router.push('/watchlist-price-alerts'), 1000);
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await signUp(email, password, name);
      setReverseCanvas(true);
      toast.success('Account created!');
      setTimeout(() => router.push('/watchlist-price-alerts'), 1000);
    } catch (err: any) {
      toast.error(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };


  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 16px',
    borderRadius: 14,
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.13)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    color: 'white',
    fontSize: 14,
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    outline: 'none',
    transition: 'all 0.18s',
    boxSizing: 'border-box',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.1)',
  };
  const inputFocus: Partial<CSSStyleDeclaration> = {
    borderColor: 'rgba(61,142,255,0.7)',
    background: 'rgba(61,142,255,0.10)',
    boxShadow: '0 0 0 3px rgba(61,142,255,0.18), inset 0 1px 0 rgba(255,255,255,0.1)',
  };
  const inputBlur: Partial<CSSStyleDeclaration> = {
    borderColor: 'rgba(255,255,255,0.13)',
    background: 'rgba(255,255,255,0.07)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.1)',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#000', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#111', border: '1px solid #333', color: 'white', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: 13 } }} />

      {/* Animated dot canvas — visible through glass card */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {!reverseCanvas && <DotCanvas reverse={false} />}
        {reverseCanvas && <DotCanvas reverse={true} />}
        {/* Subtle edge vignette only — DO NOT darken center */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '20%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.85), transparent)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '15%', background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }} />
      </div>

      {/* Floating glass card */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 400, padding: '0 20px' }}>
        {/* 
          Chrome cannot backdrop-filter through WebGL canvases (different compositing layer).
          Fix: explicit frosted glass layer using a screenshot-blur trick via filter on a
          semi-opaque div, plus a visible frosted-white tint that mimics the blur visually.
        */}
        <div style={{
          position: 'relative',
          borderRadius: 32,
          // Frosted glass: white tint layer creates the "blurred" appearance
          // even when true backdrop-filter can't pierce WebGL
          background: 'linear-gradient(145deg, rgba(40,40,55,0.72) 0%, rgba(25,25,40,0.78) 100%)',
          boxShadow: [
            'inset 0 1.5px 0 rgba(255,255,255,0.45)',
            'inset 0 -1px 0 rgba(0,0,0,0.4)',
            'inset 1px 0 rgba(255,255,255,0.12)',
            'inset -1px 0 rgba(255,255,255,0.06)',
            '0 0 0 0.5px rgba(255,255,255,0.22)',
            '0 24px 64px rgba(0,0,0,0.7)',
            '0 0 100px rgba(61,142,255,0.10)',
          ].join(', '),
          padding: '36px 28px 32px',
          backdropFilter: 'blur(60px) saturate(200%)',
          WebkitBackdropFilter: 'blur(60px) saturate(200%)',
        }}>

          {/* Curved top gloss — signature iOS 26 specular highlight */}
          <div aria-hidden style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 70,
            background: 'radial-gradient(ellipse 90% 80% at 50% -5%, rgba(255,255,255,0.26) 0%, transparent 70%)',
            pointerEvents: 'none', borderRadius: '32px 32px 0 0',
          }} />

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <a href="/product-search-results" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
              <img src="/logo.png" alt="ShopRadar" style={{ width: 28, height: 28 }} />
              <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,0.90)', letterSpacing: '-0.02em' }}>ShopRadar</span>
            </a>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>

              {/* Headline */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <h1 style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 700, fontSize: 26, color: 'white', letterSpacing: '-0.025em', marginBottom: 5, lineHeight: 1.1 }}>
                  {tab === 'login' ? 'Welcome back' : 'Create account'}
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: 13.5, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                  {tab === 'login' ? 'Sign in to your ShopRadar account' : 'Start finding better prices today'}
                </p>
              </div>

              {/* iOS 26 segmented control */}
              <div style={{
                display: 'flex', gap: 3, padding: 3, marginBottom: 20,
                background: 'rgba(0,0,0,0.25)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                borderRadius: 14,
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4), inset 0 0 0 0.5px rgba(255,255,255,0.08)',
              }}>
                {(['login', 'signup'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{
                    flex: 1, padding: '9px 0', borderRadius: 11, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600,
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                    transition: 'all 0.2s cubic-bezier(0.25,0.46,0.45,0.94)',
                    color: tab === t ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.35)',
                    background: tab === t ? 'rgba(255,255,255,0.14)' : 'transparent',
                    backdropFilter: tab === t ? 'blur(16px)' : 'none',
                    WebkitBackdropFilter: tab === t ? 'blur(16px)' : 'none',
                    boxShadow: tab === t
                      ? 'inset 0 1px 0 rgba(255,255,255,0.30), inset 0 -1px 0 rgba(0,0,0,0.15), 0 1px 6px rgba(0,0,0,0.2)'
                      : 'none',
                  }}>
                    {t === 'login' ? 'Sign in' : 'Sign up'}
                  </button>
                ))}
              </div>

              {/* Form */}
              <form onSubmit={tab === 'login' ? handleLogin : handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tab === 'signup' && (
                  <input type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required style={inputStyle}
                    onFocus={e => Object.assign((e.target as HTMLElement).style, inputFocus)}
                    onBlur={e => Object.assign((e.target as HTMLElement).style, inputBlur)} />
                )}
                <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle}
                  onFocus={e => Object.assign((e.target as HTMLElement).style, inputFocus)}
                  onBlur={e => Object.assign((e.target as HTMLElement).style, inputBlur)} />
                <div style={{ position: 'relative' }}>
                  <input type={showPwd ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
                    style={{ ...inputStyle, paddingRight: 44 }}
                    onFocus={e => Object.assign((e.target as HTMLElement).style, inputFocus)}
                    onBlur={e => Object.assign((e.target as HTMLElement).style, inputBlur)} />
                  <button type="button" onClick={() => setShowPwd(p => !p)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 0 }}>
                    {showPwd
                      ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M2 2l12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/></svg>
                    }
                  </button>
                </div>
                {tab === 'signup' && (
                  <input type="password" placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={inputStyle}
                    onFocus={e => Object.assign((e.target as HTMLElement).style, inputFocus)}
                    onBlur={e => Object.assign((e.target as HTMLElement).style, inputBlur)} />
                )}

                {lockedUntil && lockCountdown > 0 && (
                  <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 12, color: '#ef4444', textAlign: 'center' }}>
                    🔒 Locked for {Math.floor(lockCountdown / 60)}:{String(lockCountdown % 60).padStart(2, '0')}
                  </div>
                )}

                {/* Blue liquid glass submit */}
                <button type="submit" disabled={loading || (!!lockedUntil && Date.now() < lockedUntil)}
                  style={{
                    position: 'relative', overflow: 'hidden',
                    width: '100%', padding: '14px 0', marginTop: 4,
                    borderRadius: 16, border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: 15, fontWeight: 700,
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                    letterSpacing: '-0.01em',
                    color: 'white',
                    background: 'linear-gradient(160deg, rgba(80,155,255,0.85) 0%, rgba(41,100,220,0.80) 100%)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.40), inset 0 -1.5px 0 rgba(0,0,0,0.20), 0 8px 28px rgba(41,100,220,0.45), 0 2px 8px rgba(0,0,0,0.25)',
                    transition: 'all 0.2s',
                    opacity: loading ? 0.7 : 1,
                  }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.12)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
                >
                  <span aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(180deg, rgba(255,255,255,0.20) 0%, transparent 100%)', borderRadius: '16px 16px 0 0', pointerEvents: 'none' }} />
                  <span style={{ position: 'relative', zIndex: 1 }}>
                    {loading ? 'Please wait…' : tab === 'login' ? 'Sign in →' : 'Create account →'}
                  </span>
                </button>
              </form>

              {tab === 'login' && (
                <p style={{ textAlign: 'center', marginTop: 18, fontSize: 12, color: 'rgba(255,255,255,0.28)', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                  Don't have an account?{' '}
                  <button onClick={() => setTab('signup')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 600, textDecoration: 'underline' }}>
                    Sign up
                  </button>
                </p>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
