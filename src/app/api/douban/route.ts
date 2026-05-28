import { NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}

function extractId(url: string): string | null {
  const match = url.match(/(\d{5,})/)
  return match ? match[1] : null
}

function extractInfoText($: cheerio.CheerioAPI, label: string): string | undefined {
  const infoEl = $("#info")
  const text = infoEl.text()
  const regex = new RegExp(`${label}:\\s*([^\\n]+)`)
  const m = text.match(regex)
  return m ? m[1].trim() : undefined
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "请提供豆瓣链接" }, { status: 400 })
    }

    const bookId = extractId(url)
    if (!bookId) {
      return NextResponse.json({ error: "无法识别的豆瓣链接" }, { status: 400 })
    }

    const bookUrl = `https://book.douban.com/subject/${bookId}/`
    const res = await fetch(bookUrl, { headers: HEADERS })

    if (!res.ok) {
      return NextResponse.json({ error: "豆瓣暂时无法访问，请稍后重试" }, { status: 502 })
    }

    const html = await res.text()
    const $ = cheerio.load(html)

    // Check for security challenge
    if ($("#sec").length > 0 || html.includes("sec.douban.com")) {
      return NextResponse.json({ error: "豆瓣触发了安全验证，请稍后重试" }, { status: 502 })
    }

    // Title
    const title = $("h1 span").first().text().trim() || $("h1").first().text().trim() || undefined

    // Author - try multiple selectors
    let author: string | undefined
    const authorLinks = $('a[rel="author"]')
    if (authorLinks.length > 0) {
      author = authorLinks
        .map((_, el) => $(el).text().trim())
        .get()
        .join(", ")
    }
    if (!author) {
      author = extractInfoText($, "作者")
    }

    // Publisher
    const publisher = extractInfoText($, "出版社")

    // Publish date
    const publishDate = extractInfoText($, "出版年")

    // ISBN
    const isbn = extractInfoText($, "ISBN")

    // Cover image
    const coverUrl = $('meta[property="og:image"]').attr('content')
      || $('#mainpic img').attr('src')
      || undefined

    // Rating
    const doubanRating = $('strong.rating_num').text().trim() || undefined

    // Douban URL
    const doubanUrl = `https://book.douban.com/subject/${bookId}/`

    // TOC text (best-effort)
    let tocText: string | null = null
    const tocHeader = $('h2, h3, .pl').filter((_, el) => $(el).text().includes('目录')).first()
    if (tocHeader.length > 0) {
      const tocContainer = tocHeader.nextAll('.indent').first()
      if (tocContainer.length > 0) {
        tocText = tocContainer.text().trim() || null
      }
    }

    if (!title && !author) {
      return NextResponse.json({ error: "无法解析该页面，请确认链接是否正确" }, { status: 422 })
    }

    return NextResponse.json({ title, author, publisher, publishDate, isbn, coverUrl, tocText, doubanRating, doubanUrl })
  } catch {
    return NextResponse.json({ error: "解析失败，请重试" }, { status: 500 })
  }
}
