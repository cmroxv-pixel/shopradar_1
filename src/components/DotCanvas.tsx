'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import Link from 'next/link';

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

const DotCanvas = () => {
  const uniforms = useMemo(() => ({
    u_colors: { value: [[1,1,1],[1,1,1],[1,1,1],[1,1,1],[1,1,1],[1,1,1]], type: 'uniform3fv' },
    u_opacities: { value: [0.3,0.3,0.3,0.5,0.5,0.5,0.8,0.8,0.8,1], type: 'uniform1fv' },
    u_total_size: { value: 20, type: 'uniform1f' },
    u_dot_size: { value: 4, type: 'uniform1f' },
    u_reverse: { value: 0, type: 'uniform1i' },
  }), []);

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
      float offset = dist*0.01+random(st2)*0.15;
      opacity *= step(offset,u_time*speed);
      fragColor = vec4(color,opacity);
      fragColor.rgb *= fragColor.a;
    }`;

  return (
    <Canvas style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <ShaderMesh source={source} uniforms={uniforms} />
    </Canvas>
  );
};

export default function AuthClient() {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);

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
    if (lockedUntil && Date.now() < lockedUntil) { toast.error(`Too many attempts. Try again in ${lockCountdown}s`); return; }
    setLoading(true);
    try {
      await signIn(email, password);
      toast.success('Welcome back!');
      setTimeout(() => router.push('/watchlist-price-alerts'), 1000);
    } catch (err: any) {
      const n = attempts + 1; setAttempts(n);
      if (n >= 5) setLockedUntil(Date.now() + 5 * 60 * 1000);
      toast.error(err.message || 'Login failed');
    } finally { setLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await signUp(email, password, name);
      toast.success('Account created!');
      setTimeout(() => router.push('/watchlist-price-alerts'), 1000);
    } catch (err: any) { toast.error(err.message || 'Sign up failed'); }
    finally { setLoading(false); }
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '13px 16px', borderRadius: 14,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.14)',
    color: 'white', fontSize: 14,
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    outline: 'none', transition: 'all 0.18s', boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#000', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <style>{`
        .auth-inp:focus { border-color: rgba(61,142,255,0.7) !important; background: rgba(61,142,255,0.10) !important; box-shadow: 0 0 0 3px rgba(61,142,255,0.18) !important; }
        @keyframes orb1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(80px,-60px)} }
        @keyframes orb2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-60px,80px)} }
      `}</style>
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#111', border: '1px solid #333', color: 'white', fontSize: 13 } }} />

      {/* Original WebGL dot canvas */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <DotCanvas />
        {/* Colour orbs that tint the dots — CSS so they blur correctly */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(61,142,255,0.18) 0%, transparent 65%)', top: '-10%', right: '-5%', animation: 'orb1 20s ease-in-out infinite', filter: 'blur(20px)' }} />
          <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(120,60,255,0.15) 0%, transparent 65%)', bottom: '-10%', left: '-5%', animation: 'orb2 24s ease-in-out infinite', filter: 'blur(20px)' }} />
        </div>
        {/* Edge vignettes only */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '18%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.9), transparent)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '12%', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }} />
      </div>

      {/* Glass card — uses a layered approach since WebGL can't be backdrop-filtered:
          1. An absolute blur layer behind card content
          2. Semi-transparent dark tint for readability
          3. Specular rim and gloss overlay for glass look */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 400, padding: '0 20px' }}>

        {/* Step 1: Blur layer — same position as card, blurs the WebGL canvas by cloning its area */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 32, zIndex: 0,
          backdropFilter: 'blur(32px) brightness(1.4)',
          WebkitBackdropFilter: 'blur(32px) brightness(1.4)',
          // Force a new stacking context so blur applies to everything below
          isolation: 'isolate',
        }} />

        {/* Step 2: Tint layer */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 32, zIndex: 1,
          background: 'linear-gradient(145deg, rgba(20,22,40,0.55) 0%, rgba(10,12,28,0.60) 100%)',
        }} />

        {/* Step 3: Content + specular rim */}
        <div style={{
          position: 'relative', zIndex: 2,
          borderRadius: 32,
          boxShadow: [
            'inset 0 1.5px 0 rgba(255,255,255,0.48)',
            'inset 0 -1px 0 rgba(0,0,0,0.35)',
            'inset 1px 0 0 rgba(255,255,255,0.10)',
            'inset -1px 0 0 rgba(255,255,255,0.06)',
            '0 0 0 0.5px rgba(255,255,255,0.20)',
            '0 24px 64px rgba(0,0,0,0.65)',
            '0 0 80px rgba(61,142,255,0.12)',
          ].join(', '),
          padding: '36px 28px 32px',
          overflow: 'hidden',
        }}>
          {/* Top gloss arc */}
          <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 70, background: 'radial-gradient(ellipse 80% 90% at 50% -5%, rgba(255,255,255,0.26) 0%, transparent 70%)', pointerEvents: 'none' }} />

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <Link href="/product-search-results" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
              <img src="/logo.png" alt="ShopRadar" style={{ width: 28, height: 28 }} />
              <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,0.90)', letterSpacing: '-0.02em' }}>ShopRadar</span>
            </Link>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <h1 style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 700, fontSize: 26, color: 'white', letterSpacing: '-0.025em', marginBottom: 5 }}>
                  {tab === 'login' ? 'Welcome back' : 'Create account'}
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: 13.5, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                  {tab === 'login' ? 'Sign in to your ShopRadar account' : 'Start finding better prices today'}
                </p>
              </div>

              {/* Segmented control */}
              <div style={{ display: 'flex', gap: 3, padding: 3, marginBottom: 20, background: 'rgba(0,0,0,0.35)', borderRadius: 14, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
                {(['login', 'signup'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{
                    flex: 1, padding: '9px 0', borderRadius: 11, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                    transition: 'all 0.2s',
                    color: tab === t ? 'white' : 'rgba(255,255,255,0.38)',
                    background: tab === t ? 'rgba(255,255,255,0.14)' : 'transparent',
                    boxShadow: tab === t ? 'inset 0 1px 0 rgba(255,255,255,0.28), 0 1px 6px rgba(0,0,0,0.25)' : 'none',
                  }}>
                    {t === 'login' ? 'Sign in' : 'Sign up'}
                  </button>
                ))}
              </div>

              <form onSubmit={tab === 'login' ? handleLogin : handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tab === 'signup' && (
                  <input className="auth-inp" type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required style={inp} />
                )}
                <input className="auth-inp" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required style={inp} />
                <div style={{ position: 'relative' }}>
                  <input className="auth-inp" type={showPwd ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ ...inp, paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowPwd(p => !p)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 0 }}>
                    {showPwd
                      ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M2 2l12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/></svg>
                    }
                  </button>
                </div>
                {tab === 'signup' && (
                  <input className="auth-inp" type="password" placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={inp} />
                )}
                {lockedUntil && lockCountdown > 0 && (
                  <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 12, color: '#ef4444', textAlign: 'center' }}>
                    🔒 Locked for {Math.floor(lockCountdown / 60)}:{String(lockCountdown % 60).padStart(2, '0')}
                  </div>
                )}
                <button type="submit" disabled={loading || (!!lockedUntil && Date.now() < lockedUntil)}
                  style={{
                    position: 'relative', overflow: 'hidden',
                    width: '100%', padding: '14px 0', marginTop: 4,
                    borderRadius: 16, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: 15, fontWeight: 700, color: 'white',
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                    background: 'linear-gradient(160deg, rgba(80,155,255,0.92) 0%, rgba(41,100,220,0.88) 100%)',
                    boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.42), inset 0 -1.5px 0 rgba(0,0,0,0.20), 0 8px 28px rgba(41,100,220,0.50)',
                    opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
                >
                  <span aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(180deg, rgba(255,255,255,0.20) 0%, transparent 100%)', pointerEvents: 'none' }} />
                  <span style={{ position: 'relative', zIndex: 1 }}>
                    {loading ? 'Please wait…' : tab === 'login' ? 'Sign in →' : 'Create account →'}
                  </span>
                </button>
              </form>

              {tab === 'login' && (
                <p style={{ textAlign: 'center', marginTop: 18, fontSize: 12, color: 'rgba(255,255,255,0.28)', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                  Don't have an account?{' '}
                  <button onClick={() => setTab('signup')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 600, textDecoration: 'underline' }}>Sign up</button>
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
