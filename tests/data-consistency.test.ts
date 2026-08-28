import { describe, it, expect } from 'vitest';
import { resume } from '../src/data/resume';
import { PROJECTS } from '../src/data/projects';

/**
 * 这些断言是 spec §5.1「唯一权威源」与 §5.3.1「技能区一增一删」的执行保障。
 * 后来者若重新录入数字或加回被删条目，测试会立刻失败。
 */
describe('简历与项目数据', () => {
  it('resume.projects 与 PROJECTS 是同一个引用（杜绝二次录入）', () => {
    expect(resume.projects).toBe(PROJECTS);
  });

  it('技能区恰好 5 条，且不含「Linux 开发环境」', () => {
    expect(resume.skills).toHaveLength(5);
    expect(resume.skills.map((s) => s.title)).not.toContain('Linux 开发环境');
  });

  it('技能区包含「AI 应用技术栈」', () => {
    expect(resume.skills.map((s) => s.title)).toContain('AI 应用技术栈');
  });

  it('恰好 3 个项目，且每个项目的简历要点均为 2 条（控制在一页内）', () => {
    expect(PROJECTS).toHaveLength(3);
    for (const p of PROJECTS) expect(p.highlights).toHaveLength(2);
  });

  it('简历无 campus（校园经历）字段', () => {
    expect(resume).not.toHaveProperty('campus');
  });

  it('三个项目的 depth 为「两浅一深」', () => {
    const deep = PROJECTS.filter((p) => p.depth === 'deep');
    expect(deep).toHaveLength(1);
    expect(deep[0].id).toBe('kaoyandaily');
  });

  it('每个项目都有 GitHub 链接与非空指标', () => {
    for (const p of PROJECTS) {
      expect(p.github).toMatch(/^https:\/\/github\.com\//);
      expect(p.metrics.length).toBeGreaterThan(0);
    }
  });

  it('kaoyandaily 的数字为 2026-08-29 实测值（页面 12 / 提交 187 / 测试 126）', () => {
    const k = PROJECTS.find((p) => p.id === 'kaoyandaily')!;
    const get = (label: string) => k.metrics.find((m) => m.label === label)?.value;
    expect(get('页面')).toBe('12 个');
    expect(get('Git 提交')).toBe('187 次');
    expect(get('测试')).toBe('126 项全绿');
  });

  it('联系方式中的网站字段指向新站，不再使用裸 IP', () => {
    const siteEntry = resume.profile.contacts.find((c) => c.label === '网站');
    expect(siteEntry?.href).toBe('https://thelatter666.github.io');
    expect(resume.profile.contacts.some((c) => c.value.includes('39.96.2.15'))).toBe(false);
  });
});
