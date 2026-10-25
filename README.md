# Komal & Kanishq: wedding invitation

Live at **https://komalkanishq.github.io/** (GitHub Pages, served from `main` / root).

Plain HTML + CSS + vanilla JS. There is no build step and nothing to install for the site.

## Files

| File | What it is |
|---|---|
| `index.html`, `style.css`, `script.js` | The site |
| `assets/garden.jpg`, `drape.webp` | Hero photo (fountain + roses) and real-fabric drapes |
| `assets/fountain.mp4`, `arches.jpg`, `whiteroses.jpg`, `tiered.jpg` | Photo carousel (the fountain is a looping video) |
| `assets/*.svg` | Seal, leaf texture, palace line drawing |
| `preview.jpg` | 1200×630 link-preview card (WhatsApp, Facebook, X) |
| `invite-card.jpg` | 1080×1350 portrait invite with a QR code to the site |
| `email-snippet.html` | HTML block for email, with the card image linked to the site |
| `sticker.webp` | 512×512 transparent sticker, **for decoration only** |
| `tools/` | Dev-only templates and the script that generates the images. The site doesn't use them. |

## Filling in the details

Every unknown is written as `[PLACEHOLDER]`. Search `index.html` for `[` to find them all.

### In `index.html`

1. **The config block in `<head>`** (`<script id="wedding-config">`) drives three features:
   - `start` is set to `2026-11-15T18:00:00+05:30` (Sunday 15 November 2026, 6:00 PM IST, the engagement).
     It feeds the **countdown** and the **Save the Date** button, which opens Google Calendar.
   - `end` is optional. Without it, the calendar entry runs for 3 hours.
   - `mapQuery`: the venue name and address as you'd type them into Google Maps. It feeds the **embedded map**.
     Until it's filled in, the map area shows a note.
2. **Scratch card:** 15 November 2026 / Sunday / 6:00 PM. If the date changes, update the scratch card and `start` together.
3. **Timeline, venue, pre-wedding events:** replace each placeholder.
   - To add an event, copy an `<li>` (timeline) or an `<article class="pre">` (pre-wedding event).
   - Each event's **Open in Maps** button takes a Google Maps share link (in Maps: Share → Copy link).
   - Delete any section you don't need.
5. **Link preview text:** update `[MAIN DATE]` in the `og:description` and `twitter:description` tags.
6. **Photos:** put them in `images/` and add one `<figure class="slide"><img src="images/photo-1.jpg" alt="" loading="lazy"></figure>` per photo inside `#carousel`.
   The current slides (fountain video, rose arches, fountains) are stock photos; replace or remove any of them.
7. **Music (optional):** add an mp3 at `audio/music.mp3`. A music button then appears in the top-right corner. It never autoplays; guests tap to play.

### RSVP (free Google Form, no backend)

The on-page form posts straight into a Google Form.

1. Create a Google Form with four questions:
   - **Name:** short answer
   - **Email:** short answer
   - **Will you be attending?:** multiple choice, with the options **exactly** `Joyfully accept` and `Regretfully decline`
   - **Message:** paragraph
2. In the form's ⋮ menu, choose **Get pre-filled link**. Type something in each field, click **Get link**, and paste the link somewhere.
   It contains `entry.123456789=...` for each question.
3. In `index.html`:
   - Set the form's `action` to your form URL with `viewform` replaced by `formResponse`,
     e.g. `https://docs.google.com/forms/d/e/XXXX/formResponse`.
   - Replace each `[entry.ID for ...]` with the matching `entry.123456789`.
4. Responses appear in the Google Form (and in its linked Sheet if you create one).

If you don't want RSVP, delete the `<section id="rsvp">` block.

### The images (`preview.jpg`, `invite-card.jpg`, `sticker.webp`, `email-snippet.html`)

Edit `tools/details.json`, then run:

```
pip install qrcode pillow playwright
python -m playwright install chromium
python tools/build_images.py
```

`preview.jpg` is kept under 300 KB automatically.

Commit and push. Pages updates in about a minute.

## Credits

- **Photos:** [Unsplash](https://unsplash.com), free under the [Unsplash License](https://unsplash.com/license).
  - Fountain in a rose garden: `photo-1605684437254`
  - Sheer curtain: Sebastian Schuster, `photo-1757970326429`
  - Rose arches: `photo-1781438150201`
  - Fountain with white roses: `photo-1778215796402`
  - Tiered fountain: `photo-1761024300163`
  - The photos were colour-graded, and the curtain was reshaped into drapes.
- **Video:** "Fountain in a garden" from [Mixkit](https://mixkit.co/free-stock-video/fountain-in-a-garden-2674/), free under the Mixkit License. Trimmed into a seamless 8-second loop.

## Sending it

- **WhatsApp / SMS / Telegram:** send the **URL as text**: `https://komalkanishq.github.io/`.
  WhatsApp turns it into a large preview card (`preview.jpg`), and tapping the card opens the invitation.
  Images and stickers sent on WhatsApp **cannot** carry links. Only the link preview is tappable.
- **Plain image:** send `invite-card.jpg`. Guests scan the QR code to open the site.
- **Email:** open `email-snippet.html` in a browser, select all, copy, and paste into the email body.
  The whole card image is a link. The image loads from the live site, so publish before you send.
- **Sticker:** `sticker.webp` is **decoration only and is NOT clickable**. To use it as a WhatsApp sticker, add it with a sticker-maker app.

## Refreshing a cached WhatsApp preview

WhatsApp caches the preview the first time a URL is shared. After you change `preview.jpg` or the `og:` tags,
send the URL with a version suffix so WhatsApp fetches a fresh one:

```
https://komalkanishq.github.io/?v=2
```

Use `?v=3`, `?v=4` and so on for later changes. Facebook's [Sharing Debugger](https://developers.facebook.com/tools/debug/) shows what the preview will look like.
