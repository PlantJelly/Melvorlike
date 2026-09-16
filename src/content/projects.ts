import type { SkillId } from './types';

export type ProjectId = 'ruined_forge' | 'broken_bridge' | 'ruined_restaurant' | 'guild_hall' | 'abandoned_field' | 'worn_out_barn' | 'fallen_tower' | 'overgrown_trail';
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
  // 이 프로젝트가 저장 스키마에 등장하기 시작한 Model.version. save.ts가 이 값보다 낮은
  // 버전의 저장을 읽을 때는 이 프로젝트를 검증 대상에서 제외하고 initial()의 기본값
  // (조사 가능, 미시작)을 그대로 둔다 — 기존 플레이어도 새 구역은 직접 진행해야 하므로
  // v1~v9→v10 이전처럼 자동 완료 처리하지 않는다.
  introducedVersion: number;
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
    introducedVersion: 10,
  },
  broken_bridge: {
    id: 'broken_bridge',
    name: '부서진 다리',
    description: '무너진 다리를 다시 놓으면 강 건너 낚시터로 나갈 수 있습니다.',
    icon: '🌉',
    clearingDurationMs: 40_000,
    salvage: {wood: 4, stone: 2},
    // 벽돌은 대장작업 산출물이라, 대장간을 먼저 끝내야 실제로 납품을 완료할 수 있다
    // (구역 간 하드 선행조건 잠금은 없지만 재료로 자연히 순서가 유도됨).
    materials: {wood: 10, brick: 6},
    restorationDurationMs: 60_000,
    unlockSkills: ['fishing'],
    unlockFeatures: [],
    restorationPoints: 1,
    introducedVersion: 11,
  },
  ruined_restaurant: {
    id: 'ruined_restaurant',
    name: '무너진 식당',
    description: '무너진 부엌을 되살리면 잡은 재료로 요리를 시작할 수 있습니다.',
    icon: '🍽️',
    clearingDurationMs: 50_000,
    salvage: {wood: 5, stone: 3},
    // 피라미는 낚시 산출물이라, 다리를 먼저 끝내야 실제로 납품을 완료할 수 있다
    // (다리의 벽돌과 같은 방식 — 하드 선행조건 없이 재료로 순서를 유도).
    materials: {wood: 12, fish_small: 8},
    restorationDurationMs: 70_000,
    unlockSkills: ['cooking'],
    unlockFeatures: [],
    restorationPoints: 1,
    introducedVersion: 12,
  },
  guild_hall: {
    id: 'guild_hall',
    name: '먼지 쌓인 길드 회관',
    description: '회관에 쌓인 먼지를 걷어내면 길드 환전과 퀘스트를 다시 이용할 수 있습니다.',
    icon: '🏛️',
    clearingDurationMs: 60_000,
    salvage: {wood: 6, stone: 4},
    // 구운 생선은 요리 산출물이라, 식당을 먼저 끝내야 실제로 납품을 완료할 수 있다
    // (다리의 벽돌·식당의 피라미와 같은 방식 — 하드 선행조건 없이 재료로 순서를 유도).
    materials: {wood: 14, grilled_fish: 5},
    restorationDurationMs: 80_000,
    unlockSkills: [],
    unlockFeatures: ['guild'],
    restorationPoints: 1,
    introducedVersion: 13,
  },
  abandoned_field: {
    id: 'abandoned_field',
    name: '버려진 밭',
    description: '잡초로 뒤덮인 밭을 정리하고 다시 일구면 농사를 시작할 수 있습니다.',
    icon: '🌾',
    clearingDurationMs: 70_000,
    salvage: {wood: 7, stone: 5},
    // 길드 회관은 스킬이 아니라 서비스형 기능(guild)만 열어서 재사용할 산출물이 없다 —
    // 이 구역부터는 재료 의존 체인이 끊기고 첫 구역(대장간)처럼 나무·돌만 사용한다.
    materials: {wood: 16, stone: 12},
    restorationDurationMs: 90_000,
    unlockSkills: ['farming'],
    unlockFeatures: [],
    restorationPoints: 1,
    introducedVersion: 14,
  },
  worn_out_barn: {
    id: 'worn_out_barn',
    name: '낡은 축사',
    description: '허물어진 축사를 손보고 여물통을 채우면 동물을 다시 기를 수 있습니다.',
    icon: '🐄',
    clearingDurationMs: 80_000,
    salvage: {wood: 8, stone: 6},
    // 밀은 농사 산출물이자 기존 목장 시스템의 사료라, 밭을 먼저 끝내야 실제로 납품을
    // 완료할 수 있다(다리의 벽돌·식당의 피라미와 같은 방식 — 재료로 순서를 유도).
    // 버려진 밭(직전 구역)이 서비스형 기능만 열어 끊겼던 D023의 재료 의존 체인이
    // 여기서 다시 이어진다.
    materials: {wood: 18, wheat: 10},
    restorationDurationMs: 100_000,
    unlockSkills: ['ranching'],
    unlockFeatures: [],
    restorationPoints: 1,
    introducedVersion: 15,
  },
  fallen_tower: {
    id: 'fallen_tower',
    name: '쓰러진 마법탑',
    description: '무너진 첨탑을 다시 세우고 마법진을 정비하면 마법과 장신구 제작을 시작할 수 있습니다.',
    icon: '🗼',
    clearingDurationMs: 90_000,
    salvage: {wood: 9, stone: 7},
    // 양털은 목장 산출물이라, 축사를 먼저 끝내야 실제로 납품을 완료할 수 있다(밭의
    // 밀과 같은 방식 — 재료로 순서를 유도). 마법 자체의 산출물(마법부여석)은 이
    // 구역이 열리기 전까지 존재할 수 없어 자기 자신을 참조할 수 없다.
    materials: {wood: 20, wool: 12},
    restorationDurationMs: 110_000,
    unlockSkills: ['magic'],
    unlockFeatures: ['equipment'],
    restorationPoints: 1,
    introducedVersion: 16,
  },
  overgrown_trail: {
    id: 'overgrown_trail',
    name: '무성해진 숲길',
    description: '뒤덮인 잡초와 넝쿨을 걷어내면 왕국 밖 숲으로 나가 야생의 재료를 채집할 수 있습니다.',
    icon: '🌲',
    clearingDurationMs: 100_000,
    salvage: {wood: 10, stone: 8},
    // 스톤급 마법부여석은 마법 산출물이라, 마법탑을 먼저 끝내야 실제로 납품을 완료할 수 있다
    // (다리의 벽돌·축사의 밀과 같은 방식 — 재료로 순서를 유도).
    materials: {wood: 22, enchant_stone_stone: 6},
    restorationDurationMs: 120_000,
    unlockSkills: ['foraging'],
    unlockFeatures: [],
    restorationPoints: 1,
    introducedVersion: 17,
  },
};

export const projectIds = Object.keys(ProjectDB) as ProjectId[];
export const featureIds: FeatureId[] = ['tools', 'equipment', 'guild'];
export const starterSkills: SkillId[] = ['logging', 'mining'];
export const starterFeatures: FeatureId[] = [];
