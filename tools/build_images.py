"""Regenerate preview.jpg, invite-card.jpg, sticker.webp and email-snippet.html.

Dev-only. Needs: pip install qrcode pillow playwright && python -m playwright install chromium
Run from anywhere:  python tools/build_images.py
Edit tools/details.json first; the site itself (index.html) is edited by hand.
"""
import base64
import html
import io
import json
from pathlib import Path

import qrcode
from PIL import Image
from playwright.sync_api import sync_playwright

TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent
D = json.loads((TOOLS / "details.json").read_text(encoding="utf-8"))
SITE = D["site_url"]
RENDER = TOOLS / "_render.html"  # temp file, so templates can load ../assets/*

e = html.escape


def fill(template, **extra):
    s = (TOOLS / template).read_text(encoding="utf-8")
    values = {
        "GROOM": e(D["groom"]),
        "BRIDE": e(D["bride"]),
        "GROOM_PARENTS": e(D["groom_parents"]),
        "BRIDE_PARENTS": e(D["bride_parents"]),
        "MAIN_DATE": e(D["main_date"]),
        "MAIN_WHEN": e(D["main_when"]),
        "SITE_URL": e(SITE),
        "CONTACT": e(D["contact"]),
        **extra,
    }
    for k, v in values.items():
        s = s.replace("{{" + k + "}}", v)
    return s


def qr_data_uri():
    img = qrcode.make(SITE, border=3, box_size=10,
                      error_correction=qrcode.constants.ERROR_CORRECT_M)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def filled(v):
    return bool(v) and "[" not in v


def events_html():
    """Event boxes for the card; events still holding [PLACEHOLDERS] are left out."""
    evs = [ev for ev in D["events"] if all(filled(ev[k]) for k in ("name", "when", "venue"))]
    if not evs:
        return ""
    return '<div class="events">' + "".join(
        f'<div class="ev"><h3>{e(ev["name"])}</h3><p class="w">{e(ev["when"])}</p><p>{e(ev["venue"])}</p></div>'
        for ev in evs
    ) + "</div>"


def venue_html():
    if filled(D.get("venue", "")):
        lines = D.get("address") or []
        lines = [lines] if isinstance(lines, str) else lines  # one string, or a list of lines
        addr = f'<div class="addr">{"<br>".join(e(l) for l in lines)}</div>' if lines and all(map(filled, lines)) else ""
        return f'<div class="venue">{e(D["venue"])}</div>{addr}'
    return f'<div class="venue follow">{e(D["to_follow"])}</div>'


def foot_html():
    """Bottom pill: QR + site link once the site is live (show_qr), otherwise just the contact."""
    if D.get("show_qr"):
        return (f'<div class="foot"><div class="qr"><img src="{qr_data_uri()}" alt=""></div><div>'
                f'<div class="t1">Scan to open the invitation</div>'
                f'<div class="t3">Contact: {e(D["contact"])}</div></div></div>')
    return (f'<div class="foot solo"><div><div class="t1">For any queries</div>'
            f'<div class="t3">{e(D["contact"])}</div></div></div>')


def shoot(page, content, w, h, transparent=False):
    RENDER.write_text(content, encoding="utf-8")
    page.set_viewport_size({"width": w, "height": h})
    page.goto(RENDER.as_uri(), wait_until="networkidle")
    page.evaluate("document.fonts.ready")
    page.wait_for_timeout(200)
    return Image.open(io.BytesIO(page.screenshot(omit_background=transparent)))


def save_jpeg_under(img, path, limit):
    img = img.convert("RGB")
    for q in (90, 85, 80, 75, 70, 60):
        img.save(path, "JPEG", quality=q, optimize=True, progressive=True)
        if path.stat().st_size < limit:
            return q
    raise SystemExit(f"{path.name} still over {limit} bytes")


def main():
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(device_scale_factor=1)

            q = save_jpeg_under(shoot(page, fill("preview.html"), 1200, 630), ROOT / "preview.jpg", 300_000)
            print(f"preview.jpg      1200x630  q={q}  {(ROOT / 'preview.jpg').stat().st_size:,} B")

            card = fill("card.html", EVENTS=events_html(), VENUE_BLOCK=venue_html(), FOOT=foot_html())
            hi = browser.new_page(device_scale_factor=2)  # supersample for crisper text
            img = shoot(hi, card, 1080, 1350).resize((1080, 1350), Image.LANCZOS)
            hi.close()
            q = save_jpeg_under(img, ROOT / "invite-card.jpg", 1_000_000)
            print(f"invite-card.jpg  1080x1350 q={q}  {(ROOT / 'invite-card.jpg').stat().st_size:,} B")

            sticker = shoot(page, fill("sticker.html"), 512, 512, transparent=True)
            sticker.save(ROOT / "sticker.webp", "WEBP", quality=90, method=6)
            print(f"sticker.webp     512x512   {(ROOT / 'sticker.webp').stat().st_size:,} B")

            browser.close()
    finally:
        RENDER.unlink(missing_ok=True)

    names = f'{D["bride"]} & {D["groom"]}'
    (ROOT / "email-snippet.html").write_text(
        f"""<!-- Paste into an email composer that accepts HTML. The whole image is a link. -->
<a href="{SITE}" target="_blank" style="display:inline-block;text-decoration:none;">
  <img src="{SITE}invite-card.jpg" alt="{e(names)} wedding invitation. Tap to open." width="540" style="display:block;width:100%;max-width:540px;height:auto;border:0;">
</a>
<p style="font-family:Georgia,serif;font-size:16px;color:#2f3b2a;">
  <a href="{SITE}" target="_blank" style="color:#2f3b2a;">Open the invitation: venue, maps &amp; RSVP &rarr;</a>
</p>
""", encoding="utf-8")
    print("email-snippet.html written")


if __name__ == "__main__":
    main()
