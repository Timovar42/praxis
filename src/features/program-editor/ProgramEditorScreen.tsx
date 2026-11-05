import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { ZoneBadge } from '../../components/ZoneBadge';
import type { Zone, DayKey, Program, Slot, PeriodizationType } from '../../domain/types';
import {
  ALL_PRESETS,
  PERIODIZATION_MODELS,
  buildRxForPeriodization,
} from '../../domain/presets';
import { EXERCISE_VARIATIONS } from '../../domain/exerciseVariations';
import {
  Save,
  Check,
  Calendar,
  Edit2,
  Plus,
  Trash2,
  Layers,
  Sparkles,
  Zap,
  Info,
  X,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

const DAY_TITLES: Record<DayKey, string> = {
  mon: 'Понедельник',
  tue: 'Вторник',
  wed: 'Среда',
  fri: 'Пятница',
  sat: 'Суббота',
};

const ZONES: Zone[] = ['vol', 'mid', 'str'];

interface ProgramEditorProps {
  onSaved?: () => void;
  onClose?: () => void;
}

export const ProgramEditorScreen: React.FC<ProgramEditorProps> = ({ onSaved, onClose }) => {
  const { program, saveProgram } = useAppStore();

  const [localProgram, setLocalProgram] = useState<Program | null>(
    program ? JSON.parse(JSON.stringify(program)) : null
  );
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [addingDay, setAddingDay] = useState<DayKey | null>(null);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseInc, setNewExerciseInc] = useState('2.5');
  const [confirmPresetKey, setConfirmPresetKey] = useState<string | null>(null);

  if (!localProgram) {
    return <div className="p-8 text-center text-neutral-400 font-mono">Загрузка схемы...</div>;
  }

  const currentPeriodization = localProgram.periodization || 'wave';

  const handleSave = async () => {
    if (!localProgram) return;
    await saveProgram(localProgram);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onSaved?.();
    }, 1800);
  };

  const handleApplyPreset = async (presetKey: string) => {
    const preset = ALL_PRESETS.find((p) => p.key === presetKey);
    if (!preset) return;

    const updated: Program = {
      ...JSON.parse(JSON.stringify(preset.program)),
      id: localProgram.id,
      cycleStart: localProgram.cycleStart, // preserve cycle start date
    };

    setLocalProgram(updated);
    setConfirmPresetKey(null);
    await saveProgram(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleChangePeriodization = (newType: PeriodizationType) => {
    if (!localProgram) return;
    const updatedSlots = localProgram.slots.map((s) => ({
      ...s,
      rx: buildRxForPeriodization(newType, s.kind === 'isolation' ? 'isolation' : 'compound'),
    }));

    setLocalProgram({
      ...localProgram,
      periodization: newType,
      slots: updatedSlots,
    });
  };

  const handleMoveSlot = (slotId: string, direction: 'up' | 'down') => {
    if (!localProgram) return;
    const slot = localProgram.slots.find((s) => s.id === slotId);
    if (!slot) return;

    const daySlots = localProgram.slots.filter((s) => s.day === slot.day);
    const otherSlots = localProgram.slots.filter((s) => s.day !== slot.day);
    const idx = daySlots.findIndex((s) => s.id === slotId);

    if (direction === 'up' && idx > 0) {
      const temp = daySlots[idx - 1];
      daySlots[idx - 1] = daySlots[idx];
      daySlots[idx] = temp;
    } else if (direction === 'down' && idx < daySlots.length - 1) {
      const temp = daySlots[idx + 1];
      daySlots[idx + 1] = daySlots[idx];
      daySlots[idx] = temp;
    }

    setLocalProgram({
      ...localProgram,
      slots: [...otherSlots, ...daySlots],
    });
  };

  const handleDeleteSlot = (slotId: string) => {
    if (!localProgram) return;
    if (confirm('Удалить это упражнение из общей программы? (В прошлых тренировках запись останется)')) {
      setLocalProgram({
        ...localProgram,
        slots: localProgram.slots.filter((s) => s.id !== slotId),
      });
    }
  };

  const handleAddSlot = (day: DayKey) => {
    if (!localProgram || !newExerciseName.trim()) return;

    const inc = parseFloat(newExerciseInc.replace(',', '.')) || 2.5;
    const newId = `slot-${Date.now()}`;
    const cleanName = newExerciseName.trim();

    // Check if matching preset variations exist
    const variations = (EXERCISE_VARIATIONS as Record<string, string[]>)[cleanName] || [cleanName];

    const newSlot: Slot = {
      id: newId,
      lift: cleanName.toLowerCase().replace(/\s+/g, '_'),
      name: cleanName,
      day,
      kind: 'compound',
      inc,
      muscles: {},
      variations,
      rx: buildRxForPeriodization(currentPeriodization, 'compound'),
    };

    setLocalProgram({
      ...localProgram,
      slots: [...localProgram.slots, newSlot],
    });

    setNewExerciseName('');
    setAddingDay(null);
  };

  return (
    <div className="pb-32 max-w-2xl mx-auto px-3 sm:px-4 pt-3">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 mb-4 border-b-2 border-yellow-400 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-yellow-400 text-black flex items-center justify-center font-black rounded-none shadow-[0_0_10px_rgba(250,204,21,0.4)]">
            <Layers className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight font-mono">
              СХЕМА И ПЕРИОДИЗАЦИЯ
            </h1>
            <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest">
              Пресеты, дни и программа тренировок
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="w-9 h-9 border border-neutral-700 hover:border-yellow-400 bg-neutral-950 text-neutral-400 hover:text-white flex items-center justify-center rounded-none"
              title="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          )}
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

      {/* Info notice about history preservation */}
      <div className="mb-4 p-3 bg-neutral-950 border border-yellow-500/40 rounded-none flex items-start gap-2.5">
        <Info className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
        <p className="text-[11px] font-mono text-neutral-300 leading-relaxed">
          <strong className="text-yellow-400">Внимание:</strong> любые изменения схемы вступают в силу со{' '}
          <span className="text-white font-bold">следующей тренировки</span>. Уже завершённые тренировки и история подходов остаются нетронутыми в журнале!
        </p>
      </div>

      {savedSuccess && (
        <div className="mb-4 p-2.5 bg-yellow-400 text-black font-mono text-xs font-black uppercase flex items-center gap-2 border border-yellow-400 shadow">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Программа успешно сохранена и активирована!</span>
        </div>
      )}

      <div className="space-y-5">
        {/* 1. Quick Presets (1-Click Application) */}
        <div className="bg-black border-2 border-yellow-400 rounded-none p-4 shadow-[0_0_12px_rgba(250,204,21,0.15)]">
          <div className="flex items-center justify-between mb-3 border-b border-yellow-500/30 pb-2">
            <span className="text-xs font-mono font-black text-yellow-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
              Готовые пресеты программ (в 1 клик)
            </span>
            <span className="text-[10px] font-mono text-neutral-400 uppercase">
              Шаблоны сплитов
            </span>
          </div>

          <p className="text-[11px] font-mono text-neutral-400 mb-3">
            Выберите готовый проверенный план тренировок. Упражнения и дни выставятся автоматически:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ALL_PRESETS.map((p) => {
              const isCurrent = localProgram.name === p.program.name;

              return (
                <div
                  key={p.key}
                  className={`p-3 border rounded-none flex flex-col justify-between transition-all ${
                    isCurrent
                      ? 'border-yellow-400 bg-neutral-950 shadow-[0_0_10px_rgba(250,204,21,0.2)]'
                      : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                  }`}
                >
                  <div className="mb-2">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-mono font-black text-white text-xs uppercase">
                        {p.title}
                      </span>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 bg-yellow-400/20 text-yellow-400 border border-yellow-400/40 uppercase">
                        {p.daysCount}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-neutral-400">
                      {p.subtitle}
                    </p>
                  </div>

                  <div className="mt-2 pt-2 border-t border-neutral-900 flex items-center justify-between">
                    {isCurrent ? (
                      <span className="text-[10px] font-mono font-bold text-yellow-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>АКТИВНЫЙ ПРЕСЕТ</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmPresetKey(p.key)}
                        className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-black font-mono text-[11px] font-black uppercase rounded-none transition-all active:scale-95 shadow"
                      >
                        Применить пресет
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal: Confirm Preset Application */}
        {confirmPresetKey && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-black border-2 border-yellow-400 p-5 max-w-md w-full shadow-[0_0_25px_rgba(250,204,21,0.3)]">
              <div className="flex items-center gap-2 text-yellow-400 font-mono font-black uppercase text-sm mb-3">
                <Sparkles className="w-5 h-5" />
                <span>Применить пресет тренировок?</span>
              </div>
              <p className="text-xs font-mono text-neutral-300 mb-4 leading-relaxed">
                Вы собираетесь переключиться на{' '}
                <strong className="text-white">
                  {ALL_PRESETS.find((p) => p.key === confirmPresetKey)?.title}
                </strong>
                . Все упражнения программы обновятся. Новая схема начнёт действовать со следующей тренировки, история завершённых занятий будет полностью сохранена.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmPresetKey(null)}
                  className="px-3 py-2 border border-neutral-700 text-neutral-300 font-mono text-xs uppercase hover:bg-neutral-900 rounded-none"
                >
                  Отмена
                </button>
                <button
                  onClick={() => handleApplyPreset(confirmPresetKey)}
                  className="px-4 py-2 bg-yellow-400 text-black font-mono font-black text-xs uppercase hover:bg-yellow-300 rounded-none transition-all shadow"
                >
                  Да, применить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Periodization Model Selector */}
        <div className="bg-black border-2 border-yellow-400 rounded-none p-4 shadow-[0_0_12px_rgba(250,204,21,0.15)]">
          <div className="flex items-center justify-between mb-3 border-b border-yellow-500/30 pb-2">
            <span className="text-xs font-mono font-black text-yellow-400 uppercase tracking-widest flex items-center gap-1.5">
              <Zap className="w-4 h-4 stroke-[2.5]" />
              Модель периодизации
            </span>
            <span className="text-[10px] font-mono text-neutral-400 uppercase">
              {PERIODIZATION_MODELS[currentPeriodization].shortTitle}
            </span>
          </div>

          <p className="text-[11px] font-mono text-neutral-400 mb-3">
            Выберите, как меняется тренировочная нагрузка от недели к неделе:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(Object.keys(PERIODIZATION_MODELS) as PeriodizationType[]).map((type) => {
              const info = PERIODIZATION_MODELS[type];
              const isSelected = currentPeriodization === type;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleChangePeriodization(type)}
                  className={`p-3 border rounded-none text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-yellow-400 bg-neutral-950 shadow-[0_0_10px_rgba(250,204,21,0.2)]'
                      : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className={`font-mono text-xs uppercase font-black ${isSelected ? 'text-yellow-400' : 'text-white'}`}>
                        {info.title}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-yellow-400 stroke-[3]" />}
                    </div>
                    <div className="text-[10px] font-mono text-yellow-400/90 mb-1">
                      {info.tagline}
                    </div>
                    <p className="text-[10px] font-mono text-neutral-400 leading-snug">
                      {info.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Cycle & Rotation Settings */}
        <div className="bg-black border-2 border-yellow-400 rounded-none p-4 shadow-[0_0_12px_rgba(250,204,21,0.15)]">
          <h2 className="text-xs font-mono font-black text-yellow-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-yellow-400" />
            <span>Параметры цикла и старт</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
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

          {/* Rotation Matrix (if wave or linear) */}
          {currentPeriodization === 'wave' && (
            <div className="pt-3 border-t border-neutral-900">
              <span className="text-[11px] font-mono font-bold text-yellow-400 uppercase tracking-wider block mb-2">
                Матрица ротации зон (Сила / Средняк / Объём)
              </span>
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
          )}
        </div>

        {/* 4. Exercise Slots Management by Day */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-mono font-black text-yellow-400 uppercase tracking-widest">
              Упражнения программы [{localProgram.slots.length}]
            </h2>
            <span className="text-[10px] font-mono text-neutral-400 uppercase">
              Добавление / удаление / порядок
            </span>
          </div>

          {(['mon', 'tue', 'wed', 'fri', 'sat'] as DayKey[]).map((dayKey) => {
            const daySlots = localProgram.slots.filter((s) => s.day === dayKey);
            const dayTitle = localProgram.days[dayKey]?.title ?? DAY_TITLES[dayKey];
            const isAdding = addingDay === dayKey;

            return (
              <div
                key={dayKey}
                className="bg-black border-2 border-yellow-400 rounded-none p-3.5 shadow-[0_0_10px_rgba(250,204,21,0.1)]"
              >
                <div className="flex items-center justify-between mb-2.5 border-b border-yellow-500/30 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-white text-xs font-mono uppercase tracking-wider">
                      {DAY_TITLES[dayKey]}
                    </span>
                    <span className="text-[11px] font-mono text-yellow-400">· {dayTitle}</span>
                  </div>
                  <button
                    onClick={() => setAddingDay(isAdding ? null : dayKey)}
                    className="flex items-center gap-1 px-2 py-1 bg-neutral-950 border border-yellow-400/60 hover:border-yellow-400 text-yellow-400 text-[10px] font-mono font-bold uppercase transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Добавить упр.</span>
                  </button>
                </div>

                {/* Add new exercise form */}
                {isAdding && (
                  <div className="mb-3 p-3 bg-neutral-950 border border-yellow-400 rounded-none space-y-2">
                    <div className="text-[10px] font-mono font-bold text-yellow-400 uppercase">
                      Новое упражнение для {DAY_TITLES[dayKey]}:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          placeholder="Название (напр. Жим гантелей лёжа)"
                          value={newExerciseName}
                          onChange={(e) => setNewExerciseName(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-black border border-neutral-700 text-white rounded-none text-xs font-mono focus:border-yellow-400"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.5"
                          placeholder="Шаг (кг)"
                          value={newExerciseInc}
                          onChange={(e) => setNewExerciseInc(e.target.value)}
                          className="w-20 px-2.5 py-1.5 bg-black border border-neutral-700 text-white rounded-none text-xs font-mono focus:border-yellow-400"
                        />
                        <button
                          onClick={() => handleAddSlot(dayKey)}
                          className="flex-1 px-3 py-1.5 bg-yellow-400 text-black font-mono text-xs font-black uppercase rounded-none hover:bg-yellow-300"
                        >
                          Добавить
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Day's Exercises List */}
                {daySlots.length === 0 ? (
                  <div className="py-3 text-center text-[11px] font-mono text-neutral-500">
                    В этот день нет упражнений (день отдыха)
                  </div>
                ) : (
                  <div className="space-y-2">
                    {daySlots.map((slot, idx) => {
                      const isEditing = editingSlotId === slot.id;

                      return (
                        <div
                          key={slot.id}
                          className="p-2.5 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded-none transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {/* Order number */}
                              <span className="w-5 h-5 bg-neutral-900 border border-neutral-800 text-[10px] font-mono font-bold text-neutral-400 flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div>
                                <div className="font-bold text-white text-xs flex items-center gap-2 flex-wrap">
                                  <span>{slot.name}</span>
                                  <span className="text-[10px] text-yellow-400 font-mono">
                                    (шаг {slot.inc} кг)
                                  </span>
                                </div>
                                <div className="text-[10px] text-neutral-400 font-mono mt-0.5 flex items-center gap-2">
                                  <span>Базовый лифт: <code className="text-white">{slot.lift}</code></span>
                                  {slot.variations && slot.variations.length > 1 && (
                                    <span className="text-yellow-400/80">
                                      · {slot.variations.length} аналогов
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Actions: Reorder, Edit, Delete */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleMoveSlot(slot.id, 'up')}
                                disabled={idx === 0}
                                className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400"
                                title="Вверх"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleMoveSlot(slot.id, 'down')}
                                disabled={idx === daySlots.length - 1}
                                className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400"
                                title="Вниз"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingSlotId(isEditing ? null : slot.id)}
                                className="p-1 text-neutral-400 hover:text-yellow-400"
                                title="Редактировать параметры"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="p-1 text-neutral-400 hover:text-red-400"
                                title="Удалить упражнение"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Editing Slot Sub-panel */}
                          {isEditing && (
                            <div className="mt-2.5 pt-2.5 border-t border-neutral-800 space-y-2.5">
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <label className="block text-neutral-400 font-mono text-[10px] mb-1">
                                    Название упражнения
                                  </label>
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
                                  <label className="block text-neutral-400 font-mono text-[10px] mb-1">
                                    Шаг веса (кг)
                                  </label>
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
                                  Предписания (подходы × повторения):
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
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
