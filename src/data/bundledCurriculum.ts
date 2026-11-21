import missionsRaw from '../../public/assets/aistudio/missions_all_f7e3203a.json?raw';
import { mergeImportedCurriculum, parseMissionsInput } from '../utils/missionImporter';
import type { AppState } from '../types/kairn';

/**
 * Programme réel (12 semaines, 72 missions) embarqué dans le build :
 * disponible dès le premier affichage, y compris hors ligne.
 */
export function withBundledCurriculum(state: AppState): AppState {
  if (state.importedMissions.length > 0 && state.curriculumWeeks.length > 0) {
    return { ...state, curriculumLoadedOnce: true };
  }
  const parsed = parseMissionsInput(missionsRaw);
  const merged = mergeImportedCurriculum([], [], state.sundayRule, parsed);
  const activeExists = merged.missions.some((m) => m.id === state.activeMissionId);
  return {
    ...state,
    importedMissions: merged.missions,
    curriculumWeeks: merged.weeks,
    sundayRule: merged.sundayRule,
    activeMissionId: activeExists ? state.activeMissionId : (merged.missions[0]?.id ?? ''),
    curriculumLoadedOnce: true,
  };
}
