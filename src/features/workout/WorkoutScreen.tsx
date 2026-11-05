import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppStore } from '../../store';
import { ZoneBadge } from '../../components/ZoneBadge';
import { RestTimer } from './RestTimer';
import type { Session, SetType, SetLog } from '../../domain/types';
import { suggest, calcE1RM } from '../../domain/progression';
import {
  getOrCreateSessionForDate,
  getCurrentLiftE1RM,
  getLastLoggedSets,
  isNextUpcomingSessionForSlot,
} from '../../domain/workoutHelper';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Sparkles,
  History,
  Flame,
  Info,
  Calendar,
} from 'lucide-react';

interface WorkoutScreenProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange?: (date: string) => void;
  onFinish?: () => void;
}

const SET_TYPE_LABELS: Record<SetType, { label: string; badge: string }> = {
  work: { label: 'Р', badge: 'bg-black text-yellow-400 border border-yellow-400 font-bold' },
  warmup: { label: 'РАЗ', badge: 'bg-neutral-900 text-neutral-400 border border-neutral-700' },
  attack: { label: 'АТК', badge: 'bg-yellow-400 text-black border border-yellow-400 font-black' },
  drop: { label: 'ДРОП', badge: 'bg-black text-amber-300 border border-amber-400/80 font-bold' },
};

const RPE_CHIPS = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

