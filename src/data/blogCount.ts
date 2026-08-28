/**
 * 已发布（非 draft）文章数。
 *
 * 导航用它决定是否显示「博客」入口：文章数 <3 时隐藏，
 * 避免"开了个博客然后没写"的负面信号（spec §6）。
 *
 * Phase 5（Task 19）会替换为读取 blog collection 的真实实现；
 * 此处返回 0，使入口在文章不足时保持隐藏。
 */
export async function publishedPostCount(): Promise<number> {
  return 0;
}
