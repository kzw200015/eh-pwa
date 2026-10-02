import { z } from "zod"

import { decodeEntities } from "@server/eh/upstream/parse"

/*
 * 元数据接口（gdata）返回的 JSON：上游的数字、HTML 实体、时间与标签都在这里统一转换成本站的写法，
 * 缺的、写法不对的字段尽量兜成默认值，别让一个没填的字段废掉整批元数据。
 */

/** 拆好的标签原文（female:big breasts 拆成 female 与 big breasts），还没套译名。 */
export interface TagRef {
  /** e 站给临时标签不带前缀，归到 temp */
  namespace: string
  value: string
}

/** 标准化后的上游元数据：缩略图还是上游原地址、没签成本站的代理地址，标签还没套译名。 */
export interface GalleryMetadata {
  gid: number
  token: string
  title: string
  /** 日文原标题，可能为空 */
  titleJpn: string
  /** e 站的英文分类名，如 Doujinshi */
  category: string
  thumbnailUrl: string
  uploader: string
  /** ISO 8601 */
  postedAt: string
  fileCount: number
  rating: number
  tags: TagRef[]
  /** 字节数 */
  fileSize: number
  torrentCount: number
  /** 图集是否已被删除 */
  expunged: boolean
}

/* e 站给临时标签不带前缀 */
const TEMP_NAMESPACE = "temp"

/**
 * e 站 JSON 里数字的写法不统一：gid 是数字，filecount、rating 这些是字符串（"329"、"4.68"）。两种都收下；
 * 缺省、null 和空串都算 0。
 */
const looseNumber = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((value, ctx) => {
    if (value === undefined || value === null || value === "") {
      return 0
    }
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) {
      ctx.addIssue({ code: "custom", message: `不是数字：${value}` })
      return z.NEVER
    }
    return parsed
  })

/* 缺省或不是字符串的文字算空串 */
const looseText = z.string().catch("")

/* 标题与标签里带着 HTML 实体 */
const entityText = looseText.transform(decodeEntities)

/** 元数据接口里的一本。 */
const metadataSchema = z
  .object({
    gid: looseNumber,
    token: looseText,
    title: entityText,
    title_jpn: entityText,
    category: looseText,
    thumb: looseText,
    uploader: looseText,
    posted: looseNumber,
    filecount: looseNumber,
    rating: looseNumber,
    tags: z.array(z.coerce.string().transform((tag) => toTag(decodeEntities(tag)))).catch([]),
    filesize: looseNumber,
    torrentcount: looseNumber,
    expunged: z.boolean().catch(false),
  })
  .transform((entry): GalleryMetadata => ({
    gid: entry.gid,
    token: entry.token,
    title: entry.title,
    titleJpn: entry.title_jpn,
    category: entry.category,
    thumbnailUrl: entry.thumb,
    uploader: entry.uploader,
    postedAt: new Date(entry.posted * 1000).toISOString(),
    fileCount: entry.filecount,
    rating: entry.rating,
    tags: entry.tags,
    fileSize: entry.filesize,
    torrentCount: entry.torrentcount,
    expunged: entry.expunged,
  }))

/** 元数据接口的响应。单个图集被删或转私有时，那一条会变成 { gid, error }，解成 null 由调用方跳过，别让整批作废。 */
export const gdataSchema = z.object({
  gmetadata: z.array(z.union([z.object({ error: z.string().min(1) }).transform(() => null), metadataSchema])),
})

/** 标签形如 artist:gentsuki，按第一个冒号拆开；没有冒号的是临时标签。 */
function toTag(tag: string): TagRef {
  const index = tag.indexOf(":")
  return index < 0
    ? { namespace: TEMP_NAMESPACE, value: tag }
    : { namespace: tag.slice(0, index), value: tag.slice(index + 1) }
}
