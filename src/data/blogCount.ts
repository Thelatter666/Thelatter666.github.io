import { getCollection } from 'astro:content';

/**
 * 已发布（非 draft）文章数。
 *
 * 导航用它决定是否显示「博客」入口：文章数 <3 时隐藏，
 * 避免"开了个博客然后没写"的负面信号（spec §6）。
 */
export async function publishedPostCount(): Promise<number> {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.length;
}
