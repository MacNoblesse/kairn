import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { StateStore } from './stateStore';

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kairn-store-'));
}

test('lecture initiale : rev 0, aucun état', () => {
  const s = new StateStore(tmp());
  assert.deepEqual(s.read(), { rev: 0, updatedAt: null, state: null });
});

test('écriture puis relecture après « redémarrage » (nouvelle instance, même dossier)', async () => {
  const dir = tmp();
  const r = await new StateStore(dir).save(0, { flashcards: [{ id: 'a' }] });
  assert.ok(r.ok && r.rev === 1);
  const doc = new StateStore(dir).read();
  assert.equal(doc.rev, 1);
  assert.deepEqual(doc.state, { flashcards: [{ id: 'a' }] });
});

test('version périmée : refusée (409) et rien n’est écrasé', async () => {
  const s = new StateStore(tmp());
  await s.save(0, { v: 1 });
  await s.save(1, { v: 2 });
  const stale = await s.save(1, { v: 'obsolète' });
  assert.equal(stale.ok, false);
  assert.deepEqual(s.read().state, { v: 2 });
});

test('écritures simultanées : une seule gagne, pas de corruption', async () => {
  const s = new StateStore(tmp());
  const results = await Promise.all([s.save(0, { a: 1 }), s.save(0, { b: 2 }), s.save(0, { c: 3 })]);
  assert.equal(results.filter((r) => r.ok).length, 1);
  assert.equal(s.read().rev, 1);
});

test('instantané quotidien de la version précédente, 14 jours conservés', async () => {
  const dir = tmp();
  const s = new StateStore(dir);
  const bdir = path.join(dir, 'backups');
  fs.writeFileSync(path.join(bdir, 'state-2026-01-01.json'), '{}');
  await s.save(0, { v: 1 }, new Date(2026, 10, 20, 10));
  await s.save(1, { v: 2 }, new Date(2026, 10, 21, 10));
  await s.save(2, { v: 3 }, new Date(2026, 10, 21, 18));
  const files = fs.readdirSync(bdir).sort();
  assert.deepEqual(files, ['state-2026-11-21.json']); // ancien supprimé ; 20/11 = 1ʳᵉ écriture (rien à copier)
  const snap = JSON.parse(fs.readFileSync(path.join(bdir, 'state-2026-11-21.json'), 'utf8'));
  assert.deepEqual(snap.state, { v: 1 }); // version d'avant la première écriture du jour
});

test('fichiers temporaires orphelins nettoyés au démarrage', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'state.json.123.456.tmp'), 'x');
  new StateStore(dir);
  assert.ok(!fs.existsSync(path.join(dir, 'state.json.123.456.tmp')));
});
