import DataLoader from "dataloader"
import { LRUCache } from "lru-cache"

import * as attachmentUrls from "@server/eh/attachment-urls"
import * as tagTranslationService from "@server/eh/tag-translation-service"
import * as ehClient from "@server/eh/upstream/eh-client"
import { refKey, type GalleryRef } from "@server/eh/upstream/gallery-ref"

/*
 * 图集元数据：统一从表站匿名获取，按图集共享缓存。搜索、详情与阅读历史都经这里补全展示信息。
 *
 * 调用方一次交来一批图集（详情是一本的一批）：缓存里有的直接用，缺的由 DataLoader 按上游的单次上限（25 本）切批，
 * 各批同时发出、各自成败。还在加载的也在缓存里：同一本正在加载时后到的请求拿到同一份，不再加载第二次；加载失败的从缓存里移除。
 *
 * 元数据是上游原文，缩略图在组装卡片时才签名，标签也在这时才套上译名：签名的有效期不受缓存时长影响，
 * 同步过的译名也当场生效。
 */

/** 列表里一张卡片的内容：元数据里给人看的那些，缩略图签成本站的代理地址、标签套上译名 */
export interface GalleryCard extends Omit<
  ehClient.GalleryMetadata,
  "thumbnailUrl" | "tags" | "fileSize" | "torrentCount" | "expunged"
> {
  /** 已经是本站的代理地址，可直接放进 img 的 src */
  thumbnail: string
  tags: tagTranslationService.GalleryTag[]
}

/** 详情接口的返回：比卡片多出几个字段，与卡片的字段平铺在一起。阅读进度另有接口，见 reading-service.ts 的 ReadingProgress */
export type GalleryDetail = GalleryCard & Pick<ehClient.GalleryMetadata, "fileSize" | "torrentCount" | "expunged">

/** 一批图集的卡片，按 refKey 查；元数据取不到的（被删、转私有）不在结果里，整批请求失败则抛出。搜索结果与阅读历史都用它。 */
export async function cards(refs: GalleryRef[]): Promise<Map<string, GalleryCard>> {
  const found = (await loadAll(refs)).filter((metadata) => metadata !== undefined)
  /* 整批的标签一起查译名，一页只查一次库 */
  const translate = await tagTranslationService.translator(found.flatMap((metadata) => metadata.tags))
  return new Map(found.map((metadata) => [refKey(metadata), card(metadata, translate)]))
}

/** 一本图集的详情；元数据取不到时是 undefined。 */
export async function detail(ref: GalleryRef): Promise<GalleryDetail | undefined> {
  const [metadata] = await loadAll([ref])
  if (!metadata) {
    return undefined
  }
  const translate = await tagTranslationService.translator(metadata.tags)
  return {
    ...card(metadata, translate),
    fileSize: metadata.fileSize,
    torrentCount: metadata.torrentCount,
    expunged: metadata.expunged,
  }
}

function card(metadata: ehClient.GalleryMetadata, translate: tagTranslationService.Translate): GalleryCard {
  return {
    gid: metadata.gid,
    token: metadata.token,
    title: metadata.title,
    titleJpn: metadata.titleJpn,
    category: metadata.category,
    thumbnail: attachmentUrls.thumbnail(metadata.thumbnailUrl),
    uploader: metadata.uploader,
    postedAt: metadata.postedAt,
    fileCount: metadata.fileCount,
    rating: metadata.rating,
    tags: translate(metadata.tags),
  }
}

/*
 * 缓存里存的是 Promise。同一轮事件循环里几个请求各自要的也会合进同一批；整批失败时 DataLoader 把这批的 key 移出缓存，
 * 单本取不到（undefined）照常缓存。
 */
const loader = new DataLoader<GalleryRef, ehClient.GalleryMetadata | undefined, string>(
  async (refs) => {
    const found = await ehClient.fetchMetadata([...refs])
    return refs.map((ref) => found.get(refKey(ref)))
  },
  {
    maxBatchSize: ehClient.METADATA_BATCH_SIZE,
    cacheKeyFn: refKey,
    cacheMap: new LRUCache<string, Promise<ehClient.GalleryMetadata | undefined>>({ max: 500, ttl: 10 * 60_000 }),
  },
)

/** 一批图集的元数据，与 refs 一一对应；上游没有的那本（被删、转私有）是 undefined，所在的那批请求失败则抛出 */
function loadAll(refs: GalleryRef[]): Promise<(ehClient.GalleryMetadata | undefined)[]> {
  /* 不用 loadMany：它把失败作为 Error 混进结果里，而这里要整批失败就抛出 */
  return Promise.all(refs.map((ref) => loader.load(ref)))
}