export const WorkoutScreen: React.FC<WorkoutScreenProps> = ({
  selectedDate,
  onDateChange,
  onFinish,
}) => {
  const { program, sessions, settings, saveSession } = useAppStore();

  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [collapsedSlots, setCollapsedSlots] = useState<Record<string, boolean>>({});
  const [quickCalcOpen, setQuickCalcOpen] = useState<string | null>(null);
  const [quickWeight, setQuickWeight] = useState('');
  const [quickReps, setQuickReps] = useState('');
  const [quickRpe, setQuickRpe] = useState('8');

  // Load or create session for selected date
  useEffect(() => {
    if (!program) return;
    const session = getOrCreateSessionForDate(sessions, program, selectedDate);
    setActiveSession(session);
  }, [selectedDate, program, sessions]);

  // Handler to update active session and trigger auto-save
  const updateSession = useCallback(
    (updater: (prev: Session) => Session) => {
      setActiveSession((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        saveSession(next);
        return next;
      });
    },
    [saveSession]
  );

  const toggleSlotCollapse = (slotId: string) => {
    setCollapsedSlots((prev) => ({ ...prev, [slotId]: !prev[slotId] }));
  };

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  if (!program || !settings || !activeSession) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-neutral-400 font-mono">
        <p>Загрузка данных тренировки...</p>
      </div>
    );
  }

  const dayInfo = program.days[activeSession.day];
  const formattedDate = format(parseISO(activeSession.date), 'EEEE, d MMMM yyyy', {
    locale: ru,
  });

  return (
    <div className="pb-36 max-w-2xl mx-auto px-2.5 sm:px-4 pt-3">
      {/* Session Top Bar */}
      <div className="bg-black border-2 border-yellow-400 rounded-none p-4 mb-4 shadow-[0_0_15px_rgba(250,204,21,0.15)]">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="capitalize text-xs font-mono font-bold text-neutral-300">
              {formattedDate}
            </span>
            {onDateChange && (
              <label className="cursor-pointer text-yellow-400 hover:text-yellow-300 p-1">
                <Calendar className="w-4 h-4 inline" />
                <input
                  type="date"
                  value={activeSession.date}
                  onChange={(e) => e.target.value && onDateChange(e.target.value)}
                  className="sr-only"
                />
              </label>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-yellow-400 font-mono font-bold">
              Ц{activeSession.cycle} · Н{activeSession.week}
            </span>
            <ZoneBadge
              zone={
                program.rotation[activeSession.day]?.[activeSession.week - 1] ?? 'mid'
              }
              size="md"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
            {dayInfo?.title ?? 'Тренировка'}
          </h1>
        </div>

        {/* Bad Day Toggle */}
        <div className="mt-3 pt-3 border-t border-yellow-500/20 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-neutral-300 select-none">
            <input
              type="checkbox"
              checked={activeSession.badDay ?? false}
              onChange={(e) => {
                const checked = e.target.checked;
                updateSession((s) => ({ ...s, badDay: checked }));
              }}
              className="w-4 h-4 rounded-none text-yellow-400 bg-black border border-yellow-400 focus:ring-0"
            />
            <span className={activeSession.badDay ? 'text-yellow-400 font-bold' : ''}>
              Плохой день (исключить из e1RM)
            </span>
          </label>
          {activeSession.badDay && (
            <span className="text-[10px] font-mono text-black bg-yellow-400 px-1.5 py-0.2 font-black uppercase">
              Исключено
            </span>
          )}
        </div>

        {/* Cardio Block if configured */}
        {dayInfo?.cardio && (
          <div className="mt-3 pt-3 border-t border-yellow-500/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-neutral-200 font-mono">
              <Flame className="w-4 h-4 text-yellow-400" />
              <span>
                Кардио: {dayInfo.cardio.minutes} мин ({dayInfo.cardio.kind})
              </span>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-mono font-bold text-yellow-400">
              <input
                type="checkbox"
                checked={activeSession.cardioDone ?? false}
                onChange={(e) => {
                  const checked = e.target.checked;
                  updateSession((s) => ({ ...s, cardioDone: checked }));
                }}
                className="w-4 h-4 rounded-none text-yellow-400 bg-black border border-yellow-400 focus:ring-0"
              />
              <span>Выполнено</span>
            </label>
          </div>
        )}
      </div>

      {/* Exercises Accordion */}
      <div className="space-y-4">
        {activeSession.entries.map((entry, entryIndex) => {
          const slot = program.slots.find((s) => s.id === entry.slotId);
          if (!slot) return null;

          const isCollapsed = collapsedSlots[slot.id] ?? false;
          const rx = entry.rxSnapshot;
          const currentVariantIndex = entry.variant ?? 0;
          const currentVariant = rx.opts[currentVariantIndex] ?? rx.opts[0];

          // Compute reference e1RM for this lift
          const { value: refE1rm, check: refCheck } = getCurrentLiftE1RM(
            sessions,
            slot.lift,
            program,
            settings
          );

          // Compute suggestion
          const suggestion =
            refE1rm > 0
              ? suggest(slot, entry.zone, currentVariantIndex, rx, refE1rm, settings)
              : null;

          // Check if this date is the next upcoming session for this slot
          const isNextSession = isNextUpcomingSessionForSlot(
            program,
            slot.id,
            activeSession.date,
            todayStr
          );

          // Get last logged sets for "Как в прошлый раз"
          const lastLogged = getLastLoggedSets(sessions, slot.id, program);

          // Handler: Accept Suggestion
          const handleAcceptSuggestion = () => {
            if (!suggestion) return;
            updateSession((s) => {
              const newEntries = [...s.entries];
              const cur = newEntries[entryIndex];
              const updatedSets: SetLog[] = cur.sets.map((set) => {
                if (set.type === 'work' && !set.done) {
                  return {
                    ...set,
                    weight: suggestion.weight,
                    reps: typeof suggestion.reps === 'number' ? suggestion.reps : suggestion.reps[1],
                  };
                }
                return set;
              });
              newEntries[entryIndex] = { ...cur, sets: updatedSets };
              return { ...s, entries: newEntries };
            });
          };

          // Handler: Copy Last Time
          const handleCopyLastTime = () => {
            if (!lastLogged || lastLogged.length === 0) return;
            updateSession((s) => {
              const newEntries = [...s.entries];
              const cur = newEntries[entryIndex];
              const updatedSets: SetLog[] = cur.sets.map((set, idx) => {
                const prevSet = lastLogged[idx] ?? lastLogged[lastLogged.length - 1];
                if (!set.done && prevSet) {
                  return {
                    ...set,
                    weight: prevSet.weight,
                    reps: prevSet.reps,
                  };
                }
                return set;
              });
              newEntries[entryIndex] = { ...cur, sets: updatedSets };
              return { ...s, entries: newEntries };
            });
          };

          // Handler: Apply quick initial e1RM
          const handleApplyQuickE1rm = () => {
            const w = parseFloat(quickWeight);
            const r = parseInt(quickReps, 10);
            const rpeVal = parseFloat(quickRpe);
            if (!isNaN(w) && !isNaN(r) && !isNaN(rpeVal)) {
              const calc = calcE1RM(w, r, rpeVal, settings.formula);
              if (calc > 0) {
                updateSession((s) => {
                  const newEntries = [...s.entries];
                  const cur = newEntries[entryIndex];
                  const sets = [...cur.sets];
                  if (sets.length > 0) {
                    sets[0] = { ...sets[0], weight: w, reps: r, done: true };
                  }
                  newEntries[entryIndex] = { ...cur, sets };
                  return { ...s, entries: newEntries };
                });
                setQuickCalcOpen(null);
                setQuickWeight('');
                setQuickReps('');
              }
            }
          };

          return (
            <div
              key={slot.id}
              className={`border-2 rounded-none bg-black transition-colors ${
                entry.skipped
                  ? 'border-neutral-800 opacity-50'
                  : 'border-yellow-500/40 hover:border-yellow-400'
              }`}
            >
              {/* Exercise Header */}
              <div className="p-3.5 flex items-start justify-between gap-2">
                <div
                  className="flex-1 cursor-pointer select-none"
                  onClick={() => toggleSlotCollapse(slot.id)}
                >
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-black text-base sm:text-lg text-white uppercase tracking-tight">
                      {slot.name}
                    </span>
                    {slot.kind === 'main' && (
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 bg-yellow-400 text-black">
                        База
                      </span>
                    )}
                    {slot.kind === 'warmup' && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 bg-neutral-800 text-neutral-300">
                        Разминка
                      </span>
                    )}
                    {slot.optional && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 border border-yellow-500/50 text-yellow-400">
                        Опция
                      </span>
                    )}
                    {entry.skipped && (
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 bg-neutral-900 text-neutral-400 border border-neutral-700">
                        Пропущено
                      </span>
                    )}
                  </div>

                  {/* Prescription */}
                  <div className="text-xs text-neutral-400 font-mono flex items-center gap-2 flex-wrap">
                    <span>
                      План:{' '}
                      <strong className="text-white">
                        {currentVariant[0]}×{Array.isArray(currentVariant[1]) ? `${currentVariant[1][0]}-${currentVariant[1][1]}` : currentVariant[1]}
                      </strong>
                    </span>
                    {rx.rpe && (
                      <span>
                        · RPE <strong className="text-yellow-400">{rx.rpe[0]}–{rx.rpe[1]}</strong>
                      </span>
                    )}
                    {rx.cap != null && (
                      <span>
                        · Потолок <strong className="text-white">&lt;{Math.round(rx.cap * 100)}%</strong>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleSlotCollapse(slot.id)}
                    className="p-2 text-yellow-400 hover:text-white rounded-none hover:bg-neutral-900 border border-transparent hover:border-neutral-800"
                  >
                    {isCollapsed ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronUp className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {!isCollapsed && (
                <div className="px-3 sm:px-4 pb-4 border-t border-yellow-500/20 pt-3">
                  {/* Variant Switcher */}
                  {rx.opts.length > 1 && (
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-[11px] font-mono uppercase text-neutral-400 font-bold">Схема:</span>
                      <div className="flex gap-1.5">
                        {rx.opts.map((opt, optIdx) => (
                          <button
                            key={optIdx}
                            onClick={() => {
                              updateSession((s) => {
                                const newEntries = [...s.entries];
                                const cur = newEntries[entryIndex];
                                let newSets = [...cur.sets];
                                const targetSetsCount = opt[0];
                                if (newSets.length < targetSetsCount) {
                                  while (newSets.length < targetSetsCount) {
                                    newSets.push({ type: 'work', done: false });
                                  }
                                }
                                newEntries[entryIndex] = {
                                  ...cur,
                                  variant: optIdx,
                                  sets: newSets,
                                };
                                return { ...s, entries: newEntries };
                              });
                            }}
                            className={`px-3 py-1 text-xs font-mono font-bold rounded-none uppercase transition-colors border ${
                              currentVariantIndex === optIdx
                                ? 'bg-yellow-400 text-black border-yellow-400'
                                : 'bg-black text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
                            }`}
                          >
                            {opt[0]}×{Array.isArray(opt[1]) ? `${opt[1][0]}-${opt[1][1]}` : opt[1]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestion & Fast Action Banner */}
                  {slot.kind !== 'warmup' && (
                    <div
                      className={`mb-4 p-3 rounded-none border ${
                        isNextSession
                          ? 'border-yellow-400 bg-neutral-950 shadow-[0_0_10px_rgba(250,204,21,0.15)]'
                          : 'border-yellow-500/30 bg-black'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Sparkles className="w-4 h-4 text-yellow-400 shrink-0" />
                            {suggestion ? (
                              <span className="text-xs sm:text-sm font-black text-white font-mono uppercase">
                                ПОДСКАЗКА:{' '}
                                <span className="text-yellow-400 text-base font-black">
                                  {suggestion.weight} кг
                                </span>{' '}
                                × {Array.isArray(suggestion.reps) ? `${suggestion.reps[0]}-${suggestion.reps[1]}` : suggestion.reps} повт.
                              </span>
                            ) : (
                              <span className="text-xs text-neutral-400 font-mono">
                                Нет истории для расчёта e1RM
                              </span>
                            )}

                            {isNextSession && (
                              <span className="text-[10px] font-mono font-black px-1.5 py-0.2 bg-yellow-400 text-black uppercase tracking-wider">
                                → СЛЕДУЮЩАЯ
                              </span>
                            )}
                            {refCheck && (
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 border border-yellow-400 text-yellow-400 uppercase">
                                Проверь ввод
                              </span>
                            )}
                          </div>

                          {suggestion && (
                            <p className="text-[11px] text-neutral-400 mt-1 font-mono">
                              {suggestion.explanation}
                            </p>
                          )}
                        </div>

                        {/* Fast Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 mt-1 sm:mt-0">
                          {suggestion && (
                            <button
                              onClick={handleAcceptSuggestion}
                              className="px-3 py-2 bg-yellow-400 hover:bg-yellow-300 text-black rounded-none text-xs font-black uppercase tracking-wider border border-yellow-400 active:scale-95 transition-all flex items-center gap-1 shadow"
                              title="Принять подсказку"
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                              <span>Принять подсказку</span>
                            </button>
                          )}

                          {lastLogged && (
                            <button
                              onClick={handleCopyLastTime}
                              className="px-2.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 rounded-none text-xs font-mono font-bold uppercase tracking-wider border border-neutral-700 active:scale-95 transition-all flex items-center gap-1"
                              title="Как в прошлый раз"
                            >
                              <History className="w-3.5 h-3.5 text-yellow-400" />
                              <span>Как в прошлый раз</span>
                            </button>
                          )}

                          {!suggestion && (
                            <button
                              onClick={() =>
                                setQuickCalcOpen(quickCalcOpen === slot.id ? null : slot.id)
                              }
                              className="px-2.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-yellow-400 border border-yellow-500/50 rounded-none text-xs font-mono font-bold uppercase active:scale-95 transition-all flex items-center gap-1"
                            >
                              <Info className="w-3.5 h-3.5" />
                              <span>Ввод 1ПМ</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Quick Calc */}
                      {quickCalcOpen === slot.id && (
                        <div className="mt-3 pt-3 border-t border-yellow-500/30 flex flex-wrap items-center gap-2">
                          <input
                            type="number"
                            placeholder="Вес (кг)"
                            value={quickWeight}
                            onChange={(e) => setQuickWeight(e.target.value)}
                            className="w-24 h-10 px-2 bg-black border border-neutral-700 text-white font-mono text-xs rounded-none focus:border-yellow-400 focus:outline-none"
                          />
                          <input
                            type="number"
                            placeholder="Повторы"
                            value={quickReps}
                            onChange={(e) => setQuickReps(e.target.value)}
                            className="w-20 h-10 px-2 bg-black border border-neutral-700 text-white font-mono text-xs rounded-none focus:border-yellow-400 focus:outline-none"
                          />
                          <select
                            value={quickRpe}
                            onChange={(e) => setQuickRpe(e.target.value)}
                            className="h-10 px-2 bg-black border border-neutral-700 text-white font-mono text-xs rounded-none focus:border-yellow-400 focus:outline-none"
                          >
                            <option value="10">RPE 10</option>
                            <option value="9">RPE 9</option>
                            <option value="8">RPE 8</option>
                            <option value="7">RPE 7</option>
                          </select>
                          <button
                            onClick={handleApplyQuickE1rm}
                            className="h-10 px-3 bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase tracking-wider text-xs rounded-none border border-yellow-400"
                          >
                            Применить
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Exercise RPE Chips (Strict Rectangles) */}
                  <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
                    <span className="text-[11px] font-mono font-bold text-yellow-400 uppercase tracking-wider shrink-0">
                      RPE:
                    </span>
                    <div className="flex items-center gap-1">
                      {RPE_CHIPS.map((chipVal) => {
                        const isSelected = entry.rpe === chipVal;
                        return (
                          <button
                            key={chipVal}
                            onClick={() => {
                              updateSession((s) => {
                                const newEntries = [...s.entries];
                                newEntries[entryIndex] = {
                                  ...newEntries[entryIndex],
                                  rpe: isSelected ? undefined : chipVal,
                                };
                                return { ...s, entries: newEntries };
                              });
                            }}
                            className={`min-w-[36px] h-8 px-1.5 font-mono text-xs font-black uppercase rounded-none transition-all border ${
                              isSelected
                                ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]'
                                : 'bg-black text-neutral-400 border-neutral-800 hover:border-neutral-600 hover:text-white'
                            }`}
                          >
                            {chipVal}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sets Table - Mobile Optimized with >= 46px touch targets */}
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-12 gap-1.5 text-[10px] font-mono font-black text-neutral-400 px-1 uppercase tracking-widest">
                      <div className="col-span-2 text-center">№ / ТИП</div>
                      <div className="col-span-4 text-center">ВЕС (КГ)</div>
                      <div className="col-span-3 text-center">ПОВТ</div>
                      <div className="col-span-2 text-center">✓</div>
                      <div className="col-span-1 text-center"></div>
                    </div>

                    {entry.sets.map((set, setIdx) => {
                      const placeholderWeight = suggestion ? `${suggestion.weight}` : '';
                      const placeholderReps = suggestion
                        ? `${Array.isArray(suggestion.reps) ? suggestion.reps[1] : suggestion.reps}`
                        : '';

                      return (
                        <div
                          key={setIdx}
                          className={`grid grid-cols-12 gap-1.5 items-center p-1 rounded-none border transition-colors ${
                            set.done
                              ? 'bg-neutral-950 border-yellow-400/80 shadow-[0_0_6px_rgba(250,204,21,0.15)]'
                              : 'bg-black border-neutral-800 hover:border-neutral-700'
                          }`}
                        >
                          {/* Set number & type button */}
                          <div className="col-span-2 flex items-center justify-center gap-1">
                            <span className="text-xs font-mono font-bold text-neutral-400">
                              {setIdx + 1}
                            </span>
                            <button
                              onClick={() => {
                                const cycleTypes: SetType[] = ['work', 'attack', 'drop', 'warmup'];
                                const nextIdx = (cycleTypes.indexOf(set.type) + 1) % cycleTypes.length;
                                const nextType = cycleTypes[nextIdx];
                                updateSession((s) => {
                                  const newEntries = [...s.entries];
                                  const curSets = [...newEntries[entryIndex].sets];
                                  curSets[setIdx] = { ...curSets[setIdx], type: nextType };
                                  newEntries[entryIndex] = { ...newEntries[entryIndex], sets: curSets };
                                  return { ...s, entries: newEntries };
                                });
                              }}
                              className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-none ${
                                SET_TYPE_LABELS[set.type]?.badge ?? 'bg-black text-white border border-neutral-700'
                              }`}
                              title="Сменить тип"
                            >
                              {SET_TYPE_LABELS[set.type]?.label ?? 'Р'}
                            </button>
                          </div>

                          {/* Weight input - 48px height, strict corners, bright yellow placeholder */}
                          <div className="col-span-4">
                            <input
                              type="number"
                              step="any"
                              inputMode="decimal"
                              placeholder={placeholderWeight}
                              value={set.weight ?? ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                updateSession((s) => {
                                  const newEntries = [...s.entries];
                                  const curSets = [...newEntries[entryIndex].sets];
                                  curSets[setIdx] = { ...curSets[setIdx], weight: val };
                                  newEntries[entryIndex] = { ...newEntries[entryIndex], sets: curSets };
                                  return { ...s, entries: newEntries };
                                });
                              }}
                              className="w-full h-12 px-2 text-center bg-black border border-neutral-700 rounded-none text-base font-black font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors"
                            />
                          </div>

                          {/* Reps input - 48px height */}
                          <div className="col-span-3">
                            <input
                              type="number"
                              inputMode="numeric"
                              placeholder={placeholderReps}
                              value={set.reps ?? ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                                updateSession((s) => {
                                  const newEntries = [...s.entries];
                                  const curSets = [...newEntries[entryIndex].sets];
                                  curSets[setIdx] = { ...curSets[setIdx], reps: val };
                                  newEntries[entryIndex] = { ...newEntries[entryIndex], sets: curSets };
                                  return { ...s, entries: newEntries };
                                });
                              }}
                              className="w-full h-12 px-2 text-center bg-black border border-neutral-700 rounded-none text-base font-black font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors"
                            />
                          </div>

                          {/* Done Checkbox button - 48px touch target */}
                          <div className="col-span-2 flex justify-center">
                            <button
                              onClick={() => {
                                updateSession((s) => {
                                  const newEntries = [...s.entries];
                                  const curSets = [...newEntries[entryIndex].sets];
                                  const wasDone = curSets[setIdx].done;
                                  let w = curSets[setIdx].weight;
                                  let r = curSets[setIdx].reps;
                                  if (!wasDone) {
                                    if (w == null && suggestion) w = suggestion.weight;
                                    if (r == null && suggestion) {
                                      r = typeof suggestion.reps === 'number' ? suggestion.reps : suggestion.reps[1];
                                    }
                                  }
                                  curSets[setIdx] = {
                                    ...curSets[setIdx],
                                    weight: w,
                                    reps: r,
                                    done: !wasDone,
                                  };
                                  newEntries[entryIndex] = { ...newEntries[entryIndex], sets: curSets };
                                  return { ...s, entries: newEntries };
                                });
                              }}
                              className={`w-12 h-12 rounded-none flex items-center justify-center border transition-all ${
                                set.done
                                  ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.4)]'
                                  : 'bg-black text-neutral-600 border-neutral-800 hover:border-yellow-400/50 hover:text-neutral-300'
                              }`}
                            >
                              <Check className={`w-6 h-6 ${set.done ? 'stroke-[3.5]' : 'stroke-2'}`} />
                            </button>
                          </div>

                          {/* Delete Set */}
                          <div className="col-span-1 flex justify-center">
                            <button
                              onClick={() => {
                                updateSession((s) => {
                                  const newEntries = [...s.entries];
                                  const curSets = newEntries[entryIndex].sets.filter((_, i) => i !== setIdx);
                                  newEntries[entryIndex] = { ...newEntries[entryIndex], sets: curSets };
                                  return { ...s, entries: newEntries };
                                });
                              }}
                              className="p-2 text-neutral-600 hover:text-yellow-400 transition-colors"
                              title="Удалить"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Set & Skip Exercise */}
                  <div className="mt-3 flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-neutral-900">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          updateSession((s) => {
                            const newEntries = [...s.entries];
                            const curSets = [...newEntries[entryIndex].sets];
                            curSets.push({ type: 'work', done: false });
                            newEntries[entryIndex] = { ...newEntries[entryIndex], sets: curSets };
                            return { ...s, entries: newEntries };
                          });
                        }}
                        className="px-3.5 py-2 bg-neutral-950 hover:bg-neutral-900 text-yellow-400 rounded-none text-xs font-mono font-bold uppercase tracking-wider border border-yellow-500/40 flex items-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>+ Подход</span>
                      </button>

                      <button
                        onClick={() => {
                          updateSession((s) => {
                            const newEntries = [...s.entries];
                            const curSets = [...newEntries[entryIndex].sets];
                            curSets.push({ type: 'warmup', done: false });
                            newEntries[entryIndex] = { ...newEntries[entryIndex], sets: curSets };
                            return { ...s, entries: newEntries };
                          });
                        }}
                        className="px-3 py-2 bg-black hover:bg-neutral-950 text-neutral-400 rounded-none text-xs font-mono uppercase tracking-wider border border-neutral-800 flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Разминка</span>
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        updateSession((s) => {
                          const newEntries = [...s.entries];
                          const cur = newEntries[entryIndex];
                          newEntries[entryIndex] = { ...cur, skipped: !cur.skipped };
                          return { ...s, entries: newEntries };
                        });
                      }}
                      className={`px-3 py-2 rounded-none text-xs font-mono uppercase tracking-wider border transition-colors ${
                        entry.skipped
                          ? 'bg-neutral-900 text-yellow-400 border-yellow-400'
                          : 'text-neutral-500 border-transparent hover:text-neutral-300 hover:border-neutral-800'
                      }`}
                    >
                      {entry.skipped ? 'Возобновить' : 'Пропустить'}
                    </button>
                  </div>

                  {/* Note */}
                  <div className="mt-3">
                    <input
                      type="text"
                      placeholder="Заметка к упражнению (хват, скамья, ощущения)..."
                      value={entry.note ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateSession((s) => {
                          const newEntries = [...s.entries];
                          newEntries[entryIndex] = { ...newEntries[entryIndex], note: val };
                          return { ...s, entries: newEntries };
                        });
                      }}
                      className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-none text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-yellow-400 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* General Note & Finish Button */}
      <div className="mt-5 bg-black border-2 border-yellow-400 rounded-none p-4 shadow">
        <label className="block text-xs font-mono font-black text-yellow-400 mb-2 uppercase tracking-widest">
          Заметка к тренировке
        </label>
        <textarea
          rows={2}
          placeholder="Общее самочувствие, сон, питание..."
          value={activeSession.note ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            updateSession((s) => ({ ...s, note: val }));
          }}
          className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-none text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-yellow-400"
        />

        <div className="mt-4">
          {onFinish && (
            <button
              onClick={onFinish}
              className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase tracking-widest text-sm rounded-none border-2 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>Завершить тренировку</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Rest Timer */}
      <RestTimer />
    </div>
  );
};
