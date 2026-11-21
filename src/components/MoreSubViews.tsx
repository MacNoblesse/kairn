import { apiUrl } from '../utils/apiBase';
import { RemindersSection } from './RemindersSection';
import { useState, useRef, useEffect } from 'react';
import type {
  DomainId,
  JobApplication,
  LaterIdea,
  Runbook,
  SpecialPreviewFlags,
  UserProfile,
} from '../types/kairn';
import { designTokens } from '../theme/tokens';
import { EmptyState } from './SpecialStates';
import {
  Copy,
  Check,
  Plus,
  Trash2,
  Mic,
  Square,
  Sparkles,
  Sun,
  Moon,
  Inbox,
  CheckCircle2,
  Circle,
} from './Icons';

/* ---------------- 1. FICHES (RUNBOOKS) ---------------- */
export function RunbooksView({
  runbooks,
  onAddRunbook,
}: {
  runbooks: Runbook[];
  onAddRunbook: (rb: Runbook) => void;
}) {
  const [filter, setFilter] = useState<'all' | DomainId>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [commands, setCommands] = useState('');
  const [domain, setDomain] = useState<DomainId>('devops');

  const filtered = filter === 'all' ? runbooks : runbooks.filter((r) => r.domain === filter);

  function copyCommands(id: string, text: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !commands.trim()) return;
    const labels: Record<DomainId, string> = {
      devops: 'DevOps',
      cloud: 'Cloud & K8s',
      cyber: 'Cybersécurité',
      linux: 'Linux',
    };
    onAddRunbook({
      id: `rb-${Date.now()}`,
      title: title.trim(),
      domain,
      domainLabel: labels[domain],
      summary: summary.trim() || 'Fiche mémo personnalisée.',
      commands: commands.trim(),
    });
    setTitle('');
    setSummary('');
    setCommands('');
    setShowForm(false);
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--kairn-surface-high)]">
          {(
            [
              { id: 'all', label: 'Toutes' },
              { id: 'devops', label: 'DevOps' },
              { id: 'cloud', label: 'Cloud' },
              { id: 'cyber', label: 'Cyber' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`min-h-[40px] px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filter === tab.id
                  ? 'bg-[var(--kairn-surface)] text-[var(--kairn-text)] font-semibold shadow-sm'
                  : 'text-[var(--kairn-text-muted)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="min-h-[44px] px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Nouvelle fiche</span>
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-5 space-y-3"
        >
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de la fiche (ex. Nettoyer les volumes Docker)"
            className="w-full min-h-[44px] px-3.5 rounded-xl border border-[var(--kairn-border)] bg-[var(--kairn-surface-low)] text-sm text-[var(--kairn-text)]"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value as DomainId)}
              aria-label="Domaine"
              className="min-h-[44px] px-3.5 rounded-xl border border-[var(--kairn-border)] bg-[var(--kairn-surface-low)] text-sm text-[var(--kairn-text)]"
            >
              <option value="devops">DevOps</option>
              <option value="cloud">Cloud & K8s</option>
              <option value="cyber">Cybersécurité</option>
              <option value="linux">Linux</option>
            </select>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Courte description"
              className="min-h-[44px] px-3.5 rounded-xl border border-[var(--kairn-border)] bg-[var(--kairn-surface-low)] text-sm text-[var(--kairn-text)]"
            />
          </div>
          <textarea
            required
            rows={3}
            value={commands}
            onChange={(e) => setCommands(e.target.value)}
            placeholder="Commandes..."
            className="w-full p-3.5 rounded-xl border border-[var(--kairn-border)] bg-[var(--kairn-surface-low)] text-xs font-mono text-[var(--kairn-text)]"
          />
          <button
            type="submit"
            className="min-h-[48px] px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold cursor-pointer"
          >
            Enregistrer la fiche
          </button>
        </form>
      )}

      <div className="space-y-4">
        {filtered.map((rb) => (
          <article
            key={rb.id}
            className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-5 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-[var(--kairn-text-muted)]">
                  {rb.domainLabel}
                </p>
                <h2 className="text-base font-semibold text-[var(--kairn-text)] mt-0.5">
                  {rb.title}
                </h2>
                <p className="text-sm text-[var(--kairn-text-muted)] mt-1">{rb.summary}</p>
              </div>
              <button
                type="button"
                onClick={() => copyCommands(rb.id, rb.commands)}
                aria-label={`Copier les commandes de ${rb.title}`}
                className="min-w-[44px] min-h-[44px] px-3 rounded-xl bg-[var(--kairn-surface-high)] text-xs font-medium text-[var(--kairn-text)] inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copiedId === rb.id ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" aria-hidden="true" />
                    <span>Copié</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" aria-hidden="true" />
                    <span>Copier</span>
                  </>
                )}
              </button>
            </div>
            <pre className="rounded-xl bg-[var(--kairn-surface-high)] p-3.5 text-xs font-mono text-[var(--kairn-text)] overflow-x-auto leading-relaxed">
              <code>{rb.commands}</code>
            </pre>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ---------------- 2. CARRIÈRE ---------------- */
const STATUS_ORDER: JobApplication['status'][] = [
  'À postuler',
  'Envoyée',
  'Entretien',
  'Offre',
];

export function CareerView({
  applications,
  linkedinDraft,
  isOffline,
  onAddApplication,
  onCycleStatus,
  onDeleteApplication,
  onUpdateLinkedin,
}: {
  applications: JobApplication[];
  linkedinDraft: string;
  isOffline: boolean;
  onAddApplication: (app: JobApplication) => void;
  onCycleStatus: (id: string) => void;
  onDeleteApplication: (id: string) => void;
  onUpdateLinkedin: (draft: string) => void;
}) {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [improving, setImproving] = useState(false);
  const [copiedPost, setCopiedPost] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;
    onAddApplication({
      id: `job-${Date.now()}`,
      company: company.trim(),
      role: role.trim(),
      status: 'À postuler',
      updatedAt: 'Aujourd’hui',
    });
    setCompany('');
    setRole('');
  }

  async function handleImprovePost() {
    if (isOffline || !linkedinDraft.trim()) {
      setAiError('Reconnectez-vous pour améliorer votre brouillon avec l’IA.');
      return;
    }
    setImproving(true);
    setAiError(null);
    try {
      const res = await fetch(apiUrl('/api/ai/coach'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Améliore ce court post LinkedIn d'étudiant IT en français pour le rendre clair, authentique et professionnel sans excès marketing :\n\n${linkedinDraft}`,
            },
          ],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erreur IA');
      if (data.reply) onUpdateLinkedin(data.reply);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Service IA indisponible.');
    } finally {
      setImproving(false);
    }
  }

  function handleCopyPost() {
    navigator.clipboard?.writeText(linkedinDraft).catch(() => {});
    setCopiedPost(true);
    setTimeout(() => setCopiedPost(false), 1600);
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Job Tracker */}
      <section className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-5 sm:p-6 space-y-4">
        <h2 className="text-base font-semibold text-[var(--kairn-text)]">
          Suivi des candidatures
        </h2>

        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Entreprise (ex. OVHcloud)"
            aria-label="Entreprise"
            className="sm:col-span-4 min-h-[48px] px-3.5 rounded-xl border border-[var(--kairn-border)] bg-[var(--kairn-surface-low)] text-sm text-[var(--kairn-text)]"
          />
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Poste visé (ex. Alternance DevOps)"
            aria-label="Poste visé"
            className="sm:col-span-6 min-h-[48px] px-3.5 rounded-xl border border-[var(--kairn-border)] bg-[var(--kairn-surface-low)] text-sm text-[var(--kairn-text)]"
          />
          <button
            type="submit"
            className="sm:col-span-2 min-h-[48px] px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold cursor-pointer"
          >
            Ajouter
          </button>
        </form>

        {applications.length === 0 ? (
          <EmptyState
            title="Aucune candidature enregistrée"
            description="Ajoutez votre première entreprise cible pour suivre vos démarches sereinement."
          />
        ) : (
          <div className="divide-y divide-[var(--kairn-border)] border-t border-[var(--kairn-border)]">
            {applications.map((app) => (
              <div
                key={app.id}
                className="py-3.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--kairn-text)] truncate">
                    {app.company}
                  </p>
                  <p className="text-xs text-[var(--kairn-text-muted)] truncate">
                    {app.role} · {app.updatedAt}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onCycleStatus(app.id)}
                    aria-label={`Changer le statut de ${app.company} (actuellement ${app.status})`}
                    title="Appuyer pour changer le statut"
                    className={`min-h-[40px] px-3 rounded-xl text-xs font-semibold cursor-pointer ${
                      app.status === 'Entretien' || app.status === 'Offre'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'bg-[var(--kairn-surface-high)] text-[var(--kairn-text)]'
                    }`}
                  >
                    {app.status}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteApplication(app.id)}
                    aria-label={`Supprimer ${app.company}`}
                    className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-[var(--kairn-text-muted)] hover:text-amber-500 hover:bg-[var(--kairn-surface-high)] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-[var(--kairn-text-muted)]">
          Astuce : appuyez sur un statut pour avancer ({STATUS_ORDER.join(' → ')}).
        </p>
      </section>

      {/* LinkedIn Draft */}
      <section className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[var(--kairn-text)]">
            Brouillon LinkedIn de la semaine
          </h2>
          <button
            type="button"
            onClick={handleCopyPost}
            className="min-h-[40px] px-3 rounded-xl bg-[var(--kairn-surface-high)] text-xs font-medium text-[var(--kairn-text)] inline-flex items-center gap-1.5 cursor-pointer"
          >
            {copiedPost ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedPost ? 'Copié' : 'Copier'}</span>
          </button>
        </div>

        <textarea
          rows={4}
          value={linkedinDraft}
          onChange={(e) => onUpdateLinkedin(e.target.value)}
          aria-label="Brouillon LinkedIn"
          className="w-full rounded-xl border border-[var(--kairn-border)] bg-[var(--kairn-surface-low)] p-3.5 text-sm text-[var(--kairn-text)] leading-relaxed"
        />

        {aiError && <p className="text-xs text-amber-600 dark:text-amber-300">{aiError}</p>}

        <button
          type="button"
          onClick={handleImprovePost}
          disabled={improving}
          className="min-h-[48px] px-5 rounded-xl bg-[var(--kairn-primary-soft)] text-[var(--kairn-primary)] text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" aria-hidden="true" />
          <span>{improving ? 'Amélioration...' : 'Améliorer avec le Coach IA'}</span>
        </button>
      </section>
    </div>
  );
}

/* ---------------- 3. ANGLAIS (ENREGISTREMENT VOCAL) ---------------- */
export function EnglishView() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  async function startRecording() {
    setMicError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMicError(
        'L’enregistrement vocal n’est pas disponible sur ce navigateur. Entraînez-vous à voix haute avec le chrono.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      setSeconds(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setMicError(
        'Accès au microphone refusé ou indisponible. Vous pouvez autoriser le micro dans les réglages Android.'
      );
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    if (timerRef.current) window.clearInterval(timerRef.current);
    setRecording(false);
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-6 space-y-5">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-[var(--kairn-text-muted)]">
            Exercice oral · 60 secondes
          </p>
          <h2 className="text-xl font-bold text-[var(--kairn-text)]">
            “Explain why multi-stage Docker builds improve security.”
          </h2>
          <p className="text-sm text-[var(--kairn-text-muted)] leading-relaxed">
            Parlez calmement en anglais pendant 30 à 60 secondes, puis réécoutez-vous pour vérifier
            la clarté et la prononciation.
          </p>
        </div>

        <div className="rounded-2xl bg-[var(--kairn-surface-high)] p-5 flex flex-col items-center gap-4">
          <p className="text-2xl font-bold tabular-nums text-[var(--kairn-text)]">
            {String(Math.floor(seconds / 60)).padStart(2, '0')}:
            {String(seconds % 60).padStart(2, '0')}
          </p>

          {!recording ? (
            <button
              type="button"
              onClick={startRecording}
              className="min-h-[52px] px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm inline-flex items-center gap-2 cursor-pointer"
            >
              <Mic className="w-4 h-4" aria-hidden="true" />
              <span>Enregistrer ma réponse</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="min-h-[52px] px-6 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm inline-flex items-center gap-2 cursor-pointer"
            >
              <Square className="w-4 h-4" aria-hidden="true" />
              <span>Arrêter l’enregistrement</span>
            </button>
          )}

          {micError && (
            <p className="text-xs text-amber-600 dark:text-amber-300 text-center max-w-sm">
              {micError}
            </p>
          )}

          {audioUrl && !recording && (
            <div className="w-full pt-2 space-y-2">
              <p className="text-xs font-medium text-[var(--kairn-text-muted)] text-center">
                Votre enregistrement
              </p>
              <audio controls src={audioUrl} className="w-full" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--kairn-text-muted)]">
            Vocabulaire utile pour l’entretien
          </p>
          <ul className="space-y-1.5 text-sm text-[var(--kairn-text)]">
            <li>• <strong>Attack surface</strong> : surface d’attaque</li>
            <li>• <strong>Least privilege</strong> : principe du moindre privilège</li>
            <li>• <strong>Build artifacts</strong> : fichiers compilés produits lors du build</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ---------------- 4. PLUS TARD (BOÎTE À IDÉES) ---------------- */
export function LaterView({
  ideas,
  onAddIdea,
  onToggleIdea,
  onDeleteIdea,
}: {
  ideas: LaterIdea[];
  onAddIdea: (text: string) => void;
  onToggleIdea: (id: string) => void;
  onDeleteIdea: (id: string) => void;
}) {
  const [text, setText] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onAddIdea(text.trim());
    setText('');
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-5 space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-[var(--kairn-text)]">
            Boîte à idées « Plus tard »
          </h2>
          <p className="text-sm text-[var(--kairn-text-muted)]">
            Notez ici les sujets ou outils à explorer plus tard sans quitter votre mission du jour.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex. Tester Cilium ou lire sur Zero Trust..."
            aria-label="Nouvelle idée à explorer plus tard"
            className="flex-1 min-h-[48px] px-4 rounded-xl border border-[var(--kairn-border)] bg-[var(--kairn-surface-low)] text-sm text-[var(--kairn-text)]"
          />
          <button
            type="submit"
            className="min-h-[48px] px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold cursor-pointer"
          >
            Noter
          </button>
        </form>
      </div>

      {ideas.length === 0 ? (
        <EmptyState
          icon={<Inbox className="w-6 h-6" aria-hidden="true" />}
          title="Boîte à idées vide"
          description="Capturez vos envies techniques ici dès qu’une distraction apparaît pendant une session."
        />
      ) : (
        <div className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] divide-y divide-[var(--kairn-border)] overflow-hidden">
          {ideas.map((idea) => (
            <div key={idea.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onToggleIdea(idea.id)}
                className="flex items-center gap-3 min-w-0 text-left flex-1 min-h-[44px] cursor-pointer"
              >
                {idea.done ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" aria-hidden="true" />
                ) : (
                  <Circle className="w-5 h-5 text-[var(--kairn-text-muted)] shrink-0" aria-hidden="true" />
                )}
                <div className="min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${
                      idea.done ? 'line-through text-[var(--kairn-text-muted)]' : 'text-[var(--kairn-text)]'
                    }`}
                  >
                    {idea.text}
                  </p>
                  <p className="text-xs text-[var(--kairn-text-muted)]">{idea.createdAt}</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => onDeleteIdea(idea.id)}
                aria-label={`Supprimer "${idea.text}"`}
                className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-[var(--kairn-text-muted)] hover:text-amber-500 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- 5. RÉGLAGES ---------------- */
export function SettingsView({
  profile,
  previewFlags,
  onUpdateProfile,
  onUpdatePreviewFlags,
  onOpenTokens,
}: {
  profile: UserProfile;
  previewFlags: SpecialPreviewFlags;
  onUpdateProfile: (next: Partial<UserProfile>) => void;
  onUpdatePreviewFlags: (next: Partial<SpecialPreviewFlags>) => void;
  onOpenTokens: () => void;
}) {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Theme & Profile */}
      <section className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-5 sm:p-6 space-y-5">
        <h2 className="text-base font-semibold text-[var(--kairn-text)]">
          Profil & Apparence
        </h2>

        <div className="space-y-2">
          <label htmlFor="profile-name" className="text-xs font-medium text-[var(--kairn-text-muted)]">
            Prénom
          </label>
          <input
            id="profile-name"
            type="text"
            value={profile.name}
            onChange={(e) => onUpdateProfile({ name: e.target.value })}
            className="w-full min-h-[48px] px-4 rounded-xl border border-[var(--kairn-border)] bg-[var(--kairn-surface-low)] text-sm text-[var(--kairn-text)]"
          />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-medium text-[var(--kairn-text-muted)] block">
            Thème Material Design 3
          </span>
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[var(--kairn-surface-high)]">
            <button
              type="button"
              onClick={() => onUpdateProfile({ theme: 'dark' })}
              aria-pressed={profile.theme === 'dark'}
              className={`min-h-[44px] rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 cursor-pointer ${
                profile.theme === 'dark'
                  ? 'bg-[var(--kairn-surface)] text-[var(--kairn-text)] shadow-sm font-semibold'
                  : 'text-[var(--kairn-text-muted)]'
              }`}
            >
              <Moon className="w-4 h-4" aria-hidden="true" />
              <span>Sombre</span>
            </button>
            <button
              type="button"
              onClick={() => onUpdateProfile({ theme: 'light' })}
              aria-pressed={profile.theme === 'light'}
              className={`min-h-[44px] rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 cursor-pointer ${
                profile.theme === 'light'
                  ? 'bg-[var(--kairn-surface)] text-[var(--kairn-text)] shadow-sm font-semibold'
                  : 'text-[var(--kairn-text-muted)]'
              }`}
            >
              <Sun className="w-4 h-4" aria-hidden="true" />
              <span>Clair</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="weekly-goal" className="text-xs font-medium text-[var(--kairn-text-muted)]">
            Objectif hebdomadaire : {profile.weeklyGoalDays} jours / semaine
          </label>
          <input
            id="weekly-goal"
            type="range"
            min={3}
            max={7}
            value={profile.weeklyGoalDays}
            onChange={(e) => onUpdateProfile({ weeklyGoalDays: Number(e.target.value) })}
            className="w-full accent-indigo-600"
          />
        </div>
      </section>

      <RemindersSection />

      {/* Special States Preview */}
      <section className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--kairn-text)]">
            Aperçu des états spéciaux
          </h2>
          <p className="text-xs text-[var(--kairn-text-muted)] mt-0.5">
            Permet de visualiser les états hors ligne, squelette et retour après absence.
          </p>
        </div>

        <div className="space-y-2.5">
          {[
            {
              key: 'forceOffline' as const,
              label: 'Bannière hors ligne',
              checked: previewFlags.forceOffline,
            },
            {
              key: 'forceSkeleton' as const,
              label: 'Squelette de chargement',
              checked: previewFlags.forceSkeleton,
            },
            {
              key: 'forceComeback' as const,
              label: 'Écran « Retour en douceur »',
              checked: previewFlags.forceComeback,
            },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onUpdatePreviewFlags({ [item.key]: !item.checked })}
              aria-pressed={item.checked}
              className="w-full min-h-[48px] px-4 rounded-xl border border-[var(--kairn-border)] bg-[var(--kairn-surface-low)] flex items-center justify-between text-sm font-medium text-[var(--kairn-text)] cursor-pointer"
            >
              <span>{item.label}</span>
              <span
                className={`text-xs font-semibold ${
                  item.checked ? 'text-[var(--kairn-primary)]' : 'text-[var(--kairn-text-muted)]'
                }`}
              >
                {item.checked ? 'Activé' : 'Désactivé'}
              </span>
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={onOpenTokens}
        className="w-full min-h-[48px] px-5 rounded-xl border border-[var(--kairn-border)] bg-[var(--kairn-surface)] hover:bg-[var(--kairn-surface-high)] text-sm font-semibold text-[var(--kairn-primary)] cursor-pointer"
      >
        Voir et copier les Tokens de design (React / M3)
      </button>
    </div>
  );
}

/* ---------------- 6. TOKENS DE DESIGN ---------------- */
export function DesignTokensView() {
  const [copied, setCopied] = useState(false);

  function copyJson() {
    navigator.clipboard?.writeText(JSON.stringify(designTokens, null, 2)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--kairn-text)]">
            Tokens de design Material 3
          </h2>
          <p className="text-sm text-[var(--kairn-text-muted)]">
            Couleurs, typographie, grille 8pt et rayons prêts pour React.
          </p>
        </div>
        <button
          type="button"
          onClick={copyJson}
          className="min-h-[44px] px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'JSON copié' : 'Copier JSON'}</span>
        </button>
      </div>

      {/* Color Swatches */}
      <section className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[var(--kairn-text)]">Palette Sombre & Claire</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { name: 'Fond Sombre', hex: designTokens.colors.dark.background },
            { name: 'Surface Sombre', hex: designTokens.colors.dark.surfaceContainer },
            { name: 'Indigo Primaire', hex: designTokens.colors.dark.primaryCtaBg },
            { name: 'Succès', hex: designTokens.colors.dark.success },
            { name: 'Avertissement', hex: designTokens.colors.dark.warning },
            { name: 'Fond Clair', hex: designTokens.colors.light.background },
            { name: 'Surface Claire', hex: designTokens.colors.light.surfaceContainer },
            { name: 'Bordure Claire', hex: designTokens.colors.light.outline },
          ].map((c) => (
            <div key={c.name} className="rounded-xl border border-[var(--kairn-border)] p-3 space-y-2">
              <div
                className="h-10 rounded-lg border border-black/10"
                style={{ backgroundColor: c.hex }}
              />
              <div>
                <p className="text-xs font-semibold text-[var(--kairn-text)]">{c.name}</p>
                <p className="text-[11px] font-mono text-[var(--kairn-text-muted)]">{c.hex}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Spacing & Radii */}
      <section className="rounded-[20px] border border-[var(--kairn-border)] bg-[var(--kairn-surface)] p-5 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--kairn-text)]">
          Grille 8pt, Rayons & Typographie
        </h3>
        <pre className="rounded-xl bg-[var(--kairn-surface-high)] p-4 text-xs font-mono text-[var(--kairn-text)] overflow-x-auto leading-relaxed">
          <code>
            {JSON.stringify(
              {
                typography: designTokens.typography,
                spacing: designTokens.spacing,
                radii: designTokens.radii,
              },
              null,
              2
            )}
          </code>
        </pre>
      </section>
    </div>
  );
}
