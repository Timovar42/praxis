import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store';
import { X, LogIn, UserPlus, Check, ArrowRight } from 'lucide-react';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, users, switchUser, loginWithGoogle, settings, saveSettings } = useAppStore();

  const [googleEmail, setGoogleEmail] = useState('');
  const [athleteName, setAthleteName] = useState('');
  const [googleClientId, setGoogleClientId] = useState(settings?.googleClientId ?? '');
  const [showConfigClientId, setShowConfigClientId] = useState(false);
  const [clientIdSaved, setClientIdSaved] = useState(false);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  // Initialize official Google Identity Services (GIS) if script and client ID are present
  useEffect(() => {
    if (!isOpen) return;

    const clientId = googleClientId || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
    const google = (window as any).google;

    if (clientId && google?.accounts?.id && googleBtnContainerRef.current) {
      try {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: any) => {
            if (response.credential) {
              try {
                // Decode JWT
                const base64Url = response.credential.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(
                  atob(base64)
                    .split('')
                    .map((c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
                );
                const data = JSON.parse(jsonPayload);
                loginWithGoogle({
                  email: data.email,
                  name: data.name,
                  picture: data.picture,
                  id: data.sub,
                });
                onClose();
              } catch (err) {
                console.error('Failed to parse Google JWT:', err);
              }
            }
          },
        });

        google.accounts.id.renderButton(googleBtnContainerRef.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'rectangular',
          text: 'continue_with',
          width: 280,
        });
      } catch (err) {
        console.warn('Google Identity Services init error:', err);
      }
    }
  }, [isOpen, googleClientId, loginWithGoogle, onClose]);

  if (!isOpen) return null;

  const handleManualGoogleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail.trim()) return;

    let email = googleEmail.trim();
    if (!email.includes('@')) {
      email = `${email}@gmail.com`;
    }

    await loginWithGoogle({
      email,
      name: athleteName.trim() || email.split('@')[0],
    });

    setGoogleEmail('');
    setAthleteName('');
    onClose();
  };

  const handleSaveClientId = async () => {
    if (!settings) return;
    await saveSettings({
      ...settings,
      googleClientId: googleClientId.trim(),
    });
    setClientIdSaved(true);
    setTimeout(() => setClientIdSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-end sm:justify-center p-0 sm:p-4">
      <div className="bg-black border-2 border-yellow-400 w-full max-w-lg mx-auto max-h-[92vh] flex flex-col shadow-[0_0_25px_rgba(250,204,21,0.3)]">
        {/* Modal Header */}
        <div className="p-4 border-b-2 border-yellow-400 flex items-center justify-between bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-yellow-400 text-black flex items-center justify-center font-black">
              <LogIn className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-mono font-black text-white uppercase tracking-wider text-base">
                Вход / Аккаунты Google
              </h2>
              <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
                Разделение планов и данных атлетов
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 border border-neutral-700 hover:border-yellow-400 text-neutral-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-5">
          {/* Official Google GIS Button Container if active */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <div ref={googleBtnContainerRef} className="min-h-[44px] flex items-center justify-center" />
          </div>

          {/* Direct Google Account Login Form */}
          <form onSubmit={handleManualGoogleLogin} className="bg-neutral-950 border border-neutral-800 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-black text-yellow-400 uppercase tracking-wider">
              <UserPlus className="w-4 h-4" />
              <span>Войти или зарегистрироваться</span>
            </div>
            <p className="text-[11px] font-mono text-neutral-400">
              Укажите Google-аккаунт. Если аккаунт новый, откроется анкета создания профиля и для вас создастся
              свой персональный тренировочный план.
            </p>

            <div>
              <label className="block text-[10px] font-mono uppercase text-neutral-400 font-bold mb-1">
                Google Email
              </label>
              <input
                type="text"
                placeholder="athlete@gmail.com"
                required
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                className="w-full h-11 px-3 bg-black border border-neutral-700 focus:border-yellow-400 text-white font-mono text-xs rounded-none focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-neutral-400 font-bold mb-1">
                Имя атлета (необязательно)
              </label>
              <input
                type="text"
                placeholder="Например: Иван"
                value={athleteName}
                onChange={(e) => setAthleteName(e.target.value)}
                className="w-full h-11 px-3 bg-black border border-neutral-700 focus:border-yellow-400 text-white font-mono text-xs rounded-none focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-mono font-black uppercase tracking-wider text-xs rounded-none border border-yellow-400 flex items-center justify-center gap-1.5 transition-all shadow active:scale-98"
            >
              <span>Войти под этим Google аккаунтом</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>

          {/* List of Saved Profiles / Accounts on this device */}
          {users.length > 0 && (
            <div className="space-y-2">
              <label className="block text-[11px] font-mono font-bold text-yellow-400 uppercase tracking-wider">
                Сохранённые профили на устройстве ({users.length}):
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {users.map((u) => {
                  const isActive = currentUser?.id === u.id;
                  return (
                    <div
                      key={u.id}
                      onClick={() => {
                        switchUser(u.id);
                        onClose();
                      }}
                      className={`p-2.5 border rounded-none cursor-pointer flex items-center justify-between transition-all ${
                        isActive
                          ? 'bg-neutral-900 border-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.2)]'
                          : 'bg-black border-neutral-800 hover:border-neutral-700 hover:bg-neutral-950'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {u.picture ? (
                          <img src={u.picture} alt="" className="w-8 h-8 rounded-none object-cover border border-neutral-700" />
                        ) : (
                          <div className="w-8 h-8 bg-neutral-900 text-yellow-400 border border-yellow-500/40 flex items-center justify-center font-mono font-black text-xs">
                            {u.name[0]?.toUpperCase() ?? 'U'}
                          </div>
                        )}
                        <div className="truncate">
                          <div className="font-mono font-black text-xs text-white uppercase truncate flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {isActive && (
                              <span className="text-[9px] font-black bg-yellow-400 text-black px-1 uppercase">
                                Активен
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[10px] text-neutral-400 truncate">
                            {u.email}
                          </div>
                        </div>
                      </div>

                      {isActive ? (
                        <Check className="w-4 h-4 text-yellow-400 stroke-[3]" />
                      ) : (
                        <span className="text-[10px] font-mono text-neutral-500 uppercase hover:text-white">
                          Выбрать →
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Google OAuth Client ID Configuration (Expandable) */}
          <div className="border-t border-neutral-900 pt-3">
            <button
              type="button"
              onClick={() => setShowConfigClientId(!showConfigClientId)}
              className="text-[10px] font-mono text-neutral-400 hover:text-yellow-400 uppercase tracking-wider underline block"
            >
              {showConfigClientId ? 'Скрыть настройку Google Client ID' : 'Указать свой Google Client ID (для OAuth-окна Google)'}
            </button>

            {showConfigClientId && (
              <div className="mt-2 p-3 bg-neutral-950 border border-neutral-800 space-y-2">
                <p className="text-[10px] font-mono text-neutral-400 leading-relaxed">
                  Если вы создали OAuth 2.0 Client ID в Google Cloud Console для домена{' '}
                  <code className="text-yellow-400">timovar42.github.io</code>, вставьте его сюда:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="xxxxxxxxxxxx-xxxxxxxx.apps.googleusercontent.com"
                    value={googleClientId}
                    onChange={(e) => setGoogleClientId(e.target.value)}
                    className="flex-1 h-9 px-2 bg-black border border-neutral-700 text-white font-mono text-xs rounded-none focus:outline-none focus:border-yellow-400"
                  />
                  <button
                    type="button"
                    onClick={handleSaveClientId}
                    className="px-3 bg-yellow-400 text-black font-mono font-bold text-xs uppercase tracking-wider rounded-none hover:bg-yellow-300"
                  >
                    {clientIdSaved ? '✓ Сохранено' : 'ОК'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
