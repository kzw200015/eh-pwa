import { hkdfSync } from "node:crypto"

import { env } from "@server/config"

/*
 * 按用途从主密钥派生的子密钥：HKDF-SHA256（RFC 5869），盐为空，用途标签作为 info，各 32 字节写成十六进制串。只有这里读主密钥。
 *
 * 全局只配一把主密钥，但登录令牌与图片地址签名是两种用途：共用同一把裸密钥的话，任何一处的实现缺陷都会波及另一处。
 * 两把摆在这一处派生，业务代码只拿子密钥。算法与用途标签是已签发令牌和已发出图片地址的一部分，改了等于换密钥，
 * 所有人要重新登录、所有图片地址一起失效。
 */

/** 登录令牌的签名子密钥 */
export const tokenKey = derive("token-v2")

/** 图片地址的签名子密钥 */
export const attachmentKey = derive("attachment-v2")

/* 写成十六进制串：hono 的 jwt 与 Bun.CryptoHasher 都直接收字符串密钥（按 UTF-8 取字节） */
function derive(purpose: string): string {
  return Buffer.from(hkdfSync("sha256", env.SECRET_KEY, "", purpose, 32)).toString("hex")
}
