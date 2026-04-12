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

export async function getArchiveEssays() {
  // 🎛️ 你的专属开关：设为 false 归档里就没有连载，设为 true 就会混入连载
  const ENABLE_SERIES_IN_ARCHIVE = false;

  // 1. 获取合格的随笔
  const essays = await getSortedEssays();
  const validEssays = essays.filter((entry) => entry.data.archive !== false && !isReservedSlug(getEssaySlug(entry)));

  // 🛑 核心拦截：如果开关是关闭的，直接返回纯随笔，后面的代码都不执行了！
  if (!ENABLE_SERIES_IN_ARCHIVE) {
    return validEssays;
  }

  // 🟢 如果开关是开启的，继续执行大熔炉合并魔法
  const series = await getPublished('series');
  const validSeries = series.filter((entry) => entry.data.archive !== false && !isReservedSlug(entry.data.slug ?? entry.id));

  const formattedSeries = validSeries.map(entry => ({
    ...entry,
    id: entry.id,
    collection: entry.collection,
    data: {
      ...entry.data,
      tags: Array.from(new Set([...(entry.data.tags || []), entry.data.topic]))
    }
  }));

  const allItems = [...validEssays, ...formattedSeries];
  return allItems.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}