import { Router } from 'express';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

/** Routes IA (Gemini). Montées sur /api/ai. */
export const aiRouter = Router();
const router = aiRouter;

const MODEL_NAME = 'gemini-4-hydrogen';

function withTimeout<T>(promise: Promise<T>, ms = 10000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Délai dépassé pour la réponse IA')), ms)
    ),
  ]);
}

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

router.post('/coach', async (req, res) => {
  const ai = getAiClient();
  if (!ai) {
    res.status(503).json({
      error: "Le service Coach IA n'est pas encore configuré. Vérifiez la clé GEMINI_API_KEY dans les secrets.",
    });
    return;
  }

  try {
    const { messages, context } = req.body as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      context?: {
        studentName?: string;
        missionTitle?: string;
        domain?: string;
        level?: string;
        energy?: string;
      };
    };

    const safeMessages = Array.isArray(messages) ? messages.slice(-10) : [];
    const lastUserMessage = safeMessages[safeMessages.length - 1]?.content?.trim();
    if (!lastUserMessage) {
      res.status(400).json({ error: 'Le message est vide.' });
      return;
    }

    const systemInstruction = [
      'Tu es Kairn, un coach bienveillant, calme et rigoureux pour une étudiante ou un étudiant en informatique qui se forme au DevOps, au Cloud et à la Cybersécurité.',
      'Réponds toujours en français clair, encourageant, sans jamais culpabiliser ni utiliser de jargon inutile.',
      'Sois concis (3 à 6 phrases max ou une courte liste actionnable, avec des commandes exactes si pertinent).',
      context?.studentName ? `Prénom de l'apprenant : ${context.studentName}.` : '',
      context?.missionTitle ? `Mission du jour : ${context.missionTitle} (${context.domain ?? 'IT'}, mode ${context.level ?? 'normal'}).` : '',
      context?.energy ? `Niveau d'énergie déclaré ce matin : ${context.energy}.` : '',
    ]
      .filter(Boolean)
      .join(' ');

    const transcript = safeMessages
      .map((m) => `${m.role === 'user' ? 'Étudiant' : 'Coach'}: ${m.content}`)
      .join('\n');

    const response = await withTimeout(
      ai.models.generateContent({
        model: MODEL_NAME,
        contents: transcript,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      })
    );

    const reply = response.text?.trim();
    if (!reply) {
      res.status(502).json({ error: 'Réponse vide du Coach IA.' });
      return;
    }

    res.json({ reply });
  } catch (err) {
    console.error('Coach API error:', err);
    res.status(500).json({
      error: 'Impossible de joindre le Coach IA pour le moment. Réessayez dans un instant.',
    });
  }
});

router.post('/briefing', async (req, res) => {
  const ai = getAiClient();
  if (!ai) {
    res.status(503).json({
      error: "Clé API manquante pour générer un nouveau briefing.",
    });
    return;
  }

  try {
    const { missionTitle, domain, level, objective } = req.body as {
      missionTitle: string;
      domain: string;
      level: string;
      objective: string;
    };

    const response = await withTimeout(
      ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Génère un briefing pédagogique concis en français pour la mission "${missionTitle}" (domaine : ${domain}, niveau de session : ${level}). Objectif : ${objective}. Donne 3 notions clés et 3 erreurs fréquentes à éviter.`,
        config: {
          systemInstruction:
            'Tu es un mentor DevOps, Cloud et Cybersécurité. Style calme, pratique, concis en français.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              keyNotions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 notions clés courtes et actionnables',
              },
              commonMistakes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 erreurs fréquentes à éviter',
              },
            },
            required: ['keyNotions', 'commonMistakes'],
          },
        },
      })
    );

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json({
      keyNotions: Array.isArray(parsed.keyNotions) ? parsed.keyNotions.slice(0, 4) : [],
      commonMistakes: Array.isArray(parsed.commonMistakes) ? parsed.commonMistakes.slice(0, 4) : [],
    });
  } catch (err) {
    console.error('Briefing API error:', err);
    res.status(500).json({
      error: 'Erreur lors de la génération du briefing.',
    });
  }
});

router.post('/hint', async (req, res) => {
  const ai = getAiClient();
  if (!ai) {
    res.status(503).json({ error: 'Service IA indisponible.' });
    return;
  }

  try {
    const { missionTitle, currentStep, hintLevel, userNotes } = req.body as {
      missionTitle: string;
      currentStep: string;
      hintLevel: number;
      userNotes?: string;
    };

    const response = await withTimeout(
      ai.models.generateContent({
        model: MODEL_NAME,
        contents: `L'étudiant est bloqué sur la mission "${missionTitle}", étape : "${currentStep}". Indice demandé niveau ${hintLevel}/3. Notes actuelles de l'étudiant : "${userNotes || 'aucune'}". Donne un seul indice progressif et encourageant en français (2-3 phrases max).`,
        config: {
          systemInstruction:
            'Tu donnes des indices progressifs sans révéler toute la solution d’un coup au niveau 1, puis plus précis au niveau 2 et 3. Ton calme et encourageant en français.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      })
    );

    res.json({ hint: response.text?.trim() || 'Vérifiez votre dernière commande étape par étape.' });
  } catch (err) {
    console.error('Hint API error:', err);
    res.status(500).json({ error: 'Impossible de générer un indice.' });
  }
});

router.post('/verify', async (req, res) => {
  const ai = getAiClient();
  if (!ai) {
    res.status(503).json({ error: 'Service IA indisponible pour la vérification.' });
    return;
  }

  try {
    const { missionTitle, objective, stepsCompleted, totalSteps, submissionText } = req.body as {
      missionTitle: string;
      objective: string;
      stepsCompleted: number;
      totalSteps: number;
      submissionText: string;
    };

    const response = await withTimeout(
      ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Mission : "${missionTitle}". Objectif : "${objective}". Étapes cochées : ${stepsCompleted}/${totalSteps}. Réponse / extrait soumis par l'étudiant :\n"""\n${submissionText}\n"""\nÉvalue avec bienveillance mais rigueur si le travail répond à l'objectif.`,
        config: {
          systemInstruction:
            'Tu es un évaluateur bienveillant en DevOps/Cloud/Cybersécurité. Réponds en français uniquement. Ne culpabilise jamais en cas d’échec : indique clairement ce qui est acquis, ce qui manque, et un indice doux.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              passed: { type: Type.BOOLEAN },
              passedChecks: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              missingItems: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              hint: { type: Type.STRING },
              feedback: { type: Type.STRING },
            },
            required: ['passed', 'passedChecks', 'missingItems', 'hint', 'feedback'],
          },
        },
      })
    );

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json(parsed);
  } catch (err) {
    console.error('Verify API error:', err);
    res.status(500).json({ error: 'Erreur lors de la vérification IA.' });
  }
});
