"""Pack index.html + assets into one self-contained HTML file (CSS, JS and images inlined).

Usage: python tools/build_single.py "<out.html>"
Fonts still load from Google Fonts when online; offline the page falls back to system fonts.
"""
import base64
import mimetypes
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
MIME = {".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg"}


def data_uri(rel):
    p = ROOT / rel
    mime = MIME.get(p.suffix.lower()) or mimetypes.guess_type(p.name)[0]
    return "data:%s;base64,%s" % (mime, base64.b64encode(p.read_bytes()).decode("ascii"))


def main(out):
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "assets/proposal.css").read_text(encoding="utf-8")
    js = (ROOT / "assets/proposal.js").read_text(encoding="utf-8")
    html = html.replace('<link rel="stylesheet" href="assets/proposal.css">', "<style>\n" + css + "\n</style>")
    html = html.replace('<script src="assets/proposal.js" defer></script>',
                        "<script>\ndocument.addEventListener('DOMContentLoaded',function(){\n" + js + "\n});\n</script>")
    cache = {}

    def swap(m):
        rel = m.group(2)
        if rel not in cache:
            cache[rel] = data_uri(rel)
        return m.group(1) + cache[rel] + m.group(3)

    html = re.sub(r'((?:src|href)=")(assets/img/[^"]+)(")', swap, html)
    left = re.findall(r'(?:src|href)="assets/', html)
    if left:
        raise SystemExit("unresolved asset references: %d" % len(left))
    pathlib.Path(out).write_text(html, encoding="utf-8")
    print("wrote", out, len(html.encode("utf-8")) // 1024, "KB,", len(cache), "images inlined")


if __name__ == "__main__":
    main(sys.argv[1])
