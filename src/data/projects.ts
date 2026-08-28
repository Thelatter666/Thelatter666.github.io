/**
 * 项目指标与链接的唯一存放处（spec §5.5）。
 *
 * resume.ts 直接 import 这里，/projects 页面也从这里读取 ——
 * 同一份数字被三处消费，物理上只有一个来源。
 */

export interface ProjectEntry {
  id: 'ai-image-search' | 'ai-travel' | 'kaoyandaily';
  name: string;
  subtitle: string;
  period: string;
  stack: string[];
  metrics: { label: string; value: string }[];
  github: string;
  demo?: string;
  /** 简历用要点。配额见 spec §5.3.3，均为 2 条以控制在一页内 */
  highlights: string[];
  /** /projects 上的呈现形态：card = 中等篇幅卡片，deep = 切面式深度案例 */
  depth: 'card' | 'deep';
}

export const PROJECTS: ProjectEntry[] = [
  {
    id: 'ai-image-search',
    name: 'AI 图像检索系统',
    subtitle: '基于 ResNet / YOLO / pgvector 的端到端图像理解与相似检索平台',
    period: '2026.07',
    stack: ['Python', 'FastAPI', 'PyTorch', 'YOLOv8', 'PostgreSQL', 'pgvector', 'Docker'],
    metrics: [
      { label: '检索管线', value: '2 条' },
      { label: '特征维度', value: '1858-d / 2048-d' },
      { label: '测试', value: '108 项全绿' },
    ],
    github: 'https://github.com/Thelatter666/ai-image-search-system',
    highlights: [
      '设计双检索管线：传统 HSV+HOG 特征（1858-d）与 ResNet-50 深度特征（2048-d）按场景取舍 —— 颜色纹理类走前者，物体语义类走后者。',
      '使用 PostgreSQL + pgvector 存储向量并建 HNSW 索引；针对 HNSW 2000 维上限，判断 deep_vector 走顺序扫描在数据量 <10 万时性能足够，不做无谓降维。',
    ],
    depth: 'card',
  },
  {
    id: 'ai-travel',
    name: 'AI 智能旅行规划助手',
    subtitle: '面向大模型的行程规划工具，主打慢节奏度假风',
    period: '2026.07',
    stack: ['Python', 'FastAPI', 'React 19', 'TypeScript', 'Tailwind CSS 4', 'LLM API'],
    metrics: [
      { label: '结构化输出', value: '纯 JSON 铁律' },
      { label: '容错层级', value: '4 层' },
    ],
    github: 'https://github.com/Thelatter666/ai_travel',
    highlights: [
      '面向大模型编写 System Prompt，实现节奏控制（每日活动上限、强制午休）与文风引导，并要求纯 JSON 输出。',
      '构建四层容错解析链：markdown 代码块提取 → JSON 正则匹配 → 类型规范化 → 缺失字段补全；API Key 缺失时自动降级 Mock 数据。',
    ],
    depth: 'card',
  },
  {
    id: 'kaoyandaily',
    name: '考研学习一体化管理平台',
    subtitle: '考试倒计时、任务计划/复盘、番茄钟、学习森林热力图与三科可视化看板',
    period: '2026.07 – 2026.08',
    stack: ['React 18', 'TypeScript', 'Vite', 'Express', 'MySQL 8', 'Zod', 'Vitest', 'Playwright', 'Nginx'],
    metrics: [
      // 以下数字均于 2026-08-29 实测核实，见下方注释
      { label: '页面', value: '12 个' },
      { label: '代码量', value: '约 1.2 万行 TypeScript' },
      { label: 'Git 提交', value: '187 次' },
      { label: '路由模块', value: '11 个' },
      { label: '测试', value: '126 项全绿' },
    ],
    github: 'https://github.com/Thelatter666/kaoyandaka4',
    highlights: [
      '编写 AGENT.md 约束推理路径，通过 Skill 封装（数据库迁移、CRUD 生成、参数校验）把高频任务变成一键生成，显著压缩需求到可运行原型的周期。',
      '对 Agent 产出的 12 个页面与 11 个路由模块做全量 Review 并修复类型与逻辑缺陷，以 Zod 完成前后端共享校验，最终交付约 1.2 万行可运行 TypeScript。',
    ],
    depth: 'deep',
  },
];

/*
 * kaoyandaily 数字核对记录（2026-08-29 实测）：
 *   页面 12 个   —— client/src/App.tsx 的 pageLoaders（9 个业务页 + landing/login/register）
 *   提交 187 次  —— git rev-list --count HEAD
 *   路由 11 个   —— server/src/routes/（其中 6 个业务 CRUD）
 *   测试 126 项  —— npx vitest run（15 个测试文件，全绿）
 * 原简历写的是「7 个页面 / 123 次提交」，均已过期，此处为更正后的值。
 * README.md 中的「11 个页面」也需一并改为 12。
 */
