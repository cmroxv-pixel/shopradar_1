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
    u_opacities: { value: [0.3,0.3,0.3,0.5,0.5,0.5,0.8,0.8,0.8,1], type: 'uniform1fv' },
    u_total_size: { value: 20, type: 'uniform1f' },
    u_dot_size: { value: 4, type: 'uniform1f' },
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

      {/* Dot canvas background */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {!reverseCanvas && <DotCanvas reverse={false} />}
        {reverseCanvas && <DotCanvas reverse={true} />}
        {/* Radial fade from center */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, rgba(0,0,0,0.85) 0%, transparent 70%)' }} />
        {/* Top + bottom fades */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '30%', background: 'linear-gradient(to bottom, black, transparent)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '20%', background: 'linear-gradient(to top, black, transparent)' }} />
      </div>

      {/* iOS 26 style: floating glass card, no hard background */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 400, padding: '0 20px' }}>

        {/* Glass card — refracts dots behind it */}
        <div style={{
          position: 'relative',
          borderRadius: 32,
          overflow: 'hidden',
          // Multi-stop glass body
          background: 'linear-gradient(160deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.05) 40%, rgba(255,255,255,0.09) 100%)',
          backdropFilter: 'blur(48px) saturate(200%) brightness(1.06)',
          WebkitBackdropFilter: 'blur(48px) saturate(200%) brightness(1.06)',
          border: '1px solid rgba(255,255,255,0.0)',
          boxShadow: [
            'inset 0 2px 0 rgba(255,255,255,0.42)',     // bright top specular
            'inset 0 -1.5px 0 rgba(0,0,0,0.22)',        // dark bottom
            'inset 1px 0 0 rgba(255,255,255,0.18)',      // left rim
            'inset -1px 0 0 rgba(255,255,255,0.10)',     // right rim
            '0 32px 80px rgba(0,0,0,0.55)',              // deep drop shadow
            '0 0 0 0.5px rgba(255,255,255,0.18)',        // outer definition
            '0 0 60px rgba(61,142,255,0.06)',            // faint blue ambient
          ].join(', '),
          padding: '40px 32px 36px',
        }}>
          {/* Top gloss arc — real glass has a curved bright reflection at top */}
          <div aria-hidden style={{
            position: 'absolute', top: 0, left: '10%', right: '10%', height: 60,
            background: 'radial-gradient(ellipse 80% 100% at 50% -10%, rgba(255,255,255,0.32) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <a href="/product-search-results" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
              <img src="/logo.png" alt="ShopRadar" style={{ width: 28, height: 28 }} />
              <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,0.88)', letterSpacing: '-0.02em' }}>ShopRadar</span>
            </a>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>

              {/* Headline */}
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <h1 style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 700, fontSize: 28, color: 'white', letterSpacing: '-0.03em', marginBottom: 6, lineHeight: 1.1 }}>
                  {tab === 'login' ? 'Welcome back' : 'Create account'}
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: 14, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", lineHeight: 1.5 }}>
                  {tab === 'login' ? 'Sign in to your ShopRadar account' : 'Start finding better prices today'}
                </p>
              </div>

              {/* Tab pill — iOS 26 segmented control style */}
              <div style={{
                display: 'flex', gap: 3, padding: 4, marginBottom: 22,
                background: 'rgba(255,255,255,0.07)',
                borderRadius: 16,
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.25), inset 0 0 0 0.5px rgba(255,255,255,0.10)',
              }}>
                {(['login', 'signup'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{
                    flex: 1, padding: '9px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600,
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                    transition: 'all 0.22s cubic-bezier(0.25,0.46,0.45,0.94)',
                    color: tab === t ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.38)',
                    background: tab === t
                      ? 'linear-gradient(160deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.07) 100%)'
                      : 'transparent',
                    backdropFilter: tab === t ? 'blur(12px)' : 'none',
                    WebkitBackdropFilter: tab === t ? 'blur(12px)' : 'none',
                    boxShadow: tab === t
                      ? 'inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.15), 0 2px 10px rgba(0,0,0,0.2)'
                      : 'none',
                  }}>
                    {t === 'login' ? 'Sign in' : 'Sign up'}
                  </button>
                ))}
              </div>

              {/* Form */}
              <form onSubmit={tab === 'login' ? handleLogin : handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tab === 'signup' && (
                  <input type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required
                    style={inputStyle}
                    onFocus={e => Object.assign((e.target as HTMLElement).style, inputFocus)}
                    onBlur={e => Object.assign((e.target as HTMLElement).style, inputBlur)}
                  />
                )}
                <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required
                  style={inputStyle}
                  onFocus={e => Object.assign((e.target as HTMLElement).style, inputFocus)}
                  onBlur={e => Object.assign((e.target as HTMLElement).style, inputBlur)}
                />
                <div style={{ position: 'relative' }}>
                  <input type={showPwd ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
                    style={{ ...inputStyle, paddingRight: 44 }}
                    onFocus={e => Object.assign((e.target as HTMLElement).style, inputFocus)}
                    onBlur={e => Object.assign((e.target as HTMLElement).style, inputBlur)}
                  />
                  <button type="button" onClick={() => setShowPwd(p => !p)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 0 }}>
                    {showPwd ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M2 2l12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/></svg>
                    )}
                  </button>
                </div>
                {tab === 'signup' && (
                  <input type="password" placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                    style={inputStyle}
                    onFocus={e => Object.assign((e.target as HTMLElement).style, inputFocus)}
                    onBlur={e => Object.assign((e.target as HTMLElement).style, inputBlur)}
                  />
                )}

                {lockedUntil && lockCountdown > 0 && (
                  <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 12, color: '#ef4444', textAlign: 'center' }}>
                    🔒 Locked for {Math.floor(lockCountdown / 60)}:{String(lockCountdown % 60).padStart(2, '0')}
                  </div>
                )}

                {/* Submit — full-width liquid glass with blue tint */}
                <button type="submit" disabled={loading || (!!lockedUntil && Date.now() < lockedUntil)}
                  style={{
                    position: 'relative', overflow: 'hidden',
                    width: '100%', padding: '14px 0', marginTop: 6,
                    borderRadius: 16, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: 15, fontWeight: 700,
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                    letterSpacing: '-0.01em',
                    color: 'white',
                    background: 'linear-gradient(160deg, rgba(61,142,255,0.70) 0%, rgba(41,100,220,0.60) 100%)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    boxShadow: [
                      'inset 0 1.5px 0 rgba(255,255,255,0.45)',
                      'inset 0 -1.5px 0 rgba(0,0,0,0.20)',
                      '0 8px 28px rgba(41,100,220,0.40)',
                      '0 2px 8px rgba(0,0,0,0.20)',
                    ].join(', '),
                    transition: 'all 0.2s',
                    opacity: loading ? 0.7 : 1,
                  }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.12)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
                >
                  {/* Top gloss */}
                  <span aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 100%)', borderRadius: '16px 16px 0 0', pointerEvents: 'none' }} />
                  <span style={{ position: 'relative', zIndex: 1 }}>
                    {loading ? 'Please wait…' : tab === 'login' ? 'Sign in →' : 'Create account →'}
                  </span>
                </button>
              </form>

              {tab === 'login' && (
                <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.28)', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
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
  );
};

