import type { BadgeId } from '../components/hero3d/types';

export interface MaterialSpec {
  color: number;
  metalness: number;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  envMapIntensity: number;
}

export interface BadgeConfig {
  id: BadgeId;
  /** tooltip 标题 */
  brand: string;
  /**
   * tooltip 一句话说明。
   *
   * Claude 与 DeepSeek 有据可查（AGENT.md + .claude/skills/、ai_travel 使用 DeepSeek-V4）；
   * 其余三个暂无使用场景证据，采用「品牌 + 品类」的事实性兜底描述。
   * **严禁编造使用场景**（spec §16.2）——本人提供真实说明后直接覆盖此处即可。
   */
  note: string;
  /** 材质：单形态徽章 1 个；opencode 为 3 层，顺序同 BADGE_SHAPES.opencode.layers */
  materials: MaterialSpec[];
  /** 影响碰撞冲量分配 */
  mass: number;
  /** 绳长。错落配置：短-长-中-长-短，形成节奏（spec §7.2） */
  ropeLength: number;
  /** 锚点横向位置，0~1 */
  anchorXRatio: number;
}

export const BADGES: BadgeConfig[] = [
  {
    id: 'claude',
    brand: 'Claude',
    note: 'Claude Code · 主力 agent 编码',
    materials: [{
      color: 0xd98f6c, metalness: 1.0, roughness: 0.26,
      clearcoat: 0.6, clearcoatRoughness: 0.25, envMapIntensity: 1.15,
    }],
    mass: 1.0,
    ropeLength: 9.0,
    anchorXRatio: 0.14,
  },
  {
    id: 'deepseek',
    brand: 'DeepSeek',
    note: 'DeepSeek · 深度求索 · 大模型',
    materials: [{
      color: 0x2a3550, metalness: 1.0, roughness: 0.18,
      clearcoat: 0.65, clearcoatRoughness: 0.2, envMapIntensity: 1.2,
    }],
    mass: 1.1,
    ropeLength: 13.0,
    anchorXRatio: 0.32,
  },
  {
    id: 'openai',
    brand: 'OpenAI',
    note: 'OpenAI · GPT 系列',
    materials: [{
      color: 0xc9ccd4, metalness: 1.0, roughness: 0.24,
      clearcoat: 0.6, clearcoatRoughness: 0.25, envMapIntensity: 1.2,
    }],
    mass: 1.0,
    ropeLength: 11.0,
    anchorXRatio: 0.5,
  },
  {
    id: 'opencode',
    brand: 'OpenCode',
    note: 'OpenCode · 开源 agent 编码 CLI',
    // 3 层：卡片（近黑烤漆）/ 门框（白烤漆）/ 方块（灰）
    materials: [
      { color: 0x030303, metalness: 0.12, roughness: 0.58, clearcoat: 0.05, clearcoatRoughness: 0.4, envMapIntensity: 1.0 },
      { color: 0xf5f6f7, metalness: 0.06, roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.15, envMapIntensity: 1.0 },
      { color: 0x494746, metalness: 0.35, roughness: 0.46, clearcoat: 0.25, clearcoatRoughness: 0.3, envMapIntensity: 1.0 },
    ],
    mass: 0.9,
    ropeLength: 13.5,
    anchorXRatio: 0.68,
  },
  {
    id: 'zhipu',
    brand: '智谱',
    note: '智谱 GLM · 国产大模型',
    materials: [{
      color: 0x4a5468, metalness: 0.95, roughness: 0.26,
      clearcoat: 0.6, clearcoatRoughness: 0.25, envMapIntensity: 1.15,
    }],
    mass: 1.0,
    ropeLength: 9.5,
    anchorXRatio: 0.86,
  },
];
