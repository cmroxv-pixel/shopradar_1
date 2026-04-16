'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Toaster, toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { Eye, EyeOff, Loader2, Bell, Bookmark, Search, Globe, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import posthog from 'posthog-js';

type Tab = 'login' | 'signup';

interface LoginForm {
  email: string;
  password: string;
  remember: boolean;
}

interface SignupForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
}

function LoginForm() {
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ defaultValues: { remember: false } });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      await signIn(data.email, data.password);
      posthog.identify(data.email, { email: data.email });
      posthog.capture('user_logged_in', { email: data.email });
      toast.success('Welcome back! Redirecting...');
      router.push('/watchlist-price-alerts');
      router.refresh();
    } catch (err: any) {
      posthog.captureException(err);
      toast.error(err?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Google OAuth */}
      <button
        type="button"
        onClick={() => toast.info('Google OAuth — connect Supabase Auth provider')}
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-all duration-150 active:scale-95"
      >
        <Globe size={16} className="text-muted-foreground" />
        Continue with Google
      </button>

      <div className="flex items-center gap-3">
        <hr className="flex-1 border-border" />
        <span className="text-xs text-muted-foreground">or sign in with email</span>
        <hr className="flex-1 border-border" />
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Email address</label>
        <input
          type="email"
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /^\S+@\S+$/i, message: 'Enter a valid email' },
          })}
          placeholder="maya@example.com"
          className={`w-full px-3 py-2.5 bg-muted/50 border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150 ${errors.email ? 'border-destructive' : 'border-border'}`}
        />
        {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
      </div>

      {/* Password */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-foreground">Password</label>
          <button type="button" className="text-xs text-primary hover:underline">
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <input
            type={showPwd ? 'text' : 'password'}
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 6, message: 'At least 6 characters' },
            })}
            placeholder="••••••••"
            className={`w-full px-3 py-2.5 pr-10 bg-muted/50 border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150 ${errors.password ? 'border-destructive' : 'border-border'}`}
          />
          <button
            type="button"
            onClick={() => setShowPwd(!showPwd)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      {/* Remember me */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          {...register('remember')}
          className="w-4 h-4 rounded border-border accent-primary"
        />
        <span className="text-sm text-muted-foreground">Remember me for 30 days</span>
      </label>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all duration-150"
      >
        {loading ? (
          <>
            <Loader2 size={15} className="animate-spin" /> Signing in...
          </>
        ) : (
          'Sign in'
        )}
      </button>
    </form>
  );
}

function SignupForm() {
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupForm>();
  const pwd = watch('password', '');

  const onSubmit = async (data: SignupForm) => {
    setLoading(true);
    try {
      await signUp(data.email, data.password, { fullName: data.name });
      posthog.identify(data.email, { email: data.email, name: data.name });
      posthog.capture('user_signed_up', { email: data.email, name: data.name });
      toast.success('Account created! Signing you in...');
      router.push('/watchlist-price-alerts');
      router.refresh();
    } catch (err: any) {
      posthog.captureException(err);
      toast.error(err?.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = (p: string) => {
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };

  const strength = passwordStrength(pwd);
  const strengthColors = ['', 'bg-destructive', 'bg-warning', 'bg-accent', 'bg-success'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Google OAuth */}
      <button
        type="button"
        onClick={() => toast.info('Google OAuth — connect Supabase Auth provider')}
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-all duration-150 active:scale-95"
      >
        <Globe size={16} className="text-muted-foreground" />
        Sign up with Google
      </button>

      <div className="flex items-center gap-3">
        <hr className="flex-1 border-border" />
        <span className="text-xs text-muted-foreground">or create with email</span>
        <hr className="flex-1 border-border" />
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Full name</label>
        <input
          type="text"
          {...register('name', { required: 'Name is required' })}
          placeholder="Maya Chen"
          className={`w-full px-3 py-2.5 bg-muted/50 border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150 ${errors.name ? 'border-destructive' : 'border-border'}`}
        />
        {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Email address</label>
        <input
          type="email"
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /^\S+@\S+$/i, message: 'Enter a valid email' },
          })}
          placeholder="maya@example.com"
          className={`w-full px-3 py-2.5 bg-muted/50 border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150 ${errors.email ? 'border-destructive' : 'border-border'}`}
        />
        {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
        <p className="text-xs text-muted-foreground mb-1.5">
          At least 8 characters with a number and symbol
        </p>
        <div className="relative">
          <input
            type={showPwd ? 'text' : 'password'}
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'At least 8 characters required' },
            })}
            placeholder="••••••••"
            className={`w-full px-3 py-2.5 pr-10 bg-muted/50 border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150 ${errors.password ? 'border-destructive' : 'border-border'}`}
          />
          <button
            type="button"
            onClick={() => setShowPwd(!showPwd)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
        )}
        {pwd && (
          <div className="mt-2">
            <div className="flex gap-1 mb-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={`strength-bar-${i}`}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColors[strength] : 'bg-muted'}`}
                />
              ))}
            </div>
            <p
              className={`text-xs ${strength >= 3 ? 'text-success' : strength === 2 ? 'text-warning' : 'text-destructive'}`}
            >
              {strengthLabels[strength]}
            </p>
          </div>
        )}
      </div>

      {/* Confirm password */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Confirm password</label>
        <div className="relative">
          <input
            type={showConfirm ? 'text' : 'password'}
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (v) => v === pwd || 'Passwords do not match',
            })}
            placeholder="••••••••"
            className={`w-full px-3 py-2.5 pr-10 bg-muted/50 border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150 ${errors.confirmPassword ? 'border-destructive' : 'border-border'}`}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="mt-1 text-xs text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      {/* Terms */}
      <div>
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('terms', { required: 'You must accept the terms' })}
            className="mt-0.5 w-4 h-4 rounded border-border accent-primary"
          />
          <span className="text-sm text-muted-foreground">
            I agree to the{' '}
            <a href="#" className="text-primary hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-primary hover:underline">
              Privacy Policy
            </a>
          </span>
        </label>
        {errors.terms && <p className="mt-1 text-xs text-destructive">{errors.terms.message}</p>}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all duration-150"
      >
        {loading ? (
          <>
            <Loader2 size={15} className="animate-spin" /> Creating account...
          </>
        ) : (
          'Create free account'
        )}
      </button>
    </form>
  );
}

