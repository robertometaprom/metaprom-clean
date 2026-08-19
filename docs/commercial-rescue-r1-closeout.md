# Commercial Rescue R1 closeout

**Status:** Research cycle closed. Library uncommitted. Inspector not implemented.  
**Date:** 2026-08-18  
**HEAD at closeout:** `078da0545d086b53e46fcea9cd59b4843c9dd6cb`  
**Branch:** `sprint/hero-barrier-removal`  
**This document is architecture and evidence. It does not wire production.**

Interactive matrix (outside the git repo): Cursor canvas `inspector-feasibility-matrix.canvas.tsx`.

Related evidence (gitignored QA trees, not for commit):

- `tmp-sattva-packaging-qa/` — Golden Benchmark #2 packaging commercial
- `tmp-caroline-smith-qa/` — Caroline Smith composed fashion commercial
- `tmp-commercial-rescue-qa/` — R1 / R1.1 / R1.2 / TTS+CTA repair proofs

**Re-verified this closeout (no providers, no production edits):** `npm run test:video-repair` → **13 pass / 0 fail**. Isolation grep: no `app/` or production video module imports `video-repair`.

---

## 1. What R1 actually delivered

Commercial Rescue R1 is an **isolated local FFmpeg repair library**. It is not an Inspector, not a Director path, and not a customer feature.

| Slice | What was proven | What was not proven |
|---|---|---|
| **R1** | Deterministic local repair (`cut_if_safe`, `crossfade_bridge`, `hold_and_bridge`) on an explicit buffer/path. Fail-closed timestamp/duration guards. No providers. | Automated defect-window detection. First Sattva attempt used **2.25s–10.0s** and failed `interval_exceeds_maximum` (7.75s vs max 1s). Selected attempt was a **1s peak-mouth** patch at **3.5–4.5s**. Human window was **3.542s–4.750s**. The automated diagnosis was **wrong**. Source: `tmp-commercial-rescue-qa/run-r1-rescue.mts`, `r1-rescue-summary.json`. |
| **R1.1** | `editorial_cutaway` replaces a localized visual defect with a still from clean pixels **outside** the defect, duration-preserving, audio stream copied. Provider cost **$0**. Extra hand gone. Audio MD5 unchanged. | That automation can *find* the window. Human review supplied frames 85–113 / `3.542s–4.750s`. Source: `r2-rescue-summary.json`. |
| **R1.2** | Repair must consume an **explicit current-valid source**. Filename `final` is not provenance. Direct cut removed the visual defect but **broke timeline/A/V continuity** (picture shorter than copied AAC). | Direct cut as a default strategy when audio already exists. Source: `r12-rescue-summary.json`. |

Tests at closeout: `npm run test:video-repair` → **13 pass, 0 fail**.

---

## 2. Formal R1 product invariants

These are engineering invariants for all later repair/inspect/orchestrate work.

### A. Preserve what works

Once a component is accepted as current-valid, later work must not silently replace it with an older or unrelated version. Sattva R1.2: `sattva-keto-commercial-final.mp4` is a historical filename, not the current-valid visual after cutaway. The approved visual is `sattva-visual-repaired-v2.mp4`. Later TTS+CTA used that visual, not the direct-cut file (`sattva-final-repair-summary.json` `sourceVisualReason`).

### B. Repair only what failed

- Visual failed → do not regenerate/rewrite voice/music/SFX/copy unless those are independently failed.
- TTS failed → do not touch video.
- Deterministic overlay failed → do not regenerate generative media.

Sattva final component repair regenerated TTS + added a CTA overlay on the frozen cutaway visual. Video generation cost remained **$0**. Music/SFX were preserved (`musicSfxPreserved: true`).

### C. Never regress

A later repair must not reintroduce a previously resolved defect. Direct-cut was rejected as the current-valid visual because it traded the extra-hand for A/V desync. Subsequent TTS/CTA work started from the cutaway visual, not from the direct-cut file.

### D. Current valid state

Every repair consumes an **explicitly selected** current-valid state or component.

