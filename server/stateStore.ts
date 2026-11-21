import fs from 'node:fs';
import path from 'node:path';

/**
 * Stockage de l'état de l'application dans un fichier JSON, dans DATA_DIR (volume Docker `/data`).
 *
 *  - écriture atomique (fichier temporaire + fsync + rename) : jamais de fichier à moitié écrit ;
 *  - une révision (`rev`) qui s'incrémente à chaque écriture : un appareil qui travaille sur une
 *    version périmée est refusé (409) au lieu d'écraser les données d'un autre ;
 *  - un instantané par jour (`backups/state-AAAA-MM-JJ.json`), 14 jours conservés.
 */

export interface StoredDocument {
  rev: number;
  updatedAt: string | null;
  state: Record<string, unknown> | null;
}

export type SaveResult =
  | { ok: true; rev: number; updatedAt: string }
  | { ok: false; conflict: true; current: StoredDocument };

const STATE_FILE = 'state.json';
const BACKUP_DIR = 'backups';
const BACKUP_KEEP_DAYS = 14;

export class StateStore {
  private readonly file: string;
  private readonly backupDir: string;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(public readonly dataDir: string) {
    this.file = path.join(dataDir, STATE_FILE);
    this.backupDir = path.join(dataDir, BACKUP_DIR);
    fs.mkdirSync(this.backupDir, { recursive: true });
    // Reste d'un crash pendant l'écriture : sans danger, le vrai fichier est intact.
    for (const f of fs.readdirSync(dataDir)) {
      if (f.startsWith(`${STATE_FILE}.`) && f.endsWith('.tmp')) {
        fs.rmSync(path.join(dataDir, f), { force: true });
      }
    }
  }

  read(): StoredDocument {
    let raw: string;
    try {
      raw = fs.readFileSync(this.file, 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return { rev: 0, updatedAt: null, state: null };
      }
      throw err;
    }
    const doc = JSON.parse(raw) as StoredDocument;
    return { rev: doc.rev ?? 0, updatedAt: doc.updatedAt ?? null, state: doc.state ?? null };
  }

  /** Écritures sérialisées : deux requêtes simultanées ne se mélangent jamais. */
  save(baseRev: number, state: Record<string, unknown>, now = new Date()): Promise<SaveResult> {
    const run = this.queue.then(() => this.saveNow(baseRev, state, now));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private saveNow(baseRev: number, state: Record<string, unknown>, now: Date): SaveResult {
    const current = this.read();
    if (baseRev !== current.rev) {
      return { ok: false, conflict: true, current };
    }

    this.snapshotBeforeOverwrite(now);

    const next: StoredDocument = {
      rev: current.rev + 1,
      updatedAt: now.toISOString(),
      state,
    };
    const tmp = `${this.file}.${process.pid}.${Date.now()}.tmp`;
    const fd = fs.openSync(tmp, 'w');
    try {
      fs.writeFileSync(fd, JSON.stringify(next));
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tmp, this.file);
    return { ok: true, rev: next.rev, updatedAt: next.updatedAt as string };
  }

  private localDay(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** Copie la version précédente la première fois qu'on écrit un nouveau jour. */
  private snapshotBeforeOverwrite(now: Date) {
    if (!fs.existsSync(this.file)) return;
    const target = path.join(this.backupDir, `state-${this.localDay(now)}.json`);
    if (!fs.existsSync(target)) fs.copyFileSync(this.file, target);

    const limit = new Date(now);
    limit.setDate(limit.getDate() - BACKUP_KEEP_DAYS);
    const cutoff = `state-${this.localDay(limit)}.json`;
    for (const f of fs.readdirSync(this.backupDir)) {
      if (/^state-\d{4}-\d{2}-\d{2}\.json$/.test(f) && f < cutoff) {
        fs.rmSync(path.join(this.backupDir, f), { force: true });
      }
    }
  }

  isWritable(): boolean {
    try {
      fs.accessSync(this.dataDir, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }
}