const BENEFITS = [
  {
    icon: Bell,
    label: 'Price Drop Alerts',
    desc: 'Get emailed the moment a product hits your target price',
  },
  {
    icon: Bookmark,
    label: 'Saved Watchlists',
    desc: 'Track products across marketplaces from one place',
  },
  {
    icon: Search,
    label: 'Search History',
    desc: 'Pick up where you left off — your recent searches saved',
  },
  {
    icon: Globe,
    label: '40+ Marketplaces',
    desc: 'Amazon, eBay, Currys, JB Hi-Fi, boutique stores & more',
  },
  {
    icon: ShieldCheck,
    label: 'In-Stock Only',
    desc: 'Only see listings confirmed in stock — no phantom results',
  },
];

export default function AuthClient() {
  const [tab, setTab] = useState<Tab>('login');

  return (
    <div className="min-h-screen bg-background flex">
      <Toaster position="bottom-right" richColors />

      {/* Left panel — brand & benefits */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full border-2 border-white" />
          <div className="absolute top-1/3 left-1/3 w-96 h-96 rounded-full border border-white" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full border-2 border-white" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <AppLogo size={44} />
            <span className="text-2xl font-bold text-white">ShopRadar</span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-snug mb-4">
            Find any product.
            <br />
            Best price, fastest delivery.
          </h2>
          <p className="text-white/70 text-lg">
            Sign in to save your searches, set price alerts, and never miss a deal across 40+ global
            marketplaces.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {BENEFITS.map((b) => (
            <div key={`benefit-${b.label}`} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                <b.icon size={16} className="text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{b.label}</p>
                <p className="text-white/60 text-xs">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <AppLogo size={36} />
            <span className="text-xl font-bold text-foreground">ShopRadar</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-foreground">
              {tab === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {tab === 'login'
                ? 'Sign in to access your watchlists and price alerts'
                : 'Start tracking deals across 40+ global marketplaces — free forever'}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex bg-muted rounded-xl p-1 mb-6">
            {(['login', 'signup'] as Tab[]).map((t) => (
              <button
                key={`tab-${t}`}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {t === 'login' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>

          {tab === 'login' ? <LoginForm /> : <SignupForm />}

          <p className="text-center text-xs text-muted-foreground mt-6">
            {tab === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => setTab('signup')}
                  className="text-primary hover:underline font-medium"
                >
                  Create one free
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => setTab('login')}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </button>
              </>
            )}
          </p>

          <p className="text-center text-xs text-muted-foreground mt-4">
            <Link
              href="/product-search-results"
              className="text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Continue without an account →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
