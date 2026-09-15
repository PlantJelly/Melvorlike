import type { SkillId } from './types';

export type ProjectId = 'ruined_forge';
export type FeatureId = 'tools' | 'equipment' | 'guild';
export type ProjectPhase = 'surveyable' | 'clearing' | 'delivery' | 'restorable' | 'restoring' | 'complete';

export interface ProjectDef {
  id: ProjectId;
  name: string;
  description: string;
  icon: string;
  clearingDurationMs: number;
  salvage: Record<string, number>;
  materials: Record<string, number>;
  restorationDurationMs: number;
  unlockSkills: SkillId[];
  unlockFeatures: FeatureId[];
  restorationPoints: number;
}

export const ProjectDB: Record<ProjectId, ProjectDef> = {
  ruined_forge: {
    id: 'ruined_forge',
    name: '폐허가 된 대장간',
    description: '무너진 작업장을 치우고 다시 불을 지피면 금속 가공과 도구 제작을 시작할 수 있습니다.',
    icon: '🏚️',
    clearingDurationMs: 30_000,
    salvage: {wood: 3, stone: 4},
    materials: {wood: 12, stone: 10},
    restorationDurationMs: 45_000,
    unlockSkills: ['blacksmithing'],
    unlockFeatures: ['tools'],
    restorationPoints: 1,
  },
};

export const projectIds = Object.keys(ProjectDB) as ProjectId[];
export const featureIds: FeatureId[] = ['tools', 'equipment', 'guild'];
export const starterSkills: SkillId[] = ['logging', 'mining'];
export const starterFeatures: FeatureId[] = [];
