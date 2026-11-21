import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  getCurriculumOverviewStats,
  mergeImportedCurriculum,
  parseMissionsInput,
  SAMPLE_S8_M5_YAML,
} from './missionImporter';

test('parseMissionsInput parses the exact S8-M5 YAML format faithfully', () => {
  const parsed = parseMissionsInput(SAMPLE_S8_M5_YAML);
  assert.equal(parsed.missions.length, 1);

  const m = parsed.missions[0];
  assert.equal(m.id, 'S8-M5');
  assert.equal(m.week, 8);
  assert.equal(m.day, 5);
  assert.equal(m.dayLabel, 'vendredi');
  assert.equal(m.title, 'AWS : VPC, EC2 et groupe de sécurité');
  assert.equal(m.domain, 'cloud');
  assert.equal(m.baseMinutes.normal, 90);
  assert.equal(m.baseMinutes.mini, 20);
  assert.equal(m.readingMaxMin, 20);
  assert.equal(m.livrable, 'Fiche « Lancer et détruire une instance »');
  assert.equal(m.miniSummary, 'Dessiner le schéma VPC, sous-réseau et groupe de sécurité');
  assert.equal(m.extension, 'Remplacer l\'ouverture SSH par une connexion via Session Manager');
  assert.equal(
    m.incident,
    'L\'instance est lancée mais injoignable : vérifier groupe de sécurité, routage et IP'
  );
  assert.equal(m.flashcardsTarget, 7);
  assert.deepEqual(m.skillNodes, ['aws.ec2', 'aws.vpc.basics']);
  assert.equal(m.verificationTarget, 'automated');
  assert.equal(m.verificationChecks?.length, 2);
  assert.equal(m.verificationChecks?.[0].host, 'aws');
  assert.equal(m.verificationChecks?.[0].expect.value, 0);
  assert.equal(m.verificationChecks?.[1].cmd, null);
  assert.equal(m.verificationChecks?.[1].expectText, 'manual');
  // 4 core steps + 1 extension step
  assert.equal(m.steps.length, 5);
  assert.equal(parsed.weeks.length, 1);
  assert.equal(parsed.weeks[0].week, 8);
});

test('parseMissionsInput parses the bundled 12-week 72-mission JSON curriculum', () => {
  const jsonPath = path.resolve(process.cwd(), 'public/assets/aistudio/missions_all_f7e3203a.json');
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const parsed = parseMissionsInput(raw);

  assert.equal(parsed.weeks.length, 12);
  assert.equal(parsed.missions.length, 72);
  assert.ok(parsed.sundayRule?.includes('Revue de la semaine'));

  const s8m5 = parsed.missions.find((m) => m.id === 'S8-M5');
  assert.ok(s8m5);
  assert.equal(s8m5?.week, 8);
});

test('parseMissionsInput throws explicit French error on empty or malformed input', () => {
  assert.throws(() => parseMissionsInput('   '), /Collez un contenu YAML ou JSON/);
  assert.throws(() => parseMissionsInput('{ invalid json'), /JSON invalide/);
  assert.throws(() => parseMissionsInput('title: ""'), /champ "title" est requis/);
});

test('mergeImportedCurriculum upserts missions without duplicates and computes overview stats', () => {
  const jsonPath = path.resolve(process.cwd(), 'public/assets/aistudio/missions_all_f7e3203a.json');
  const fullBundle = parseMissionsInput(fs.readFileSync(jsonPath, 'utf-8'));

  const mergedFull = mergeImportedCurriculum(
    [],
    [],
    '',
    fullBundle
  );
  assert.equal(mergedFull.addedCount, 72);
  assert.equal(mergedFull.updatedCount, 0);
  assert.equal(mergedFull.weeks.length, 12);

  // Importing S8-M5 YAML again updates S8-M5 cleanly without creating duplicates
  const yamlS8M5 = parseMissionsInput(SAMPLE_S8_M5_YAML);
  const reimported = mergeImportedCurriculum(
    mergedFull.missions,
    mergedFull.weeks,
    mergedFull.sundayRule,
    yamlS8M5
  );
  assert.equal(reimported.addedCount, 0);
  assert.equal(reimported.updatedCount, 1);
  assert.equal(reimported.missions.filter((m) => m.id === 'S8-M5').length, 1);

  const week8 = reimported.weeks.find((w) => w.week === 8);
  assert.equal(week8?.theme, "CI/CD et bases d'AWS");
  assert.equal(week8?.goal, 'Pipeline de livraison et premiers pas sécurisés dans le cloud');

  const stats = getCurriculumOverviewStats(
    reimported.weeks,
    reimported.missions,
    ['S1-M1', 'S1-M2', 'S8-M5']
  );
  assert.equal(stats.totalMissions, 72);
  assert.equal(stats.completedMissions, 3);
  assert.equal(stats.totalWeeks, 12);
  assert.equal(stats.currentWeekNumber, 1);
});
