/**
 * Turns an uploaded HTML application into ONE self-contained HTML string that can be
 * shown in a sandboxed <iframe srcdoc>.
 *
 *  - A single .html file is used as it is.
 *  - A .zip package is unpacked in the browser (no extra library: it uses the browser's
 *    built-in DecompressionStream). Its CSS, JavaScript, images, fonts, audio and video
 *    are inlined into the page, so relative links keep working.
 *
 * Known limit (documented in the admin screen): code that downloads other files at run
 * time (fetch / XHR / dynamic import of a relative path) cannot reach the zip contents.
 */

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  avif: "image/avif",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  mp4: "video/mp4",
  webm: "video/webm",
  json: "application/json",
  css: "text/css",
  js: "text/javascript",
  html: "text/html",
};

function extOf(p: string): string {
  const i = p.lastIndexOf(".");
  return i < 0 ? "" : p.slice(i + 1).toLowerCase();
}

// ---------------------------------------------------------------- ZIP reader

export async function unzip(buf: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const bytes = new Uint8Array(buf);
  const dv = new DataView(buf);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("This is not a valid .zip file.");

  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const files = new Map<string, Uint8Array>();
  const decoder = new TextDecoder();

  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error("The .zip file is damaged.");
    const method = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const localOffset = dv.getUint32(p + 42, true);
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;

    if (name.endsWith("/") || name.startsWith("__MACOSX/") || name.split("/").pop()?.startsWith("._")) continue;

    if (dv.getUint32(localOffset, true) !== 0x04034b50) throw new Error("The .zip file is damaged.");
    const lNameLen = dv.getUint16(localOffset + 26, true);
    const lExtraLen = dv.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + lNameLen + lExtraLen;
    const raw = bytes.subarray(start, start + compSize);

    if (method === 0) {
      files.set(name, raw.slice());
    } else if (method === 8) {
      if (typeof DecompressionStream === "undefined") {
        throw new Error("This browser is too old to open zipped apps. Please update it.");
      }
      const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      files.set(name, new Uint8Array(await new Response(stream).arrayBuffer()));
    } else {
      throw new Error("This .zip uses an unsupported compression method. Re-zip it with normal compression.");
    }
  }
  return files;
}

// ------------------------------------------------------------- path helpers

function normalize(path: string): string {
  const out: string[] = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}

function dirOf(p: string): string {
  const i = p.lastIndexOf("/");
  return i < 0 ? "" : p.slice(0, i);
}

function isExternal(ref: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref.trim());
}

class Pkg {
  private lower = new Map<string, string>();
  private cache = new Map<string, string>();
  constructor(public files: Map<string, Uint8Array>) {
    for (const k of files.keys()) this.lower.set(k.toLowerCase(), k);
  }

  find(ref: string, fromDir: string): string | null {
    if (!ref || isExternal(ref)) return null;
    let clean = ref.trim().split("#")[0].split("?")[0];
    if (!clean) return null;
    try {
      clean = decodeURIComponent(clean);
    } catch {
      /* keep as is */
    }
    const full = clean.startsWith("/") ? normalize(clean) : normalize(`${fromDir}/${clean}`);
    if (this.files.has(full)) return full;
    return this.lower.get(full.toLowerCase()) ?? null;
  }

  text(path: string): string {
    return new TextDecoder().decode(this.files.get(path));
  }

  async dataUrl(path: string): Promise<string> {
    const hit = this.cache.get(path);
    if (hit) return hit;
    const data = this.files.get(path)!;
    const blob = new Blob([data as BlobPart], { type: MIME[extOf(path)] ?? "application/octet-stream" });
    const url = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
    this.cache.set(path, url);
    return url;
  }
}

async function replaceAsync(
  input: string,
  re: RegExp,
  fn: (m: RegExpExecArray) => Promise<string>,
): Promise<string> {
  const parts: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((m = re.exec(input))) {
    parts.push(input.slice(last, m.index), await fn(m));
    last = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex++;
  }
  parts.push(input.slice(last));
  return parts.join("");
}

