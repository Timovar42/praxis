import React, { useState, useEffect } from 'react';
import { Mail, Copy, Check, X, Sparkles } from 'lucide-react';

interface AuthCodeEventDetail {
  email: string;
  code: string;
  type: 'register' | 'reset';
  expiresAt: number;
}

interface AuthNotificationBannerProps {
  onInsertCode?: (code: string) => void;
}

export const AuthNotificationBanner: React.FC<AuthNotificationBannerProps> = ({
  onInsertCode,
}) => {
  const [notification, setNotification] = useState<AuthCodeEventDetail | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<AuthCodeEventDetail>;
      if (custom.detail) {
        setNotification(custom.detail);
        setCopied(false);
      }
    };

    window.addEventListener('praxis:auth-code', handler);
    return () => window.removeEventListener('praxis:auth-code', handler);
  }, []);

  if (!notification) return null;

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(notification.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
    if (onInsertCode) {
      onInsertCode(notification.code);
    }
  };

  return (
    <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 z-50 sm:max-w-md animate-in slide-in-from-top-4 duration-200">
      <div className="bg-neutral-950 border-2 border-yellow-400 p-4 shadow-[0_0_25px_rgba(250,204,21,0.35)] rounded-none">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-yellow-400 text-black flex items-center justify-center font-black">
              <Mail className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-yellow-400 uppercase tracking-widest block">
                ПОЧТОВЫЙ СЕРВЕР PRAXIS
              </span>
              <span className="text-xs font-mono font-black text-white uppercase">
                {notification.type === 'register'
                  ? 'Код подтверждения регистрации'
                  : 'Код сброса пароля'}
              </span>
            </div>
          </div>

          <button
            onClick={() => setNotification(null)}
            className="text-neutral-400 hover:text-white p-1"
            title="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] font-mono text-neutral-300 mb-3">
          Письмо отправлено на: <strong className="text-yellow-400">{notification.email}</strong>
        </p>

        <div className="bg-black border border-yellow-400/50 p-2.5 flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-[9px] font-mono uppercase text-neutral-400">Ваш 6-значный код</span>
            <span className="text-xl font-mono font-black text-yellow-400 tracking-widest">
              {notification.code.slice(0, 3)} {notification.code.slice(3)}
            </span>
          </div>

          <button
            onClick={handleCopy}
            className="px-3 py-2 bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 shadow"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Скопировано!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Вставить код</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-2 text-[10px] font-mono text-neutral-400 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-yellow-400 shrink-0" />
          <span>Код действителен 10 минут. Для безопасности не передавайте его третьим лицам.</span>
        </div>
      </div>
    </div>
  );
};