const DotCanvas = ({ reverse = false }: { reverse?: boolean }) => {
  const uniforms = useMemo(() => ({
    u_colors: {
      value: [[1,1,1],[1,1,1],[1,1,1],[1,1,1],[1,1,1],[1,1,1]],
      type: 'uniform3fv',
    },
    u_opacities: { value: [0.3,0.3,0.3,0.5,0.5,0.5,0.8,0.8,0.8,1], type: 'uniform1fv' },
    u_total_size: { value: 20, type: 'uniform1f' },
    u_dot_size: { value: 4, type: 'uniform1f' },
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

      {/* Dot canvas background */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {!reverseCanvas && <DotCanvas reverse={false} />}
        {reverseCanvas && <DotCanvas reverse={true} />}
        {/* Radial fade from center */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, rgba(0,0,0,0.85) 0%, transparent 70%)' }} />
        {/* Top + bottom fades */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '30%', background: 'linear-gradient(to bottom, black, transparent)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '20%', background: 'linear-gradient(to top, black, transparent)' }} />
      </div>

      {/* Card */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 420, padding: '0 20px' }}>

        {/* Glass card */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
          backdropFilter: 'blur(40px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
          borderRadius: 28,
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 32px 80px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.06)',
          padding: '36px 32px 32px',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Top gloss sheen */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%)', borderRadius: '28px 28px 0 0', pointerEvents: 'none' }} />

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <Link href="/product-search-results" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
              <img src="/logo.png" alt="ShopRadar" style={{ width: 30, height: 30, display: 'block' }} />
              <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 700, fontSize: 16, color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.02em' }}>ShopRadar</span>
            </Link>
          </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
          >
            {/* Headline */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <h1 style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 700, fontSize: 26, color: 'white', letterSpacing: '-0.025em', marginBottom: 5, lineHeight: 1.15 }}>
                {tab === 'login' ? 'Welcome back' : 'Create account'}
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                {tab === 'login' ? 'Sign in to your ShopRadar account' : 'Start finding better prices today'}
              </p>
            </div>

            {/* Tab switcher — pill style */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 4, marginBottom: 20, border: '1px solid rgba(255,255,255,0.1)' }}>
              {(['login', 'signup'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 10, border: 'none',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                    transition: 'all 0.18s',
                    background: tab === t
                      ? 'linear-gradient(145deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)'
                      : 'transparent',
                    color: tab === t ? 'white' : 'rgba(255,255,255,0.4)',
                    boxShadow: tab === t
                      ? 'inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.15)'
                      : 'none',
                    backdropFilter: tab === t ? 'blur(8px)' : 'none',
                  }}
                >
                  {t === 'login' ? 'Sign in' : 'Sign up'}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={tab === 'login' ? handleLogin : handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tab === 'signup' && (
                <input
                  type="text" placeholder="Full name" value={name}
                  onChange={e => setName(e.target.value)} required
                  style={{ width: '100%', padding: '13px 16px', borderRadius: 13, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: 14, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", outline: 'none', transition: 'all 0.18s', boxSizing: 'border-box', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(61,142,255,0.6)'; (e.target as HTMLInputElement).style.background = 'rgba(61,142,255,0.08)'; (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(61,142,255,0.12)'; }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.12)'; (e.target as HTMLInputElement).style.background = 'rgba(255,255,255,0.07)'; (e.target as HTMLInputElement).style.boxShadow = 'none'; }}
                />
              )}
              <input
                type="email" placeholder="Email address" value={email}
                onChange={e => setEmail(e.target.value)} required
                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 14, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", outline: 'none', transition: 'border 0.15s' }}
                onFocus={e => (e.target.style.borderColor = 'rgba(255,255,255,0.3)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'} placeholder="Password" value={password}
                  onChange={e => setPassword(e.target.value)} required
                  style={{ width: '100%', padding: '13px 44px 13px 16px', borderRadius: 13, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: 14, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", outline: 'none', transition: 'all 0.18s', boxSizing: 'border-box', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(61,142,255,0.6)'; (e.target as HTMLInputElement).style.background = 'rgba(61,142,255,0.08)'; (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(61,142,255,0.12)'; }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.12)'; (e.target as HTMLInputElement).style.background = 'rgba(255,255,255,0.07)'; (e.target as HTMLInputElement).style.boxShadow = 'none'; }}
                />
                <button type="button" onClick={() => setShowPwd(p => !p)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}>
                  {showPwd ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M2 2l12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/></svg>
                  )}
                </button>
              </div>
              {tab === 'signup' && (
                <input
                  type="password" placeholder="Confirm password" value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)} required
                  style={{ width: '100%', padding: '13px 16px', borderRadius: 13, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: 14, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", outline: 'none', transition: 'all 0.18s', boxSizing: 'border-box', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(61,142,255,0.6)'; (e.target as HTMLInputElement).style.background = 'rgba(61,142,255,0.08)'; (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(61,142,255,0.12)'; }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.12)'; (e.target as HTMLInputElement).style.background = 'rgba(255,255,255,0.07)'; (e.target as HTMLInputElement).style.boxShadow = 'none'; }}
                />
              )}

              {lockedUntil && lockCountdown > 0 && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', marginBottom: 12, fontSize: 12, color: '#ef4444', textAlign: 'center' }}>
                  🔒 Too many attempts — locked for {Math.floor(lockCountdown / 60)}:{String(lockCountdown % 60).padStart(2, '0')}
                </div>
              )}
              <LiquidButton
                type="submit"
                size="lg"
                disabled={loading || (!!lockedUntil && Date.now() < lockedUntil)}
                style={{
                  width: '100%',
                  marginTop: 6,
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  color: 'white',
                  background: 'linear-gradient(135deg, rgba(61,142,255,0.55) 0%, rgba(61,142,255,0.25) 100%)',
                  border: '1px solid rgba(61,142,255,0.5)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 0 20px rgba(61,142,255,0.2)',
                }}
              >
                {loading ? 'Please wait…' : tab === 'login' ? 'Sign in →' : 'Create account →'}
              </LiquidButton>
            </form>

            {tab === 'login' && (
              <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                Don't have an account?{' '}
                <button onClick={() => setTab('signup')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, textDecoration: 'underline' }}>
                  Sign up
                </button>
              </p>
            )}
          </motion.div>
        </AnimatePresence>
        </div> {/* end glass card */}
      </div>
    </div>
  );
}
