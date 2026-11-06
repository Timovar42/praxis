import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import { AuthNotificationBanner } from './AuthNotificationBanner';
import {
  Dumbbell,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

type AuthMode = 'login' | 'register_step1' | 'register_step2' | 'forgot_step1' | 'forgot_step2';

export const AuthScreen: React.FC = () => {
  const {
    login,
    registerStep1,
    registerStep2,
    forgotPasswordStep1,
    forgotPasswordStep2,
    resendCode,
  } = useAppStore();

  const [mode, setMode] = useState<AuthMode>('login');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Resend Countdown Timer
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const clearMessages = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const handleInsertCode = (newCode: string) => {
    setCode(newCode);
    clearMessages();
  };

  // 1. Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!email.trim() || !password) {
      setError('Заполните адрес почты и пароль.');
      return;
    }

    setLoading(true);
    const res = await login(email, password);
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Ошибка входа.');
    }
  };

  // 2. Handle Register Step 1 (Send Code)
  const handleRegisterStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!name.trim()) {
      setError('Введите имя атлета.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Введите корректный email.');
      return;
    }
    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают.');
      return;
    }

    setLoading(true);
    const res = await registerStep1(name, email, password);
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Ошибка при отправке кода подтверждения.');
    } else {
      setCode('');
      setResendCooldown(60);
      setMode('register_step2');
      setSuccessMsg(`Проверочный код отправлен на ${email.trim()}`);
    }
  };

  // 3. Handle Register Step 2 (Verify Code & Create Profile)
  const handleRegisterStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    const cleanCode = code.replace(/\s+/g, '').trim();
    if (cleanCode.length !== 6) {
      setError('Введите все 6 цифр проверочного кода.');
      return;
    }

    setLoading(true);
    const res = await registerStep2(email, cleanCode);
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Неверный код подтверждения.');
    }
  };

  // 4. Handle Forgot Password Step 1 (Send Reset Code)
  const handleForgotStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim() || !email.includes('@')) {
      setError('Введите email для восстановления пароля.');
      return;
    }

    setLoading(true);
    const res = await forgotPasswordStep1(email);
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Ошибка отправки кода сброса.');
    } else {
      setCode('');
      setPassword('');
      setConfirmPassword('');
      setResendCooldown(60);
      setMode('forgot_step2');
      setSuccessMsg(`Код сброса пароля отправлен на ${email.trim()}`);
    }
  };

  // 5. Handle Forgot Password Step 2 (Verify Code & Set New Password)
  const handleForgotStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    const cleanCode = code.replace(/\s+/g, '').trim();
    if (cleanCode.length !== 6) {
      setError('Введите 6-значный код подтверждения.');
      return;
    }
    if (password.length < 6) {
      setError('Новый пароль должен содержать не менее 6 символов.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают.');
      return;
    }

    setLoading(true);
    const res = await forgotPasswordStep2(email, cleanCode, password);
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Не удалось обновить пароль.');
    }
  };

  // Handle Resend Code
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    clearMessages();
    setLoading(true);
    const type = mode === 'register_step2' ? 'register' : 'reset';
    await resendCode(email, type);
    setLoading(false);
    setResendCooldown(60);
    setSuccessMsg(`Новый код отправлен на ${email.trim()}`);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center px-4 py-8 selection:bg-yellow-400 selection:text-black">
      {/* Toast Notification for incoming code */}
      <AuthNotificationBanner onInsertCode={handleInsertCode} />

      <div className="max-w-md w-full mx-auto">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-400 text-black mb-3 shadow-[0_0_15px_rgba(250,204,21,0.4)]">
            <Dumbbell className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-wider uppercase text-white">
            PRAXIS
          </h1>
          <p className="text-xs font-mono uppercase tracking-widest text-yellow-400 font-bold mt-1">
            Силовой дневник & периодизация
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-black border-2 border-yellow-400 rounded-none p-5 sm:p-6 shadow-[0_0_25px_rgba(250,204,21,0.2)]">
          {/* Mode Switch Tabs (Login / Register) */}
          {(mode === 'login' || mode === 'register_step1') && (
            <div className="grid grid-cols-2 gap-0 border-b-2 border-yellow-500/40 mb-5">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  clearMessages();
                }}
                className={`py-2.5 text-xs font-mono font-black uppercase tracking-wider transition-colors border-b-2 -mb-[2px] ${
                  mode === 'login'
                    ? 'border-yellow-400 text-yellow-400 bg-neutral-950'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                Вход
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register_step1');
                  clearMessages();
                }}
                className={`py-2.5 text-xs font-mono font-black uppercase tracking-wider transition-colors border-b-2 -mb-[2px] ${
                  mode === 'register_step1'
                    ? 'border-yellow-400 text-yellow-400 bg-neutral-950'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                Регистрация
              </button>
            </div>
          )}

          {/* Subheader for Step 2 or Forgot */}
          {mode === 'register_step2' && (
            <div className="mb-5 pb-3 border-b border-yellow-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-yellow-400 font-bold">
                  ШАГ 2 ИЗ 2
                </span>
                <h2 className="text-base font-black font-mono uppercase text-white">
                  Подтверждение почты
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode('register_step1');
                  clearMessages();
                }}
                className="text-neutral-400 hover:text-yellow-400 text-xs font-mono flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Назад</span>
              </button>
            </div>
          )}

          {mode === 'forgot_step1' && (
            <div className="mb-5 pb-3 border-b border-yellow-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-yellow-400 font-bold">
                  ВОССТАНОВЛЕНИЕ
                </span>
                <h2 className="text-base font-black font-mono uppercase text-white">
                  Забыли пароль?
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  clearMessages();
                }}
                className="text-neutral-400 hover:text-yellow-400 text-xs font-mono flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Ко входу</span>
              </button>
            </div>
          )}

          {mode === 'forgot_step2' && (
            <div className="mb-5 pb-3 border-b border-yellow-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-yellow-400 font-bold">
                  ШАГ 2
                </span>
                <h2 className="text-base font-black font-mono uppercase text-white">
                  Новый пароль
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode('forgot_step1');
                  clearMessages();
                }}
                className="text-neutral-400 hover:text-yellow-400 text-xs font-mono flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Назад</span>
              </button>
            </div>
          )}

          {/* Feedback Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-950/60 border border-red-500 text-red-200 text-xs font-mono flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-yellow-950/50 border border-yellow-400 text-yellow-300 text-xs font-mono flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* MODE 1: LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-neutral-300 mb-1 font-bold">
                  Электронная почта
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="atlet@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-700 focus:border-yellow-400 text-white font-mono text-sm rounded-none focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-mono uppercase text-neutral-300 font-bold">
                    Пароль
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot_step1');
                      clearMessages();
                    }}
                    className="text-[11px] font-mono text-yellow-400 hover:underline"
                  >
                    Забыли пароль?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 bg-neutral-950 border border-neutral-700 focus:border-yellow-400 text-white font-mono text-sm rounded-none focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-neutral-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-mono font-black text-xs uppercase tracking-wider rounded-none transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_12px_rgba(250,204,21,0.3)] disabled:opacity-50"
              >
                <span>{loading ? 'Вход...' : 'Войти в аккаунт'}</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </form>
          )}

          {/* MODE 2: REGISTER STEP 1 */}
          {mode === 'register_step1' && (
            <form onSubmit={handleRegisterStep1Submit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-neutral-300 mb-1 font-bold">
                  Имя атлета
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ваше имя"
                    className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-700 focus:border-yellow-400 text-white font-mono text-sm rounded-none focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-neutral-300 mb-1 font-bold">
                  Электронная почта
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="atlet@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-700 focus:border-yellow-400 text-white font-mono text-sm rounded-none focus:outline-none"
                  />
                </div>
                <span className="text-[10px] font-mono text-neutral-400 mt-1 block">
                  На эту почту будет отправлен проверочный код
                </span>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-neutral-300 mb-1 font-bold">
                  Пароль (минимум 6 символов)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 bg-neutral-950 border border-neutral-700 focus:border-yellow-400 text-white font-mono text-sm rounded-none focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-neutral-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-neutral-300 mb-1 font-bold">
                  Повторите пароль
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 bg-neutral-950 border border-neutral-700 focus:border-yellow-400 text-white font-mono text-sm rounded-none focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-neutral-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-mono font-black text-xs uppercase tracking-wider rounded-none transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_12px_rgba(250,204,21,0.3)] disabled:opacity-50"
              >
                <span>{loading ? 'Отправка...' : 'Получить код подтверждения'}</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </form>
          )}

          {/* MODE 3: REGISTER STEP 2 (CODE VERIFICATION) */}
          {mode === 'register_step2' && (
            <form onSubmit={handleRegisterStep2Submit} className="space-y-4">
              <div className="p-3 bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-300">
                Мы отправили 6-значный проверочный код на адрес:
                <div className="font-bold text-yellow-400 mt-1 break-all">{email}</div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-neutral-300 mb-1 font-bold">
                  Введите 6-значный код
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-yellow-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    maxLength={7}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="000 000"
                    autoFocus
                    className="w-full pl-9 pr-3 py-2.5 bg-neutral-950 border-2 border-yellow-400 text-yellow-400 font-mono text-lg font-black tracking-widest text-center rounded-none focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-neutral-400">Не получили код?</span>
                {resendCooldown > 0 ? (
                  <span className="text-neutral-500 font-mono">
                    Повтор через {resendCooldown}с
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className="text-yellow-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Отправить повторно</span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-mono font-black text-xs uppercase tracking-wider rounded-none transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_12px_rgba(250,204,21,0.3)] disabled:opacity-50"
              >
                <span>{loading ? 'Проверка...' : 'Подтвердить и создать профиль'}</span>
                <CheckCircle2 className="w-4 h-4 stroke-[3]" />
              </button>
            </form>
          )}

          {/* MODE 4: FORGOT PASSWORD STEP 1 */}
          {mode === 'forgot_step1' && (
            <form onSubmit={handleForgotStep1Submit} className="space-y-4">
              <p className="text-xs font-mono text-neutral-300">
                Введите почту, привязанную к вашему профилю. Мы вышлем 6-значный проверочный код для установки нового пароля.
              </p>

              <div>
                <label className="block text-xs font-mono uppercase text-neutral-300 mb-1 font-bold">
                  Электронная почта
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="atlet@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-700 focus:border-yellow-400 text-white font-mono text-sm rounded-none focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-mono font-black text-xs uppercase tracking-wider rounded-none transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_12px_rgba(250,204,21,0.3)] disabled:opacity-50"
              >
                <span>{loading ? 'Отправка...' : 'Отправить код сброса'}</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </form>
          )}

          {/* MODE 5: FORGOT PASSWORD STEP 2 */}
          {mode === 'forgot_step2' && (
            <form onSubmit={handleForgotStep2Submit} className="space-y-4">
              <div className="p-3 bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-300">
                Введите 6-значный код, отправленный на <span className="text-yellow-400 font-bold">{email}</span>, и задайте новый пароль:
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-neutral-300 mb-1 font-bold">
                  Проверочный код
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-yellow-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    maxLength={7}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="000 000"
                    autoFocus
                    className="w-full pl-9 pr-3 py-2.5 bg-neutral-950 border-2 border-yellow-400 text-yellow-400 font-mono text-lg font-black tracking-widest text-center rounded-none focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-neutral-300 mb-1 font-bold">
                  Новый пароль (минимум 6 символов)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 bg-neutral-950 border border-neutral-700 focus:border-yellow-400 text-white font-mono text-sm rounded-none focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-neutral-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-neutral-300 mb-1 font-bold">
                  Повторите новый пароль
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 bg-neutral-950 border border-neutral-700 focus:border-yellow-400 text-white font-mono text-sm rounded-none focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-neutral-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-neutral-400">Не пришёл код?</span>
                {resendCooldown > 0 ? (
                  <span className="text-neutral-500 font-mono">Повтор через {resendCooldown}с</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className="text-yellow-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Отправить повторно</span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-mono font-black text-xs uppercase tracking-wider rounded-none transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_12px_rgba(250,204,21,0.3)] disabled:opacity-50"
              >
                <span>{loading ? 'Сохранение...' : 'Установить пароль и войти'}</span>
                <CheckCircle2 className="w-4 h-4 stroke-[3]" />
              </button>
            </form>
          )}

          {/* Quick Demo Credentials Info */}
          <div className="mt-6 pt-4 border-t border-neutral-800 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-neutral-400">
              <Sparkles className="w-3 h-3 text-yellow-400" />
              <span>Каждому атлету создаётся изолированный тренировочный план</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
