import {
  getCollection,
  type CollectionEntry,
  type CollectionKey
} from 'astro:content';
export { createWithBase } from '../utils/format';

type OrderBy<K extends CollectionKey> = (a: CollectionEntry<K>, b: CollectionEntry<K>) => number;

export type GetPublishedOptions<K extends CollectionKey> = {
  orderBy?: OrderBy<K>;
  includeDraft?: boolean;
};

export const isReservedSlug = (slug: string) => slug.startsWith('page/');

export const getTotalPages = (itemCount: number, pageSize: number) =>
  Math.ceil(itemCount / pageSize);

export const getPageSlice = <T>(items: T[], currentPage: number, pageSize: number) => {
  const start = (currentPage - 1) * pageSize;
  return items.slice(start, start + pageSize);
};

export const buildPaginatedPaths = (totalPages: number) => {
  if (totalPages <= 1) return [];
  return Array.from({ length: totalPages - 1 }, (_, i) => ({
    params: { page: String(i + 2) }
  }));
};

export async function getPublished<K extends CollectionKey>(
  name: K,
  opts: GetPublishedOptions<K> = {}
) {
  const prod = import.meta.env.PROD;
  const includeDraft = opts.includeDraft ?? !prod;
  const filter = includeDraft ? undefined : ({ data }: CollectionEntry<K>) => data.draft !== true;
  const items = await getCollection(name, filter);

  if (!opts.orderBy) return items;
  return items.slice().sort(opts.orderBy);
}

export type EssayEntry = CollectionEntry<'essay'>;

export type EssayEntry = CollectionEntry<'essay'>;

// 1. 放宽类型限制：现在它不仅认识 essay，也认识 series 了
export const getEssaySlug = (entry: CollectionEntry<'essay'> | CollectionEntry<'series'> | any) => entry.data.slug ?? entry.id;

const orderByEssayDate = (a: EssayEntry, b: EssayEntry) => b.data.date.valueOf() - a.data.date.valueOf();

export async function getSortedEssays() {
  return getPublished('essay', {
    orderBy: orderByEssayDate
  });
}

export async function getVisibleEssays() {
  const essays = await getSortedEssays();
  return essays.filter((entry) => !isReservedSlug(getEssaySlug(entry)));
}

// 👇 见证奇迹的时刻：大熔炉归档函数 👇
export async function getArchiveEssays() {
  // 1. 获取合格的随笔
  const essays = await getSortedEssays();
  const validEssays = essays.filter((entry) => entry.data.archive !== false && !isReservedSlug(getEssaySlug(entry)));

  // 2. 获取合格的连载
  const series = await getPublished('series');
  const validSeries = series.filter((entry) => entry.data.archive !== false && !isReservedSlug(entry.data.slug ?? entry.id));

  // 3. 巧妙转换：把 series 特有的 topic 塞进 tags 数组里，这样归档页就能直接渲染出标签了
  const formattedSeries = validSeries.map(entry => ({
    ...entry,
    data: {
      ...entry.data,
      // 如果你原本在连载里写了 tags 就保留，没写就把 topic 当作 tag 放进去（Set 用于去重）
      tags: Array.from(new Set([...(entry.data.tags || []), entry.data.topic]))
    }
  }));

  // 4. 大熔炉合并！
  const allItems = [...validEssays, ...formattedSeries];

  // 5. 统一按时间全局倒序排列
  return allItems.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}