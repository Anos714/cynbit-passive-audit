// snippets/app/sitemap.ts
// Static/ISR sitemap with honest timestamps.
//
// The live sitemap assigns `new Date()` to 16 static pages at request time,
// which makes every URL look modified on every crawl. This version uses one
// build timestamp for static pages and a per-entry `updatedAt` for content.
//
// Place at app/sitemap.ts.

import type { MetadataRoute } from 'next';

export const revalidate = 3600; // at most one regeneration per hour

const BUILD_TIME = new Date(process.env.BUILD_TIME ?? Date.now());

const staticPages = [
  { path: '', priority: 1 },
  { path: '/story', priority: 0.8 },
  { path: '/team', priority: 0.8 },
  { path: '/contact', priority: 0.8 },
  { path: '/careers', priority: 0.8 },
  { path: '/services', priority: 0.8 },
  { path: '/products', priority: 0.8 },
  { path: '/case-studies', priority: 0.8 },
  { path: '/impact', priority: 0.8 },
  { path: '/bitelevate', priority: 0.8 },
  { path: '/bitelevate/paths', priority: 0.8 },
  { path: '/diaries', priority: 0.8 },
  { path: '/blog', priority: 0.8 },
  { path: '/privacy', priority: 0.8 },
  { path: '/terms', priority: 0.8 },
  { path: '/cookies', priority: 0.8 },
] as const;

// Replace with your CMS query. Each entry must have a real updatedAt.
type ContentEntry = {
  path: string;
  updatedAt: Date;
  priority: number;
};

async function getContentEntries(): Promise<ContentEntry[]> {
  // Example:
  // const posts = await cms.posts.findMany({ select: { slug: true, updatedAt: true } });
  // return posts.map((post) => ({
  //   path: `/blog/${post.slug}`,
  //   updatedAt: post.updatedAt,
  //   priority: 0.6,
  // }));
  return [];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const content = await getContentEntries();

  return [
    ...staticPages.map(({ path, priority }) => ({
      url: `https://cynbit.in${path}`,
      lastModified: BUILD_TIME,
      changeFrequency: 'weekly' as const,
      priority,
    })),
    ...content.map(({ path, updatedAt, priority }) => ({
      url: `https://cynbit.in${path}`,
      lastModified: updatedAt,
      changeFrequency: 'monthly' as const,
      priority,
    })),
  ];
}
