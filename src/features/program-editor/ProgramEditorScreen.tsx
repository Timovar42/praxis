import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { seedProgram } from '../../data/seedProgram';
import { ZoneBadge } from '../../components/ZoneBadge';
import type { Zone, DayKey, Program } from '../../domain/types';
import {
  RotateCcw,
  Save,
  Check,
  Calendar,
  Edit2,
  ChevronUp,
} from 'lucide-react';

const DAY_TITLES: Record<DayKey, string> = {
  mon: 'Понедельник',
  tue: 'Вторник',
  wed: 'Среда',
  fri: 'Пятница',
  sat: 'Суббота',
};

const ZONES: Zone[] = ['vol', 'mid', 'str'];

export const ProgramEditorScreen: React.FC = () => {
  const { program, saveProgram } = useAppStore();

  const [localProgram, setLocalProgram] = useState<Program | null>(
    program ? JSON.parse(JSON.stringify(program)) : null
  );
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);

  if (!localProgram) {
    return <div className="p-8 text-center text-neutral-400 font-mono">Загрузка схемы...</div>;
  }

  const handleSave = async () => {
    if (!localProgram) return;
    await saveProgram(localProgram);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleResetToSeed = async () => {
    if (confirm('Сбросить программу к начальным заводским настройкам?')) {
      const freshSeed = JSON.parse(JSON.stringify(seedProgram));
      setLocalProgram(freshSeed);
      await saveProgram(freshSeed);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  return (
    <div className="pb-32 max-w-2xl mx-auto px-3 sm:px-4 pt-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 border-b border-yellow-500/20 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
            Схема программы
          </h1>
          <p className="text-xs font-mono text-neutral-400 mt-0.5">
            Ротация зон, старт цикла и предписания
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetToSeed}
            className="p-2 text-neutral-400 hover:text-white rounded-none hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-colors"
            title="Сбросить к заводским настройкам"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black rounded-none text-xs font-black uppercase font-mono tracking-wider border border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.3)] flex items-center gap-1.5 transition-all active:scale-95"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Сохранено!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Сохранить</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Cycle & Start Date Settings */}
        <div className="bg-black border-2 border-yellow-400 rounded-none p-4 shadow-[0_0_12px_rgba(250,204,21,0.15)]">
          <h2 className="text-xs font-mono font-black text-yellow-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-yellow-400" />
            <span>Параметры цикла</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1">
                Старт цикла (Пн Недели 1)
              </label>
              <input
                type="date"
                value={localProgram.cycleStart}
                onChange={(e) => {
                  setLocalProgram({
                    ...localProgram,
                    cycleStart: e.target.value,
                  });
                }}
                className="w-full h-11 px-3 bg-neutral-950 border border-neutral-700 rounded-none text-xs font-mono text-white focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-1">
                Недель в цикле
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={localProgram.cycleWeeks}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val > 0) {
                    setLocalProgram({ ...localProgram, cycleWeeks: val });
                  }
                }}
                className="w-full h-11 px-3 bg-neutral-950 border border-neutral-700 rounded-none text-xs font-mono text-white focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>
        </div>

        {/* Rotation Matrix */}
        <div className="bg-black border-2 border-yellow-400 rounded-none p-4 shadow-[0_0_12px_rgba(250,204,21,0.15)]">
          <h2 className="text-xs font-mono font-black text-yellow-400 uppercase tracking-widest mb-1">
            Матрица ротации зон
          </h2>
          <p className="text-[11px] font-mono text-neutral-400 mb-3">
            Распределение зон нагрузки по неделям
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-mono">
              <thead>
                <tr className="border-b border-neutral-800 text-yellow-400 font-bold uppercase">
                  <th className="py-2 px-2">День</th>
                  {Array.from({ length: localProgram.cycleWeeks }, (_, i) => (
                    <th key={i} className="py-2 px-2 text-center">
                      Нед {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {(['mon', 'tue', 'wed', 'fri', 'sat'] as DayKey[]).map((dayKey) => {
                  const dayRot = localProgram.rotation[dayKey] ?? ['str', 'mid', 'vol'];
                  return (
                    <tr key={dayKey}>
                      <td className="py-2.5 px-2 font-bold text-white uppercase whitespace-nowrap">
                        {DAY_TITLES[dayKey]}
                      </td>
                      {Array.from({ length: localProgram.cycleWeeks }, (_, weekIdx) => {
                        const curZone = dayRot[weekIdx] ?? 'vol';
                        return (
                          <td key={weekIdx} className="py-2.5 px-2 text-center">
                            <select
                              value={curZone}
                              onChange={(e) => {
                                const newZone = e.target.value as Zone;
                                const newRot = { ...localProgram.rotation };
                                const arr = [...(newRot[dayKey] ?? [])];
                                arr[weekIdx] = newZone;
                                newRot[dayKey] = arr;
                                setLocalProgram({ ...localProgram, rotation: newRot });
                              }}
                              className="bg-neutral-950 border border-neutral-700 text-yellow-400 text-xs rounded-none px-2 py-1 focus:outline-none focus:border-yellow-400 font-bold uppercase"
                            >
                              <option value="str">СИЛА</option>
                              <option value="mid">СРЕДНЯК</option>
                              <option value="vol">ОБЪЁМ</option>
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Slots List by Day */}
        <div className="space-y-3">
          <h2 className="text-xs font-mono font-black text-yellow-400 uppercase tracking-widest px-1">
            Слоты упражнений [{localProgram.slots.length}]
          </h2>

          {(['mon', 'tue', 'wed', 'fri', 'sat'] as DayKey[]).map((dayKey) => {
            const daySlots = localProgram.slots.filter((s) => s.day === dayKey);
            const dayTitle = localProgram.days[dayKey]?.title ?? DAY_TITLES[dayKey];

            return (
              <div
                key={dayKey}
                className="bg-black border border-yellow-500/40 rounded-none p-3.5 shadow"
              >
                <div className="flex items-center justify-between mb-2.5 border-b border-neutral-800 pb-1.5">
                  <h3 className="font-black text-white text-xs font-mono uppercase tracking-wider">
                    {DAY_TITLES[dayKey]} · {dayTitle}
                  </h3>
                  <span className="text-[10px] text-yellow-400 font-mono font-bold">
                    {daySlots.length} упр.
                  </span>
                </div>

                <div className="space-y-1.5">
                  {daySlots.map((slot) => {
                    const isEditing = editingSlotId === slot.id;

                    return (
                      <div
                        key={slot.id}
                        className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-none"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-white text-xs flex items-center gap-2">
                              <span>{slot.name}</span>
                              <span className="text-[10px] text-yellow-400 font-mono">
                                (шаг: {slot.inc} кг)
                              </span>
                            </div>
                            <div className="text-[10px] text-neutral-400 font-mono mt-0.5 flex items-center gap-2">
                              <span>База: <code className="text-white">{slot.lift}</code></span>
                              {slot.countsInVolume === false && (
                                <span className="text-neutral-500">· вне объёма</span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => setEditingSlotId(isEditing ? null : slot.id)}
                            className="p-1.5 text-neutral-400 hover:text-yellow-400 rounded-none hover:bg-neutral-900 border border-transparent hover:border-neutral-800"
                            title="Редактировать"
                          >
                            {isEditing ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <Edit2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {isEditing && (
                          <div className="mt-2.5 pt-2.5 border-t border-neutral-800 space-y-2.5">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <label className="block text-neutral-400 font-mono text-[10px] mb-1">Название</label>
                                <input
                                  type="text"
                                  value={slot.name}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setLocalProgram({
                                      ...localProgram,
                                      slots: localProgram.slots.map((s) =>
                                        s.id === slot.id ? { ...s, name: val } : s
                                      ),
                                    });
                                  }}
                                  className="w-full px-2 py-1.5 bg-black border border-neutral-700 text-white rounded-none text-xs focus:border-yellow-400"
                                />
                              </div>
                              <div>
                                <label className="block text-neutral-400 font-mono text-[10px] mb-1">Шаг (кг)</label>
                                <input
                                  type="number"
                                  step="0.5"
                                  value={slot.inc}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val)) {
                                      setLocalProgram({
                                        ...localProgram,
                                        slots: localProgram.slots.map((s) =>
                                          s.id === slot.id ? { ...s, inc: val } : s
                                        ),
                                      });
                                    }
                                  }}
                                  className="w-full px-2 py-1.5 bg-black border border-neutral-700 text-white rounded-none text-xs font-mono focus:border-yellow-400"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5 pt-2 border-t border-neutral-900">
                              <span className="text-[10px] font-mono font-bold text-yellow-400 block uppercase">
                                Предписания по зонам:
                              </span>
                              {ZONES.map((z) => {
                                const rx = slot.rx[z];
                                return (
                                  <div
                                    key={z}
                                    className="p-2 bg-black rounded-none border border-neutral-800 flex items-center justify-between gap-2 flex-wrap text-xs font-mono"
                                  >
                                    <ZoneBadge zone={z} size="sm" />
                                    <div className="flex items-center gap-2 text-neutral-300">
                                      <span>
                                        {rx.opts[0]?.[0]}×{Array.isArray(rx.opts[0]?.[1]) ? `${rx.opts[0][1][0]}-${rx.opts[0][1][1]}` : rx.opts[0]?.[1]}
                                      </span>
                                      {rx.rpe && (
                                        <span className="text-yellow-400">
                                          RPE {rx.rpe[0]}–{rx.rpe[1]}
                                        </span>
                                      )}
                                      {rx.cap != null && (
                                        <span className="text-white">
                                          &lt;{Math.round(rx.cap * 100)}%
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
