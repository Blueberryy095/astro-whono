import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const slugRule = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase kebab-case');

const baseFields = {
  title: z.string(),
  description: z.string().optional(),
  date: z.coerce.date(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
  archive: z.boolean().default(true),
  // Optional custom permalink. If present, it overrides the auto-generated id.
  slug: slugRule.optional()
};

const bitsImage = z.object({
  src: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string().optional()
});

const bitsAuthor = z.object({
  name: z.string().optional(),
  avatar: z.string().optional()
});

const essay = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/essay' }),
  schema: z.object({
    ...baseFields,
    cover: z.string().optional(),
    password: z.string().optional(),
    badge: z.string().optional()
  })
});

const bits = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/bits' }),
  schema: z.object({
    // Bits can be untitled.
    title: z.string().optional(),
    description: z.string().optional(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    slug: z.string().optional(),

    // Optional media for card display.
    images: z.array(bitsImage).optional(),
    author: bitsAuthor.optional()
  })
});

const memo = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/memo' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    date: z.coerce.date().optional(),
    draft: z.boolean().default(false),
    slug: z.string().optional()
  })
});

const series = defineCollection({
  // 注意这里的 base 路径对应你新建的文件夹
  loader: glob({ pattern: '**/*.md', base: './src/content/series' }),
  schema: z.object({
    ...baseFields,         // 直接复用你上面定义好的基础字段(title, date等)
    topic: z.string(),     // 新增一个 topic 字段，用来作为连载的“标签/主题”
    password: z.string().optional(),
    cover: z.string().optional() // 可选：如果你想给连载文章也加封面图的话
  })
});

export const collections = { essay, bits, memo, series };
