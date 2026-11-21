import express, { Router } from 'express';
import type { StateStore } from './stateStore';

/** Routes de persistance. Montées sur /api/state. */
export function createStateRouter(store: StateStore): Router {
  const router = Router();
  // L'état contient le programme importé (~0,5 Mo) : limite dédiée, plus large que le reste de l'API.
  router.use(express.json({ limit: '10mb' }));

  router.get('/', (_req, res) => {
    try {
      res.set('Cache-Control', 'no-store').json(store.read());
    } catch (err) {
      console.error('State read error:', err);
      res.status(500).json({ error: "Lecture des données impossible (fichier d'état illisible)." });
    }
  });

  router.put('/', async (req, res) => {
    const { baseRev, state } = (req.body ?? {}) as { baseRev?: unknown; state?: unknown };
    if (typeof baseRev !== 'number' || !Number.isInteger(baseRev) || baseRev < 0) {
      res.status(400).json({ error: '"baseRev" doit être un entier positif ou nul.' });
      return;
    }
    if (!state || typeof state !== 'object' || Array.isArray(state)) {
      res.status(400).json({ error: '"state" doit être un objet.' });
      return;
    }
    try {
      const result = await store.save(baseRev, state as Record<string, unknown>);
      if (!result.ok) {
        res.status(409).json({ error: 'Version périmée.', ...result.current });
        return;
      }
      res.set('Cache-Control', 'no-store').json({ rev: result.rev, updatedAt: result.updatedAt });
    } catch (err) {
      console.error('State write error:', err);
      res.status(500).json({ error: "Écriture impossible : le volume de données est-il plein ou en lecture seule ?" });
    }
  });

  return router;
}
