import React, { useState, useRef } from 'react';
import { useAppStore } from '../../store';
import { dexieRepo } from '../../repo/dexieRepo';
import { seedProgram } from '../../data/seedProgram';
import type { Settings } from '../../domain/types';
import {
  Download,
  Upload,
  RotateCcw,
  Sliders,
  Check,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const { settings, saveSettings, saveProgram, refreshSessions } = useAppStore();

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!settings) {
    return <div className="p-8 text-center text-neutral-400 font-mono">Загрузка настроек...</div>;
  }

  const handleUpdate = async (patch: Partial<Settings>) => {
    const updated = { ...settings, ...patch };
    await saveSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleExport = async () => {
    try {
      const json = await dexieRepo.exportJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wavelog-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Ошибка при экспорте данных');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await dexieRepo.importJSON(text);
      const p = await dexieRepo.getProgram();
      const s = await dexieRepo.getSettings();
      if (p) await saveProgram(p);
      if (s) await saveSettings(s);
      await refreshSessions();

      setImportStatus('Данные успешно импортированы!');
      setTimeout(() => setImportStatus(null), 3000);
    } catch (err: any) {
      alert(`Ошибка при импорте: ${err.message || err}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFullReset = async () => {
    if (
      confirm(
        'ВНИМАНИЕ: Это удалит всю историю тренировок и сбросит программу к начальной! Вы уверены?'
      )
    ) {
      const emptyExport = JSON.stringify({
        schemaVersion: 1,
        program: seedProgram,
        sessions: [],
        settings: { rpeMode: 'mid', formula: 'epley', units: 'kg' },
        events: [],
      });
      await dexieRepo.importJSON(emptyExport);
      await saveProgram(seedProgram);
      await saveSettings({ rpeMode: 'mid', formula: 'epley', units: 'kg' });
      await refreshSessions();
      alert('Приложение сброшено к исходному состоянию.');
    }
  };

  return (
    <div className="pb-32 max-w-2xl mx-auto px-3 sm:px-4 pt-3">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between border-b border-yellow-500/20 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
            Настройки
          </h1>
          <p className="text-xs font-mono text-neutral-400 mt-0.5">
            Параметры алгоритма и данные
          </p>
        </div>
        {savedSuccess && (
          <span className="flex items-center gap-1 text-[11px] font-mono text-black font-black bg-yellow-400 px-2 py-0.5 border border-yellow-400">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>СОХРАНЕНО</span>
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Progression Algorithm Settings */}
        <div className="bg-black border-2 border-yellow-400 rounded-none p-4 shadow-[0_0_12px_rgba(250,204,21,0.15)]">
          <h2 className="text-xs font-mono font-black text-yellow-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-yellow-400" />
            <span>Алгоритм подсказок</span>
          </h2>

          <div className="space-y-4">
            {/* RPE Mode */}
            <div>
              <label className="block text-xs font-mono uppercase text-white font-bold mb-1">
                Целевой RPE из диапазона
              </label>
              <p className="text-[11px] font-mono text-neutral-400 mb-2">
                Точка целевого RPE при расчёте веса
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'low', label: 'НИЖНЯЯ', desc: 'легче' },
                  { id: 'mid', label: 'СРЕДНЯЯ', desc: 'баланс' },
                  { id: 'high', label: 'ВЕРХНЯЯ', desc: 'тяжелее' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => handleUpdate({ rpeMode: mode.id as any })}
                    className={`p-2.5 rounded-none border text-center transition-all ${
                      settings.rpeMode === mode.id
                        ? 'bg-yellow-400 text-black border-yellow-400 font-black shadow-[0_0_8px_rgba(250,204,21,0.4)]'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-yellow-400/50'
                    }`}
                  >
                    <div className="text-xs font-mono font-bold uppercase">{mode.label}</div>
                    <div className="text-[10px] font-mono mt-0.5 opacity-80">{mode.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Formula */}
            <div className="pt-3 border-t border-neutral-900">
              <label className="block text-xs font-mono uppercase text-white font-bold mb-1">
                Формула расчёта e1RM
              </label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  {
                    id: 'epley',
                    label: 'ЭПЛИ (EPLEY)',
                    desc: 'вес × (1 + n/30)',
                  },
                  {
                    id: 'brzycki',
                    label: 'БЖИЦКИ (BRZYCKI)',
                    desc: 'вес / (1.0278 - 0.0278*n)',
                  },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleUpdate({ formula: f.id as any })}
                    className={`p-3 rounded-none border text-left transition-all ${
                      settings.formula === f.id
                        ? 'bg-yellow-400 text-black border-yellow-400 font-black shadow-[0_0_8px_rgba(250,204,21,0.4)]'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-yellow-400/50'
                    }`}
                  >
                    <div className="text-xs font-mono font-bold uppercase">{f.label}</div>
                    <div className="text-[10px] font-mono mt-0.5 opacity-80">{f.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Data Backup & Restore */}
        <div className="bg-black border-2 border-yellow-400 rounded-none p-4 shadow-[0_0_12px_rgba(250,204,21,0.15)]">
          <h2 className="text-xs font-mono font-black text-yellow-400 uppercase tracking-widest mb-1 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-yellow-400" />
            <span>Резервные копии</span>
          </h2>
          <p className="text-xs font-mono text-neutral-400 mb-3">
            Все данные хранятся локально на телефоне (IndexedDB). Выгружайте копию в JSON перед сменой устройства.
          </p>

          {importStatus && (
            <div className="mb-3 p-2.5 bg-neutral-950 border border-yellow-400 text-yellow-400 text-xs font-mono font-bold flex items-center gap-2">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{importStatus}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExport}
              className="py-3 px-3 bg-neutral-950 hover:bg-neutral-900 text-yellow-400 font-mono font-black text-xs uppercase tracking-wider rounded-none border border-yellow-500/60 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Download className="w-4 h-4 text-yellow-400" />
              <span>Экспорт JSON</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-3 px-3 bg-neutral-950 hover:bg-neutral-900 text-white font-mono font-black text-xs uppercase tracking-wider rounded-none border border-neutral-700 hover:border-yellow-400 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Upload className="w-4 h-4 text-white" />
              <span>Импорт JSON</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-black border-2 border-neutral-800 rounded-none p-4">
          <h2 className="text-xs font-mono font-black text-neutral-400 uppercase tracking-widest mb-1 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-neutral-400" />
            <span>Сброс данных</span>
          </h2>
          <p className="text-xs font-mono text-neutral-500 mb-3">
            Очистит историю подходов и восстановит исходную программу.
          </p>

          <button
            onClick={handleFullReset}
            className="w-full py-3 bg-black hover:bg-neutral-900 border border-neutral-700 hover:border-yellow-400/80 text-neutral-400 hover:text-white font-mono font-bold text-xs uppercase tracking-wider rounded-none flex items-center justify-center gap-2 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Сбросить всё к начальным данным</span>
          </button>
        </div>

        {/* App Info Footer */}
        <div className="text-center font-mono text-xs text-neutral-500 py-2">
          <p className="font-bold text-neutral-400 uppercase tracking-widest">WAVELOG PRO · v1.0</p>
          <p className="text-[10px] mt-0.5 text-neutral-600">OFFLINE STRENGTH CYCLE TRACKER</p>
        </div>
      </div>
    </div>
  );
};
