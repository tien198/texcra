import type { SEO } from '#/lexical/core/-editor-data'
import { isLinkUrl, isWebUrl } from '#/lexical/core/-editor-data'

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ]!,
  )
}

/** Only keep the semantics supported by this editor, including pasted content. */
export function cleanEditorHtml(html: string): string {
  const template = document.createElement('template')
  template.innerHTML = html
  const allowed = new Set([
    'P',
    'BR',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'BLOCKQUOTE',
    'UL',
    'OL',
    'LI',
    'STRONG',
    'B',
    'EM',
    'I',
    'U',
    'S',
    'SPAN',
    'CODE',
    'A',
    'FIGURE',
    'IMG',
    'FIGCAPTION',
  ])
  for (const element of template.content.querySelectorAll('*')) {
    if (element.tagName === 'H1') {
      const heading = document.createElement('h2')
      heading.append(...element.childNodes)
      element.replaceWith(heading)
      continue
    }
    if (!allowed.has(element.tagName)) {
      element.replaceWith(...element.childNodes)
      continue
    }
    for (const attribute of [...element.attributes]) {
      const name = attribute.name
      const valid =
        (element.tagName === 'A' &&
          name === 'href' &&
          isLinkUrl(attribute.value)) ||
        (element.tagName === 'IMG' &&
          ((name === 'src' && isWebUrl(attribute.value)) || name === 'alt')) ||
        (element.tagName === 'OL' &&
          name === 'start' &&
          /^\d+$/.test(attribute.value))
      if (!valid) element.removeAttribute(name)
    }
    if (element.tagName === 'IMG') {
      element.setAttribute('loading', 'lazy')
      element.setAttribute('decoding', 'async')
    }
    if (element.tagName === 'A')
      element.setAttribute('rel', 'noopener noreferrer')
  }
  return template.innerHTML
}

export function buildHtmlDocument(
  {
    title,
    heroImage,
    seo,
  }: { title: string; heroImage: string | null; seo: SEO },
  body: string,
): string {
  const effectiveTitle = seo.title.trim() || title.trim() || 'Untitled document'
  const safeTitle = escapeHtml(effectiveTitle)
  const description = escapeHtml(seo.description.trim())
  const canonical = isWebUrl(seo.canonicalUrl.trim())
    ? escapeHtml(seo.canonicalUrl.trim())
    : ''
  const metaImage = seo.image || heroImage
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle}</title>
  <meta name="description" content="${description}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${description}">
  ${metaImage ? `<meta property="og:image" content="${escapeHtml(metaImage)}">\n  <meta name="twitter:image" content="${escapeHtml(metaImage)}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${description}">
  ${canonical ? `<link rel="canonical" href="${canonical}">\n  <meta property="og:url" content="${canonical}">` : ''}
  <style>
    *{box-sizing:border-box}body{margin:0;background:#fff;color:#292524;font-family:system-ui,sans-serif;line-height:1.8}article{max-width:760px;margin:0 auto;padding:56px 28px}h1{font-family:Georgia,serif;font-size:clamp(2rem,5vw,3rem);line-height:1.18;letter-spacing:-.04em;margin:0 0 32px}h2,h3,h4,h5,h6{line-height:1.35;margin:32px 0 16px}p,ul,ol{margin:0 0 20px}a{color:#b42318;text-decoration:underline}blockquote{border-left:3px solid #b42318;margin:28px 0;padding:8px 0 8px 24px;color:#57534e;font-style:italic}figure{margin:28px 0}img{max-width:100%;height:auto;border-radius:8px}figcaption{color:#57534e;text-align:center;font-size:.875rem;margin-top:8px}code{background:#f5f5f4;padding:2px 5px;border-radius:4px}li>ul,li>ol{margin-bottom:0}
  </style>
</head>
<body><main><article>
  ${heroImage ? `<img src="${escapeHtml(heroImage)}" alt="" style="margin-bottom: 32px;">` : ''}
  <h1>${safeTitle}</h1>${body}</article></main></body>
</html>`
}
