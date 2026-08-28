import { PROJECTS } from './projects';

export interface Contact { label: string; value: string; href?: string }
export interface EducationEntry { school: string; detail: string; period: string; note: string }
export interface SkillEntry { title: string; body: string }

export interface Resume {
  profile: { name: string; role: string; contacts: Contact[] };
  education: EducationEntry[];
  skills: SkillEntry[];
  /** 直接 import PROJECTS，不做二次录入 —— 保证三处消费的是同一份数字（spec §5.5） */
  projects: typeof PROJECTS;
  awards: string[];
  footer: { traits: string[]; updatedAt: string };
}

export const resume: Resume = {
  profile: {
    name: '唐宗昊',
    role: 'AI 应用开发',
    contacts: [
      { label: '电话', value: '17872117576', href: 'tel:17872117576' },
      { label: '邮箱', value: '17872117576@163.com', href: 'mailto:17872117576@163.com' },
      { label: 'GitHub', value: 'github.com/Thelatter666', href: 'https://github.com/Thelatter666' },
      { label: '网站', value: 'thelatter666.github.io', href: 'https://thelatter666.github.io' },
    ],
  },

  education: [{
    school: '新疆大学',
    detail: '（211）· 软件工程 · 本科',
    period: '2023.09 – 2027.06（预计）',
    note: 'GPA：3.0　·　英语六级（CET-6）',
  }],

  /**
   * 技能区 5 条（spec §5.3.1）：
   *   新增「AI 应用技术栈」—— 两个 Python AI 项目必须有对应技能栏支撑，
   *                          否则面试官会质疑项目真实性
   *   删除「Linux 开发环境」—— 与「部署与运维」重复，对目标岗位无区分度
   */
  skills: [
    {
      title: 'AI Agent 工程化',
      body: '在核心项目中编写 AGENT.md 约束推理路径，封装 Skill 固化高频工作流，并通过 MCP 连接外部工具链，完成需求拆解、代码生成与验证闭环。',
    },
    {
      title: 'AI 应用技术栈',
      body: '使用 Python + FastAPI 构建模型服务，使用 PyTorch（ResNet-50 / YOLOv8）完成特征提取与目标检测，使用 pgvector 做向量检索；具备 LLM API 集成与 Prompt 工程能力（结构化输出、多层容错解析）。',
    },
    {
      title: 'Agent 辅助全栈生态',
      body: '使用 React 18 + TypeScript 构建前端页面，使用 Express + MySQL 8 实现后端接口，并对 Agent 生成代码进行人工 Review、调试与 Bug 修复。',
    },
    {
      title: '测试与工程化协同',
      body: '使用 Vitest 编写单元测试、使用 Playwright 验证核心用户路径，并结合 Git 语义化提交完成版本管理。',
    },
    {
      title: '部署与运维',
      body: '在 Linux 云服务器上完成项目部署，配置 Nginx 反向代理，并持续进行线上迭代与问题排查。',
    },
  ],

  projects: PROJECTS,

  awards: [
    '蓝桥杯 C/C++ 大学 A 组 · 新疆赛区二等奖',
    '全国大学生数学竞赛 · 省级三等奖',
    '大学英语四级（CET-4）',
    '大学英语六级（CET-6）',
  ],

  // 已删除原简历的「校园经历 · 创新创业委员」：对目标岗位信息量接近零（spec §5.3）
  footer: { traits: ['自驱力强', '持续学习 RAG', '规范优先'], updatedAt: '2026.08' },
};