Do not infer from: filename, `"final"` suffix, newest mtime alone, or directory search.

If provenance is ambiguous: **fail closed** (`source_unresolved`).

Implemented in `lib/video-repair/source-asset.ts`. `repairVideoSegment` requires `inputPath` or `inputBuffer`.

### E. Never regenerate what Metaprom can repair

Escalation order (exact order may vary by defect type; expensive regeneration is not the default):

1. PASS
2. LOCAL DETERMINISTIC REPAIR
3. CHEAP COMPONENT RETRY
4. ALTERNATE CHEAP COMPONENT STRATEGY/PROVIDER
5. EXPENSIVE VIDEO REGENERATION
6. INTERNAL HUMAN ESCALATION

### F. Human escalation is internal

Not a customer-facing product or button. Director/Orchestrator may trigger internal escalation when automated production cannot reach required quality/confidence within defined time, cost, retry, and repair limits. The customer experiences one continuous Metaprom production process.

### G. Client buys the result, not the generation

Internal provider retries/repairs are production cost. The customer does not buy Kling attempts, Veo attempts, TTS attempts, or raw generations. The customer buys the finished advertising asset.

---

## 3. Black-box production model

Inspection is **decomposed by defect/category**. There is no universal Inspector.

```
DIRECTOR
  → PRODUCTION PLAN / RECIPE
  → GENERATE COMPONENTS
  → INSPECT COMPONENTS          (per-category; fail closed on ambiguity)
  → FREEZE APPROVED COMPONENTS  (explicit current-valid records)
  → REPAIR / RETRY ONLY FAILED COMPONENT
  → VERIFY
  → FINAL ASSEMBLY
  → FINAL QA
  → DELIVER

If automated paths are exhausted:
  → INTERNAL HUMAN ESCALATION
```

Freeze is a named record (path + hash + reason + timestamp), not “whatever file is newest.”

---

## 4. Key evidence (do not rewrite)

Contemporaneous automation records and later human/owner judgment are listed separately. Do not collapse them.

### Sattva — contemporaneous automation

