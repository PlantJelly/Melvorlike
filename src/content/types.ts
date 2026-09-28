export type SkillId = 'logging' | 'mining' | 'fishing' | 'blacksmithing' | 'cooking' | 'farming' | 'ranching' | 'magic' | 'foraging' | 'woodworking' | 'apothecary' | 'sewing';

export interface ResourceDef {
  id: string;
  name: string;
  skill: SkillId;
  reqLevel: number;
  baseDurationMs: number;
  exp: number;
  sell: number;
  buy: number;
  icon: string;
  /** 제작류 자원(대장작업 등)만 존재. 채집류는 없음. */
  recipe?: Record<string, number>;
  area?: string;
  /** 직접 채집할 수 없고 다른 작업의 부산물로만 나온다(석탄). */
  dropOnly?: boolean;
}
