# E-ARI Press Kit

Everything an AI video-generation agent (Sora 2, Veo 3, Runway Gen-4, Kling, Pika) or a human editor needs to produce a product video for E-ARI without ever having seen the platform.

## What's in here

```
press-kit/
├── README.md              ← you are here
├── shot-list.md           ← 60 s + 30 s ad spec with timecodes
├── brand-pack/
│   ├── colors.md          ← palette + color-grade rules
│   ├── typography.md      ← font families + lockup conventions
│   ├── voice.md           ← what to say, what not to say
│   ├── logo.svg           ← primary mark (the Threshold E)
│   ├── favicon.svg        ← 32×32 simplification
│   └── handbook-reference.pdf
└── screens/
    ├── 01-home-hero.png                  (2560×1600)
    ├── 02-home-methodology-pillars.png   (2560×6000, scrollable)
    ├── 03-home-agentic-pipeline.png      (2560×8000, scrollable)
    ├── 04-home-scoring-pipeline.png      (2560×7500, scrollable)
    ├── 05-pricing-hero.png
    ├── 06-pricing-tiers.png              (2560×4500, scrollable)
    ├── 07-discovery-marketing.png
    ├── 08-literacy-hub.png
    ├── 09-handbook-page.png
    ├── 10-handbook-body.png              (2560×6500, scrollable)
    ├── 11-contact-page.png
    ├── 12-auth-login.png
    ├── 13-auth-register.png
    ├── 14-privacy-page.png
    └── 15-terms-page.png
```

All screenshots are 1.5× device scale, captured headless from the live production site (`https://www.e-ari.com`). Tall screens are explicitly oversized so an editor can ken-burns vertically without cropping content.

To regenerate after a redesign:

```bash
bash scripts/capture-press-kit.sh
```

## Direct asset URLs (no zip needed)

All screens are hosted on the live production site. Paste individual URLs straight into Sora, Veo, Runway Gen-4, Kling, or Pika — no zip upload required.

```
https://www.e-ari.com/press-kit/screens/01-home-hero.png
https://www.e-ari.com/press-kit/screens/02-home-methodology-pillars.png
https://www.e-ari.com/press-kit/screens/03-home-agentic-pipeline.png
https://www.e-ari.com/press-kit/screens/04-home-scoring-pipeline.png
https://www.e-ari.com/press-kit/screens/05-pricing-hero.png
https://www.e-ari.com/press-kit/screens/06-pricing-tiers.png
https://www.e-ari.com/press-kit/screens/07-discovery-marketing.png
https://www.e-ari.com/press-kit/screens/08-literacy-hub.png
https://www.e-ari.com/press-kit/screens/09-handbook-page.png
https://www.e-ari.com/press-kit/screens/10-handbook-body.png
https://www.e-ari.com/press-kit/screens/11-contact-page.png
https://www.e-ari.com/press-kit/screens/12-auth-login.png
https://www.e-ari.com/press-kit/screens/13-auth-register.png
https://www.e-ari.com/press-kit/screens/14-privacy-page.png
https://www.e-ari.com/press-kit/screens/15-terms-page.png
https://www.e-ari.com/press-kit/logo.svg
```

**Per-agent workflow:**
- **Runway Gen-4 / Kling / Pika** → "Image to Video" tab → paste URL or open URL in browser and drag image into the upload zone
- **Sora** → "Create" → "Add image reference" → paste URL
- **Veo 3 (Vertex AI)** → `gcs_uri` field → use URL directly, or download and upload as individual file
- **Any agent with an API** → fetch the URL and pass as base64 in the `image_url` field

---

## How to brief a video agent

Paste this prompt verbatim into your agent of choice. Attach the press-kit folder.

```
Produce a 60-second product video for E-ARI using the assets at https://www.e-ari.com/press-kit/.

All screens are live public URLs — fetch them directly. Full list:
https://www.e-ari.com/press-kit/screens/01-home-hero.png
https://www.e-ari.com/press-kit/screens/02-home-methodology-pillars.png
https://www.e-ari.com/press-kit/screens/03-home-agentic-pipeline.png
https://www.e-ari.com/press-kit/screens/04-home-scoring-pipeline.png
https://www.e-ari.com/press-kit/screens/05-pricing-hero.png
https://www.e-ari.com/press-kit/screens/06-pricing-tiers.png
https://www.e-ari.com/press-kit/screens/07-discovery-marketing.png
https://www.e-ari.com/press-kit/screens/08-literacy-hub.png
https://www.e-ari.com/press-kit/screens/09-handbook-page.png
https://www.e-ari.com/press-kit/screens/10-handbook-body.png
https://www.e-ari.com/press-kit/screens/11-contact-page.png
https://www.e-ari.com/press-kit/screens/12-auth-login.png
https://www.e-ari.com/press-kit/screens/13-auth-register.png
https://www.e-ari.com/press-kit/screens/14-privacy-page.png
https://www.e-ari.com/press-kit/screens/15-terms-page.png
Logo SVG: https://www.e-ari.com/press-kit/logo.svg

SPOKESPERSON
35–45 years old, ungendered casting fine. Navy turtleneck or charcoal
merino crewneck. Calm, precise, enterprise-architect demeanour. Studio:
matte navy backdrop (#0a0e1a), single key light camera-left at 45°,
soft rim light camera-right.

CINEMATOGRAPHY
50mm equivalent lens, full-frame sensor look (~f/2.8). Locked-off
tripod for talking-head shots. Slow dolly only when transitioning
between screens — never on the spokesperson. NO whip pans, NO drone
shots, NO neon practicals, NO film grain.

COLOR GRADE
Cool teal shadows, neutral mids, faint blue (#3b82f6) cast on
highlights. NO teal-orange. NO saturation push.

COMPOSITE RULES
When the script references a screen, place the screen behind or beside
the spokesperson via tracked composite (virtual monitor or projection
plate). NEVER as a flat 2D overlay. When a screen is shown fullscreen,
ken-burns at 1.0 → 1.04 over the duration of that beat.

EXECUTION
Follow shot-list.md exactly — every cut, every duration, every asset
reference is intentional. Voiceover lines are final copy, do not
paraphrase.

MUSIC
Minimal piano motif, sustained low pad underneath. 65–75 BPM. Bb minor
or D minor. NO drops, NO hard stops. Reference: Hans Zimmer "Time"
(Inception) at half volume, stripped of brass.

DELIVERABLE
1080p H.264 MP4, stereo 48kHz audio, 60.0 s exactly. Plus a 30 s cut
following the second table in shot-list.md.
```

## What this kit deliberately does NOT include

- **Live screen recordings (MP4 B-roll).** Modern image-to-video models (Sora 2, Veo 3, Runway Gen-4) synthesise plausible motion from stills. The screens here are oversized so the agent has plenty of pixel real estate to crop, pan, and animate. If your agent specifically requires real video, run `bash scripts/capture-press-kit.sh` after extending it with Playwright + `recordVideo: { dir }` — the script is already structured for that addition.
- **Spokesperson reference images.** Ungendered casting is intentional — the agent picks based on its model's training distribution, you re-roll until the right human shows up.
- **Stock music.** Brief gives the reference; the agent (or your editor) sources the bed.

## License

All assets in this kit belong to the E-ARI brand. Use within E-ARI marketing, partner co-marketing approved by the brand owner, or vendor-produced video work commissioned by E-ARI. Not for redistribution.
