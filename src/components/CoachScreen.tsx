import { apiUrl } from '../utils/apiBase';
import { useState, useRef, useEffect } from 'react';
import type { CoachMessage, DailyMission, EnergyLevel, MissionLevel } from '../types/kairn';
import { Send, RotateCcw, Sparkles } from './Icons';

interface CoachScreenProps {
  studentName: string;
  mission: DailyMission;
  selectedLevel: MissionLevel;
  todayEnergy: EnergyLevel | null;
  messages: CoachMessage[];
  isOffline: boolean;
  pendingPrompt: string | null;
  onConsumePendingPrompt: () => void;
  onAddMessage: (msg: CoachMessage) => void;
  onResetChat: () => void;
}

const SUGGESTION_CHIPS = [
  'Explique mon erreur',
  'Donne-moi un indice',
  'Simplifie ce concept',
  'Quiz rapide DevOps',
];

export function CoachScreen({
  studentName,
  mission,
  selectedLevel,
  todayEnergy,
  messages,
  isOffline,
  pendingPrompt,
  onConsumePendingPrompt,
  onAddMessage,
  onResetChat,
}: CoachScreenProps) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, sending]);

  useEffect(() => {
    if (pendingPrompt) {
      setInput(pendingPrompt);
      onConsumePendingPrompt();
    }
  }, [pendingPrompt, onConsumePendingPrompt]);

  async function sendPrompt(textToSend: string) {
    const trimmed = textToSend.trim();
    if (!trimmed || sending) return;

    const nowLabel = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());

    const userMsg: CoachMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: nowLabel,
    };

    onAddMessage(userMsg);
    setInput('');
    setErrorNotice(null);

    if (isOffline) {
      setErrorNotice('Vous êtes hors ligne. Reconnectez-vous pour discuter avec le Coach IA.');
      return;
    }

    setSending(true);
    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const res = await fetch(apiUrl('/api/ai/coach'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          context: {
            studentName,
            missionTitle: mission.title,
            domain: mission.domainLabel,
            level: selectedLevel,
            energy: todayEnergy ?? 'non précisée',
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Le Coach IA est temporairement indisponible.');
      }

      onAddMessage({
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Intl.DateTimeFormat('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date()),
      });
    } catch (err) {
      setErrorNotice(
        err instanceof Error ? err.message : 'Erreur réseau lors de l’envoi au Coach IA.'
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-11rem)] md:h-[calc(100vh-7rem)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-[var(--kairn-border)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[var(--kairn-primary-soft)] flex items-center justify-center text-[var(--kairn-primary)] shrink-0">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-[var(--kairn-text)] truncate">
              Coach IA
            </h1>
            <p className="text-xs text-[var(--kairn-text-muted)] truncate">
              Contexte : {mission.title}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onResetChat}
          aria-label="Nouvelle conversation"
          className="min-h-[44px] px-3 rounded-xl text-xs font-medium text-[var(--kairn-text-muted)] hover:bg-[var(--kairn-surface-high)] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Réinitialiser</span>
        </button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] sm:max-w-[78%] rounded-[18px] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'bg-indigo-600 text-white'
                    : 'border border-[var(--kairn-border)] bg-[var(--kairn-surface)] text-[var(--kairn-text)]'
                }`}
              >
                {msg.content}
              </div>
              {msg.timestamp && (
                <span className="text-[11px] text-[var(--kairn-text-muted)] mt-1 px-1 tabular-nums">
                  {msg.timestamp}
                </span>
              )}
            </div>
          );
        })}

        {sending && (
          <div className="flex items-start">
            <div className="rounded-[18px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] px-4 py-3 text-sm text-[var(--kairn-text-muted)]">
              Le coach réfléchit...
            </div>
          </div>
        )}

        {errorNotice && (
          <div
            role="alert"
            className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-300"
          >
            {errorNotice}
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Contextual Suggestion Chips + Input */}
      <div className="pt-3 border-t border-[var(--kairn-border)] space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {SUGGESTION_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => sendPrompt(chip)}
              disabled={sending}
              className="min-h-[40px] px-3.5 rounded-xl border border-[var(--kairn-border)] bg-[var(--kairn-surface)] hover:bg-[var(--kairn-surface-high)] text-xs font-medium text-[var(--kairn-text)] whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendPrompt(input);
          }}
          className="flex items-center gap-2"
        >
          <label htmlFor="coach-input" className="sr-only">
            Posez une question à votre Coach IA
          </label>
          <input
            id="coach-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez une question ou collez une erreur..."
            className="flex-1 min-h-[48px] px-4 rounded-xl border border-[var(--kairn-border)] bg-[var(--kairn-surface)] text-sm text-[var(--kairn-text)] placeholder:text-[var(--kairn-text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            aria-label="Envoyer le message"
            className="min-w-[48px] min-h-[48px] rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
}