async function inlineCss(pkg: Pkg, css: string, fromDir: string, depth = 0): Promise<string> {
  // @import "x.css"; / @import url(x.css);
  let out = css;
  if (depth < 5) {
    out = await replaceAsync(
      out,
      /@import\s+(?:url\(\s*)?["']?([^"')\s;]+)["']?\s*\)?[^;]*;/g,
      async (m) => {
        const target = pkg.find(m[1], fromDir);
        if (!target) return m[0];
        return inlineCss(pkg, pkg.text(target), dirOf(target), depth + 1);
      },
    );
  }
  // url(...)
  out = await replaceAsync(out, /url\(\s*(["']?)([^"')]+)\1\s*\)/g, async (m) => {
    const target = pkg.find(m[2], fromDir);
    if (!target) return m[0];
    return `url("${await pkg.dataUrl(target)}")`;
  });
  return out;
}

/** Makes localStorage / sessionStorage harmless inside the isolated (opaque-origin) frame. */
const STORAGE_SHIM = `<script>(function(){function mk(){var d={};return{getItem:function(k){return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},setItem:function(k,v){d[k]=String(v)},removeItem:function(k){delete d[k]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}
['localStorage','sessionStorage'].forEach(function(n){try{window[n].getItem('x')}catch(e){try{Object.defineProperty(window,n,{value:mk(),configurable:true})}catch(_){}}})})();<\/script>`;

function withShim(html: string): string {
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + STORAGE_SHIM);
  return STORAGE_SHIM + html;
}

export async function buildFromZip(buf: ArrayBuffer): Promise<string> {
  const files = await unzip(buf);
  const pkg = new Pkg(files);

  const htmls = [...files.keys()].filter((k) => /\.html?$/i.test(k));
  if (htmls.length === 0) throw new Error("No .html file was found inside the .zip.");
  htmls.sort((a, b) => {
    const ai = /(^|\/)index\.html?$/i.test(a) ? 0 : 1;
    const bi = /(^|\/)index\.html?$/i.test(b) ? 0 : 1;
    return ai - bi || a.split("/").length - b.split("/").length || a.length - b.length;
  });
  const entry = htmls[0];
  const baseDir = dirOf(entry);

  const doc = new DOMParser().parseFromString(pkg.text(entry), "text/html");

  // <link rel="stylesheet">
  for (const el of Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel~="stylesheet"][href]'))) {
    const target = pkg.find(el.getAttribute("href") ?? "", baseDir);
    if (!target) continue;
    const style = doc.createElement("style");
    style.textContent = await inlineCss(pkg, pkg.text(target), dirOf(target));
    el.replaceWith(style);
  }
  for (const el of Array.from(doc.querySelectorAll('link[rel~="icon"], link[rel="manifest"]'))) el.remove();

  // <style> blocks and style="" attributes
  for (const el of Array.from(doc.querySelectorAll("style"))) {
    el.textContent = await inlineCss(pkg, el.textContent ?? "", baseDir);
  }
  for (const el of Array.from(doc.querySelectorAll<HTMLElement>("[style]"))) {
    const s = el.getAttribute("style") ?? "";
    if (s.includes("url(")) el.setAttribute("style", await inlineCss(pkg, s, baseDir));
  }

  // <script src>
  for (const el of Array.from(doc.querySelectorAll<HTMLScriptElement>("script[src]"))) {
    const target = pkg.find(el.getAttribute("src") ?? "", baseDir);
    if (!target) continue;
    el.removeAttribute("src");
    el.textContent = pkg.text(target).replace(/<\/script/gi, "<\\/script");
  }

  // Media and images
  const attrs: [string, string][] = [
    ["img[src]", "src"],
    ["source[src]", "src"],
    ["video[src]", "src"],
    ["video[poster]", "poster"],
    ["audio[src]", "src"],
    ["image[href]", "href"],
    ["input[type=image][src]", "src"],
  ];
  for (const [sel, attr] of attrs) {
    for (const el of Array.from(doc.querySelectorAll(sel))) {
      const target = pkg.find(el.getAttribute(attr) ?? "", baseDir);
      if (target) el.setAttribute(attr, await pkg.dataUrl(target));
    }
  }

  return withShim(`<!DOCTYPE html>\n${doc.documentElement.outerHTML}`);
}

/** Entry point: decides between a plain .html file and a .zip package. */
export async function loadHtmlApp(url: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`The file could not be loaded (error ${res.status}).`);
  const path = url.split("?")[0].toLowerCase();
  if (path.endsWith(".zip")) return buildFromZip(await res.arrayBuffer());
  return withShim(await res.text());
}
