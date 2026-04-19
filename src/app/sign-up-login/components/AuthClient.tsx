'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

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
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 5) { setLockedUntil(Date.now() + 5 * 60 * 1000); }
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
    } catch (err: any) {
      toast.error(err.message || 'Sign up failed');
    } finally { setLoading(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 16px', borderRadius: 14,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.14)',
    color: 'white', fontSize: 14,
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    outline: 'none', transition: 'all 0.18s', boxSizing: 'border-box',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
  };

  return (
    <>
      <style>{`
        @keyframes drift1 { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(60px,-40px) scale(1.15); } 66% { transform: translate(-30px,50px) scale(0.92); } }
        @keyframes drift2 { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(-70px,30px) scale(1.1); } 66% { transform: translate(40px,-60px) scale(1.2); } }
        @keyframes drift3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(50px,70px) scale(0.88); } }
        .auth-input:focus { border-color: rgba(61,142,255,0.7) !important; background: rgba(61,142,255,0.10) !important; box-shadow: 0 0 0 3px rgba(61,142,255,0.18) !important; }
      `}</style>

      <Toaster position="bottom-right" toastOptions={{ style: { background: '#111', border: '1px solid #333', color: 'white', fontSize: 13 } }} />

      {/* Background: pure CSS orbs — backdrop-filter CAN blur these */}
      <div style={{ minHeight: '100vh', background: '#050508', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>

        {/* Animated colour orbs */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(61,142,255,0.28) 0%, transparent 70%)', top: '10%', left: '15%', animation: 'drift1 18s ease-in-out infinite', filter: 'blur(40px)' }} />
          <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(120,80,255,0.22) 0%, transparent 70%)', bottom: '15%', right: '10%', animation: 'drift2 22s ease-in-out infinite', filter: 'blur(50px)' }} />
          <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,180,255,0.18) 0%, transparent 70%)', top: '50%', right: '30%', animation: 'drift3 16s ease-in-out infinite', filter: 'blur(35px)' }} />
          {/* Dot grid — CSS only, blurs correctly */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.55) 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
            opacity: 1,
          }} />
        </div>

        {/* Glass card — backdrop-filter now works on CSS background above */}
        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 400, padding: '0 20px' }}>
          <div style={{
            borderRadius: 32,
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(48px) saturate(180%) brightness(1.1)',
            WebkitBackdropFilter: 'blur(48px) saturate(180%) brightness(1.1)',
            boxShadow: [
              'inset 0 1.5px 0 rgba(255,255,255,0.50)',
              'inset 0 -1px 0 rgba(0,0,0,0.3)',
              '0 0 0 0.5px rgba(255,255,255,0.20)',
              '0 24px 64px rgba(0,0,0,0.55)',
              '0 0 80px rgba(61,142,255,0.10)',
            ].join(', '),
            padding: '36px 28px 32px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Top gloss arc */}
            <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80, background: 'radial-gradient(ellipse 80% 100% at 50% -10%, rgba(255,255,255,0.28) 0%, transparent 70%)', pointerEvents: 'none' }} />

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
                <div style={{ display: 'flex', gap: 3, padding: 3, marginBottom: 20, background: 'rgba(0,0,0,0.30)', borderRadius: 14, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)' }}>
                  {(['login', 'signup'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{
                      flex: 1, padding: '9px 0', borderRadius: 11, border: 'none', cursor: 'pointer',
                      fontSize: 13, fontWeight: 600, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                      transition: 'all 0.2s',
                      color: tab === t ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.38)',
                      background: tab === t ? 'rgba(255,255,255,0.16)' : 'transparent',
                      backdropFilter: tab === t ? 'blur(16px)' : 'none',
                      WebkitBackdropFilter: tab === t ? 'blur(16px)' : 'none',
                      boxShadow: tab === t ? 'inset 0 1px 0 rgba(255,255,255,0.30), 0 1px 6px rgba(0,0,0,0.2)' : 'none',
                    }}>
                      {t === 'login' ? 'Sign in' : 'Sign up'}
                    </button>
                  ))}
                </div>

                <form onSubmit={tab === 'login' ? handleLogin : handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {tab === 'signup' && (
                    <input className="auth-input" type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required style={inputStyle} />
                  )}
                  <input className="auth-input" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
                  <div style={{ position: 'relative' }}>
                    <input className="auth-input" type={showPwd ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ ...inputStyle, paddingRight: 44 }} />
                    <button type="button" onClick={() => setShowPwd(p => !p)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 0 }}>
                      {showPwd
                        ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M2 2l12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                        : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/></svg>
                      }
                    </button>
                  </div>
                  {tab === 'signup' && (
                    <input className="auth-input" type="password" placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={inputStyle} />
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
                      background: 'linear-gradient(160deg, rgba(80,155,255,0.90) 0%, rgba(41,100,220,0.85) 100%)',
                      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
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
    </>
  );
}