- Ledger `tmp-sattva-packaging-qa/sattva-qa-ledger.json`: `packagingFidelity: 7`, pass target **≥8**, `packagingBenchmark: FAIL`, `brandOwnerAcceptance: BORDERLINE`, `creativeQuality: 8.5`, known cost **$1.471**.
- Forensic write-up (Golden Benchmark #2 closeout): spelling **EXACT**, package blue **EXACT**, logo **MINOR DEVIATION**. Invented/malformed microcopy: `Nettos`, `votos`, `Saporrate tanto`; nutrition numbers flickered (`52` vs `82` calories). Secondary microcopy was the fidelity failure mode, not a fictional package.
- Pre-video packaging gate: **PASS** (`pre-video-packaging-gate.json`) — identity recognizable enough to generate video.
- Isolated TTS Whisper: **“Sattva…”**. Mix Whisper: **“SADVA…”**. Post-voice mix slice: **“God bless.”** (`whisper-final-summary.json`). Isolated music/SFX: `hasSpeech: false`.
- R1 runner treated extra-hand as **2.25s–10.0s**, then repaired **3.5–4.5s**. Human window later: **3.542s–4.750s** (frames 85–113).
- R1.1 cutaway: duration **10.04s** preserved, decode **0**, `blackDetectHits: 0`, audio MD5 `4db356ee79c267cd5e7731f35a4b6df5` unchanged, provider **$0**.
- R1.2 direct cut: visual duration **10.02s**, AAC copied full, “picture leads remaining audio by the removed interval.”
- TTS+CTA repair: overlay `PÍDELO POR WHATS AL 5529 434693` exact; `textWidth` 938 vs `barWidth` 1776; IPA retry Whisper **SADVA / Saddwa**; video generation **$0**.

### Sattva — later human / owner judgment (this cycle)

- Packaging visually judged **excellent** after viewing — **stricter than / opposite to** the contemporaneous 7/10 FAIL on overall identity. Microcopy issues remain real.
- Extra-hand localized by human frame review to **~3.542s–4.750s**.
- Human listening heard **“Chacha” / “Schatva”** while Whisper claimed Sattva/SADVA. Human listening is authoritative for pronunciation. IPA TTS retry was **not** ASR-proof.
- Editorial cutaway: extra hand gone, **no ghosting** (human). Direct cut was commercially wrong despite removing the hand.

### Caroline — contemporaneous automation

- Ledger: wall-clock **654048 ms (~10 m 54 s)** first submit → final MP4. Visual MD5 preserved through mix: `cf5cc45d28051ca5d352132fb8deca26`.
- Mix: loudnorm near target (−16.83 LUFS / −1.41 dBTP vs −16 / −1.5). `maxDb: -1.4`. Decode used.
- Isolated TTS and final-mix Whisper matched authorized ordinary Spanish copy (`Caroline Smith…`). That does **not** license brand-name ASR gates.
- Coat fidelity report: color preserved; silhouette/collar/closure **PARTIAL**; **not pixel-faithful**; product **recognizable**; unauthorized redesign **NO**.

### Caroline — later human / owner judgment (this cycle)

- Fashion result **highly sellable / premium**.
- Product recognizably faithful; **minor garment details changed**.
- **No major anatomy defect** observed.
- Full composed commercial demonstrated end-to-end value.

---

## 5. Inspector Feasibility Matrix

Primary classification is one of:

1. **DETERMINISTIC**
2. **RELIABLY MACHINE-INSPECTABLE**
3. **PROBABILISTIC / NEEDS CONFIDENCE THRESHOLD**
4. **HUMAN-JUDGMENT / ESCALATION CANDIDATE**

**Class counts (58 rows, one primary class each):** Deterministic **20** · Reliably inspectable **5** · Probabilistic **10** · Human **23**.

### Technical media

| Defect | Class | Why | Method | Confidence | FP risk | FN risk | Automated action | Escalate when | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| Missing video stream | DETERMINISTIC | Probe either finds a video stream or not | FFmpeg `-i` / `parseFfmpegProbeOutput` | High | Low | Low | `FAIL_TECHNICAL` | Probe itself fails closed | Both (probe used) |
| Missing audio stream | DETERMINISTIC | Stream presence is binary; silent visual masters are valid **components** | Same probe `hasAudio` | High | Low if component type is known | Low | Fail on **final**; allow on silent visual | Final delivery lacks audio and recipe requires it | Both (Sattva silent master vs muxed final) |
| Wrong duration | DETERMINISTIC | Compare probe duration to recipe with epsilon | Probe duration | High with epsilon | Medium (10.04 vs 10.00; hold-bridge 10.08) | Low | `REPAIR` remux or `FAIL_TECHNICAL` | Drift exceeds epsilon after repair | Both + R1 hold drift |
| Wrong resolution | DETERMINISTIC | WxH vs recipe | Probe | High | Low | Low | `FAIL_TECHNICAL` or scale-repair | Scaling would change generative content | Both 1920×1080 |
| Wrong fps | DETERMINISTIC | fps/tbr vs recipe | Probe | High | Medium (`tbr` vs `fps`) | Low | `FAIL_TECHNICAL` | Ambiguous rate fields | Both 24 fps |
| Decode corruption | DETERMINISTIC | Decoder errors are hard failures | `ffmpeg -v error -i … -f null` | High | Low | Low for hard errors | `FAIL_TECHNICAL` | Soft artifacts without decoder error | Sattva `decodeStatus: 0` |
| Black frames | RELIABLY MACHINE-INSPECTABLE | `blackdetect` is deterministic **given thresholds**; dark scenes fool it | `blackdetect` | High at documented thresholds | Medium (dark kitchen) | Medium (not fully black) | `REPAIR` / `ESCALATE_INTERNAL` | Hits in intended product frames | Sattva `blackDetectHits: 0` |
| Broken timestamps | DETERMINISTIC | Missing Duration / DTS discontinuities | Probe + packet check | High for missing Duration | Medium for benign discontinuities | Medium | `FAIL_TECHNICAL` | Unparseable container | Sattva Duration parsed |
| A/V duration mismatch | DETERMINISTIC | Stream durations are measurable | Probe video vs audio duration; frame count | High | Low | Low | `FAIL_TECHNICAL` or duration-preserving repair | Intentional silent tail not declared | **Sattva R1.2 direct cut** |
| Gross A/V sync | PROBABILISTIC | Known duration delta is measurable; lip-sync without that knowledge is not | Duration delta; do **not** claim lip-sync | Medium when delta known; low otherwise | Medium | High for subtle sync | `REPAIR` if delta known; else escalate | Unexplained sync, or lip-sync required | **Sattva direct cut: picture led audio** |
| Clipping / peak / loudness | DETERMINISTIC | Sample peaks and loudnorm are numeric | `volumedetect`, `loudnorm` measure | High for peaks | Medium vs artistic limiter targets | Low for true clip | `RETRY_COMPONENT` rematch mix | Recipe has no loudness target | Both (Caroline loudnorm; Sattva `maxDb: -1.5`) |

### Deterministic commercial copy

Applies to **overlays Metaprom rendered**, not to text printed on the customer’s package.

| Defect | Class | Why | Method | Confidence | FP risk | FN risk | Automated action | Escalate when | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| Exact phone | DETERMINISTIC | Overlay source string is known | Compare recipe ↔ overlay SVG/PNG text + hash | High | Low | Low if we skip OCR | `FAIL_TECHNICAL` / rebuild overlay | Phone exists only on-pack, not in overlay | **Sattva CTA `5529 434693`** |
| Exact URL | DETERMINISTIC | Same as phone | Same | High | Low | Low | Same | URL not in recipe | None in these QA runs |
| Exact CTA | DETERMINISTIC | Renderer owns the string | Same + overlay duration | High | Low | Low | Rebuild overlay; do not regenerate video | CTA must appear as spoken words | **Sattva `PÍDELO POR WHATS…` exact** |
| Exact price/promotion | DETERMINISTIC | Same if overlay-owned | Same | High | Low | Low | Same | Price only on pack | None in these QA runs |
| Exact headline | DETERMINISTIC | Overlay-owned only | Same | High | Low | Low | Same | Headline is on-pack microcopy | Package headlines ≠ overlay |
| Overlay visibility duration | DETERMINISTIC | Filter timestamps are known | Confirm overlay filter span vs recipe | High | Low | Low | Rebuild overlay | Human says it “feels” too short despite correct span | **Sattva full-duration overlay** |
| Text clipping | DETERMINISTIC | Renderer can measure bbox | Sharp text width vs bar; refuse if overflow | High | Low | Low | Relayout overlay | After relayout still overflows at min font | **Sattva `textWidth` vs `barWidth`** |
| Logo overlay source/hash | DETERMINISTIC | Bytes are hashable | SHA of overlay asset vs frozen | High | Low | Low | `FAIL_TECHNICAL` | Asset missing | Not used in these QA runs |
| Overlay layout / safe margins | DETERMINISTIC | Coordinates are in the recipe | Compare x/y/w/h vs safe-area constants | High | Low | Low | Relayout | Aesthetic “too low” after numeric pass | **Sattva `bottom_safe_bar`** |

### Product / brand visual

| Defect | Class | Why | Method | Confidence | FP risk | FN risk | Automated action | Escalate when | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| Product missing | PROBABILISTIC | Presence is visual judgment | Future vision model; not R1 | Low–medium | High | High | Do **not** auto-regenerate on a weak score | Any low-confidence miss | Both: product present by human |
| Product materially changed | HUMAN-JUDGMENT | “Material” is brand-owner judgment | Human | n/a as gate | n/a | n/a | Freeze and escalate | Always for materiality | **Caroline coat recognizable, not pixel-faithful, still sellable** |
| Package color changed | PROBABILISTIC | Histogram can catch gross hue shifts, not “print faithful” | Color stats vs source crop | Low–medium | High | High | Never a hard fail | Ambiguous lighting vs true recolor | Sattva forensic “package blue EXACT” vs overall 7/10 |
| Logo/brand missing | PROBABILISTIC | Spelling/OCR on pack is unstable | OCR/vision | Low | High | High | Escalate; do not trust OCR pass | Brand-critical | Sattva spelling EXACT, logo MINOR DEVIATION |
| Package layout altered | HUMAN-JUDGMENT | Automated layout score disagreed with later human “excellent” | Human | n/a | Automated 7/10 vs later human excellent | Microcopy issues still real | Escalate; **do not hard-fail on forensic score** | Score vs human conflict | **Sattva forensic 7 vs later human excellent** |
| Text on package malformed | HUMAN-JUDGMENT | Secondary copy was garbled; OCR would both over- and under-flag | Human | Low if OCR | High | High | Escalate | Any on-pack legal/nutrition text | **Sattva `Nettos`/`votos`/`Saporrate`** |
| Label microcopy corrupted | HUMAN-JUDGMENT | Nutrition numbers flickered | Human frame review | Low | High | High | Escalate | Health claims / legal copy | **Sattva 52 vs 82 calories** |
| Garment changed | HUMAN-JUDGMENT | Minor fashion drift can still be sellable | Human | n/a | High if pixel-diff | High | Escalate; do not regenerate by default | Customer-critical silhouette | **Caroline PARTIAL silhouette/collar/closure** |
| Product occluded by unintended object | HUMAN-JUDGMENT | Extra hand was occlusion + anatomy | Human window | Low if automated | **R1 window was wrong** | High | Escalate unless human-supplied window | Automated window vs human conflict | **Sattva extra hand** |

### Anatomy / visual artifacts

| Defect | Class | Why | Method | Confidence | FP risk | FN risk | Automated action | Escalate when | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| Extra hand | HUMAN-JUDGMENT | First automated window was badly wrong | Human frame review | Automated: **low** | High (stirring hands, contact sheets) | High (localized 1.2s miss) | Repair **only** with an explicit window; else escalate | Any automated localization | **Sattva R1 2.25–10.0 then 3.5–4.5; human 3.54–4.75s** |
| Extra arm | HUMAN-JUDGMENT | Same class as extra hand | Human | Low automated | High | High | Escalate | Suspected | None observed in later human review |
| Fused hands | HUMAN-JUDGMENT | Same | Human | Low | High | High | Escalate | Suspected | Sattva stirring is easy to misread |
| Face deformation | HUMAN-JUDGMENT | Subjective + model-specific | Human | Low | High | High | Escalate | Suspected | Not the Sattva blocker |
| Duplicated person | HUMAN-JUDGMENT | Occasional vision help, not proven here | Human | Low | High | High | Escalate | Suspected | None observed |
| Object/body intersection | HUMAN-JUDGMENT | Same | Human | Low | High | High | Escalate | Suspected | None proven |
| Disappearing/reappearing product | PROBABILISTIC | Gross presence flicker might be trackable later | Future tracker | Low today | High | High | Escalate | Suspected | Not the proven Sattva mode |
| Impossible motion | HUMAN-JUDGMENT | “Strange but valid” vs broken | Human | n/a | High | High | Escalate | Always | Creative category overlap |
| Ghosting | PROBABILISTIC | Crossfade/hold can introduce it | Frame differencing + human | Low | High (motion blur) | Medium | Prefer cutaway over body-pose crossfade; escalate if visible | Visible after repair | **R1.1: no ghosting after cutaway** (human) |
| Obvious continuity jump | PROBABILISTIC | Direct cut **creates** a jump; may be intended | Duration + scene-change metrics | Medium for cuts | High | Medium | Do not use `cut_if_safe` when audio must stay; escalate if jump is the complaint | Jump after duration-preserving repair | **Sattva direct cut vs cutaway** |

### Audio / speech

| Defect | Class | Why | Method | Confidence | FP risk | FN risk | Automated action | Escalate when | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| No authorized voice | RELIABLY MACHINE-INSPECTABLE | Empty voice stem is measurable | Duration + `hasSpeech` on **voice stem** | High for absence | Low | Low | `RETRY_COMPONENT` TTS | Voice expected and stem silent | Both stems had speech |
| Unauthorized second voice | RELIABLY MACHINE-INSPECTABLE on **stems** | Stem ASR empty was true; mix ASR invented speech. Primary class is stem check. Mix is not a gate. | `hasSpeech` on SFX/music stems only | High on stems; **low on mix** | **Mix “God bless.” FP** | Medium if music masks speech | `RETRY_COMPONENT` that stem | Mix-only ASR conflict | **Sattva stems clean; mix FP** |
| Extra dialogue in SFX | RELIABLY MACHINE-INSPECTABLE | Isolated SFX Whisper empty | Stem `hasSpeech` | High on stem | Low on stem | Medium if buried | `RETRY_COMPONENT` SFX | Stem speech detected | **Sattva sfx-a/b `hasSpeech: false`** |
| Vocals in instrumental music | RELIABLY MACHINE-INSPECTABLE | Isolated music Whisper empty | Stem `hasSpeech` | High on stem | Low | Medium | `RETRY_COMPONENT` music | Stem speech/vocals | **Sattva music `hasSpeech: false`** |
| Exact transcript mismatch | PROBABILISTIC | ASR agreed on ordinary copy and **failed** the brand name | ASR vs recipe | Medium for common words; **low for names** | High | High | Never hard-pass a brand name via ASR | Name/phone tokens | **Sattva Whisper “Sattva”/“SADVA” vs human “Chacha”**; Caroline ordinary copy matched |
| Missing brand name | PROBABILISTIC | Same ASR failure mode | ASR | Low | High | High | Escalate | Brand-critical | Sattva |
| Wrong phone spoken | PROBABILISTIC | Phone in TTS would be ASR-fragile; Sattva phone was **overlay** | Prefer overlay check; ASR last | Low for ASR | High | High | Overlay rebuild if visual; escalate if spoken | Spoken phone required | Phone was overlay, not TTS |
| Clipping | DETERMINISTIC | Peak is numeric | `volumedetect` | High | Medium vs limiter | Low | Remix | Persistent after limiter | Both |
| Silence | DETERMINISTIC | Voice window energy | `silencedetect` / duration | High | Medium (intentional pause) | Low | `RETRY_COMPONENT` TTS | Unexpected full-window silence | Voice windows present |
| Brand/name pronunciation quality | HUMAN-JUDGMENT | ASR cannot hear what humans hear | Human listen | ASR **not usable** | ASR false pass | ASR false fail | `RETRY_COMPONENT` then escalate | After cheap TTS retries | **Human > Whisper; IPA retry still Whisper SADVA/Saddwa** |
| Accent / naturalness | HUMAN-JUDGMENT | Subjective | Human | n/a | n/a | n/a | Escalate | Always as a gate | Both used `ara` / es-MX |
| Emotional delivery | HUMAN-JUDGMENT | Subjective | Human | n/a | n/a | n/a | Escalate | Always as a gate | None automated |
| Intelligibility under music | HUMAN-JUDGMENT | Mix ASR is contaminated | Human | Low if ASR | Mix FP | High | Remix ducking then escalate | After mix retry | Sattva mix Whisper ≠ human |

### Creative / human quality

| Defect | Class | Why | Method | Confidence | FP risk | FN risk | Automated action | Escalate when | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| “Does this feel premium?” | HUMAN-JUDGMENT | Not a measurable gate | Human | n/a | High if scored | High | Never a hard gate | Always if used as ship criterion | **Caroline later human: highly sellable/premium** |
| “Is the model attractive enough?” | HUMAN-JUDGMENT | Not automatable; not a product promise to score | Human | n/a | High | High | Do not inspect | Brand-owner objection | Caroline human context |
| “Does this commercial feel awkward?” | HUMAN-JUDGMENT | Extra-hand was awkward; automation missed the window | Human | n/a | High | High | Escalate | Always | Sattva |
| “Does the motion feel strange but technically valid?” | HUMAN-JUDGMENT | Technical pass ≠ publishable | Human | n/a | High | High | Escalate | Always | Direct cut was technically a cut and commercially wrong |
| “Is the result actually publishable?” | HUMAN-JUDGMENT | Ship decision | Human / internal escalation | n/a | High | High | Escalate after automated exhaustion | Default when confidence ≠ HARD_PASS | Both |
| “Does customer-specific intent feel satisfied?” | HUMAN-JUDGMENT | Director-level | Human | n/a | High | High | Escalate | Always | Both |

---

## 6. Inspection confidence states

Simple Orchestrator statuses. Not a state machine product.

| State | Evidence that triggers it | Delivery allowed? | Frozen components stay frozen? | Next allowed action | Cost / time |
|---|---|---|---|---|---|
| **HARD_PASS** | Deterministic checks pass; no open human-class blockers; recipe-critical overlays match | Yes | Yes | Assemble / deliver | $0 inspect |
| **LIKELY_PASS** | Deterministic pass; probabilistic checks in-band; no customer-critical ambiguity | Yes only if no customer-critical unverified element | Yes | Deliver **or** internal spot-check if budget remains | $0–cheap |
| **REPAIR** | Localized defect + explicit window + duration-preserving strategy available | No until verify | Yes (repair input is current-valid) | Local deterministic repair, then VERIFY | Local CPU; $0 provider |
| **RETRY_COMPONENT** | Cheap component failed (TTS/SFX/music/overlay); visual frozen | No until verify | Yes for non-failed components | Retry that component only | Cents; seconds–minutes |
| **REGENERATE** | Visual cannot be repaired locally; cheap paths exhausted; budget remains | No | Yes for audio/copy that still pass | One expensive video regeneration | ~$1+; minutes |
| **ESCALATE_INTERNAL** | Human-class defect, contradiction, or limits hit | No (customer still waits on one process) | Yes | Internal human; no customer button | Human time; no extra customer SKU |
| **FAIL_TECHNICAL** | Missing streams, decode death, unresolvable source, absurd repair window | No | Keep last current-valid if any | Stop or escalate; do not silently pick another file | $0 additional |

Contradictory results (ASR vs human-class name, forensic score vs later human, automated window vs human window) **cannot** be HARD_PASS. They are `ESCALATE_INTERNAL` or at best `RETRY_COMPONENT` if a cheap retry is still in budget.

---

## 7. Internal human escalation policy

Automation stops. Customer still sees one Metaprom production process.

**Stop and escalate when any of:**

- Repeated low-confidence inspection on the same component
- Deterministic repair attempts exhausted
- Expensive regeneration limit reached
- Brand/product fidelity is ambiguous (Sattva 7 vs later human excellent)
- Pronunciation or creative quality cannot be machine-judged
- Contradictory inspection results
- A customer-critical element (phone, legal claim, brand name spoken) cannot be verified

**Provisional engineering defaults — not customer-facing promises:**

| Limit | Initial default | Why |
|---|---|---|
| Max deterministic repair attempts | **2** | R1 wrong window + R1.1 cutaway was enough; do not loop strategies |
| Max cheap component retries | **2** per component (TTS, SFX, music, overlay) | Sattva TTS retry still was not ASR-proof; don’t burn the loop |
| Max expensive video regenerations | **1** | Default is repair; one regenerate is last automated resort |
| Max automated wall-clock after first accepted expensive visual | **8 minutes** | R1.1 cutaway ~36s; R1 encode ~66s; TTS+CTA ~97s. 8 minutes covers several local repairs + cheap retries |
| Max additional provider-cost after first accepted visual | **$0.50** | Covers TTS/SFX/music retries, not another Kling (~$1.12) |

---

## 8. Proposed Inspector R1 — exact scope

**Do not inspect everything.** Inspector R1 is the smallest useful automated gate, isolated, unwired.

### In scope

1. **Media health (FFmpeg, local)**  
   `hasVideo`, `hasAudio` vs component type, duration/resolution/fps vs recipe with documented epsilon, decode (`-v error`), A/V duration match, `blackdetect` with documented thresholds, peak/loudness vs recipe bounds.
2. **Frozen current-valid identity**  
   Explicit path + hash for visual / voice / music / SFX / overlay. Fail closed if missing or mismatched. No `final` filename inference.
3. **Self-rendered copy/overlay contract**  
   Exact CTA/phone/URL/headline strings in the overlay source, overlay duration, layout vs safe margins, overlay asset hash. Rebuild overlay on mismatch. Do not OCR the video.
4. **Structured Orchestrator output**  
   One of the confidence states above, plus per-check records. No prose-only verdict.
5. **Unauthorized speech on isolated stems only (optional same slice if a cheap ASR is already in QA)**  
   `hasSpeech` on music/SFX stems. Mix-wide ASR is **out**. Brand-name pronunciation is **out**.

### Explicitly out of Inspector R1

- Pronunciation quality / accent / emotion / intelligibility-under-music as a gate
- Subjective “premium” / attractiveness / awkwardness / publishable scoring as a hard gate
- Anatomy detection or defect-window localization (extra hand, fused hands, face, etc.)
- Packaging fidelity / garment fidelity / microcopy scoring as a hard gate
- Exact transcript match as proof of brand-name pronunciation
- Production wiring, Director, `/api/video`, entitlements, Stripe, Supabase, Biblioteca

### Smallest next implementation slice

`lib/video-inspect/` + `tests/video-inspect.test.ts`, modeled on `lib/video-repair/`:

- Consume a **recipe + explicit frozen component records**
- Run FFmpeg/Sharp only
- Return structured status
- Isolation tests identical in spirit to video-repair (no fetch, no `/api/video`, no Director)
- **No production import**

Do not implement Inspector in this closeout.

---

## 9. R1 commit-readiness

**Verdict: READY WITH EXCLUSIONS.** The repair library is isolated and tested. Do not commit QA trees or unrelated dirty files. Do not stage in this closeout.

| Check | Result |
|---|---|
| Isolated from production | YES — no `app/` or `lib/video/generate-commercial-video.ts` imports `video-repair` |
| Provider calls in library | NONE |
| Production routing / Director / `/api/video` | UNCHANGED |
| Entitlements / Stripe / Supabase schema / Biblioteca | UNCHANGED |
| Tests | `npm run test:video-repair` **13 pass / 0 fail** (re-run this closeout) |
| QA tmp intended for commit | NO (`tmp-*` gitignored) |
| Unrelated dirty files | YES — must be excluded |

### Include in the eventual R1 commit

- `lib/video-repair/types.ts`
- `lib/video-repair/ffmpeg.ts`
- `lib/video-repair/repair-video-segment.ts`
- `lib/video-repair/source-asset.ts`
- `tests/video-repair.test.ts`
- `tests/tsconfig.video-repair.json`
- `package.json` — only the `test:video-repair` script addition
- `docs/commercial-rescue-r1-closeout.md` (this file)

### Exclude

- Entire `tmp-commercial-rescue-qa/` (runners, MP4s, frames, summaries)
- Entire `tmp-sattva-packaging-qa/`
- Entire `tmp-caroline-smith-qa/`
- Entire `tmp/` (Chrome/Edge debug profiles, brand screenshots, etc.)
- `lib/brand.ts` (hashes differ from HEAD; unrelated; unified diff may be empty due to encoding/line endings)
- `public/brand/metaprom-logo-mobile.png`
- `supabase/config.toml`

### Experimental code

QA runners under `tmp-commercial-rescue-qa/*.mts` are **experiments** and must not be committed. The library itself is the R1 product slice, including `editorial_cutaway` and fail-closed source resolution. Known caveat: `hold_and_bridge` can drift ~0.04s; tests already allow 0.12s. `cut_if_safe` is unsuitable when existing audio must stay in sync — that is documented behavior, not leftover experiment.

---

## 10. Closeout hygiene (this document’s producing task)

- Provider calls made: **NO**
- Credits spent: **NO**
- Production wiring changed: **NO**
- Commit performed: **NO**
- Push performed: **NO**
- Deploy performed: **NO**
