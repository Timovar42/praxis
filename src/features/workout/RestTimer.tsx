import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, X, Timer } from 'lucide-react';

export const RestTimer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(90);
  const [isRunning, setIsRunning] = useState(false);
  const [targetDuration, setTargetDuration] = useState<number>(90);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isRunning && secondsLeft > 0) {
      timer = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isRunning) {
      setIsRunning(false);
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([200, 100, 200]);
        } catch {
          // ignore
        }
      }
    }
    return () => clearInterval(timer);
  }, [isRunning, secondsLeft]);

  const startPreset = (duration: number) => {
    setTargetDuration(duration);
    setSecondsLeft(duration);
    setIsRunning(true);
    setIsOpen(true);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-20 right-4 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-black hover:bg-neutral-900 text-yellow-400 px-4 py-3 rounded-none border-2 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)] text-xs font-black uppercase tracking-wider active:scale-95 transition-all"
        >
          <Timer className="w-4 h-4 text-yellow-400" />
          <span>Отдых {isRunning ? `[${formatTime(secondsLeft)}]` : ''}</span>
        </button>
      </div>
    );
  }

  const progress = targetDuration > 0 ? (1 - secondsLeft / targetDuration) * 100 : 0;

  return (
    <div className="fixed bottom-20 right-3 left-3 sm:left-auto sm:w-80 z-40 bg-black border-2 border-yellow-400 rounded-none shadow-[0_0_20px_rgba(250,204,21,0.25)] p-4 text-white">
      <div className="flex items-center justify-between mb-3 border-b border-yellow-500/30 pb-2">
        <div className="flex items-center gap-2">
          <Timer className={`w-4 h-4 ${isRunning ? 'text-yellow-400 animate-pulse' : 'text-neutral-400'}`} />
          <span className="font-black uppercase tracking-wider text-xs text-yellow-400">Таймер отдыха</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 text-neutral-400 hover:text-white rounded-none hover:bg-neutral-900 border border-transparent hover:border-neutral-700"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="relative flex items-center justify-center my-3">
        <div className="text-5xl font-black tracking-tight font-mono text-white">
          {formatTime(secondsLeft)}
        </div>
      </div>

      {/* Strict Progress Bar */}
      <div className="w-full bg-neutral-900 h-2 rounded-none border border-neutral-800 overflow-hidden mb-3">
        <div
          className={`h-full transition-all duration-300 ${
            secondsLeft === 0 ? 'bg-yellow-400 shadow-[0_0_8px_#facc15]' : 'bg-yellow-400'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      {/* Presets */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {[60, 90, 120, 180].map((d) => (
          <button
            key={d}
            onClick={() => startPreset(d)}
            className={`py-1.5 text-xs font-mono font-bold rounded-none uppercase transition-colors border ${
              targetDuration === d && isRunning
                ? 'bg-yellow-400 text-black border-yellow-400'
                : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-yellow-400/50 hover:text-white'
            }`}
          >
            {d < 60 ? `${d}с` : `${d / 60}м`}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setSecondsLeft((prev) => prev + 30)}
          className="px-3 py-2 bg-neutral-950 hover:bg-neutral-900 text-xs font-bold font-mono text-yellow-400 rounded-none border border-yellow-500/40 uppercase tracking-wider"
        >
          +30с
        </button>
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-none text-xs font-black uppercase tracking-wider transition-all border ${
            isRunning
              ? 'bg-black text-yellow-400 border-yellow-400 hover:bg-neutral-950'
              : 'bg-yellow-400 text-black border-yellow-400 hover:bg-yellow-300 shadow-[0_0_10px_rgba(250,204,21,0.3)]'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-3.5 h-3.5" /> Пауза
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" /> Старт
            </>
          )}
        </button>
        <button
          onClick={() => {
            setSecondsLeft(targetDuration);
            setIsRunning(false);
          }}
          className="p-2.5 bg-neutral-950 hover:bg-neutral-900 text-neutral-400 hover:text-white rounded-none border border-neutral-800"
          title="Сброс"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
