```markdown
# darun.dev — Design System

This is the contract. If code disagrees with this file, code is wrong.
Every UI decision must be traceable to a rule here.

---

## 1. PRODUCT THINKING (before writing any UI)

Before generating any screen, answer these in a comment at the top of the file:

1. **User:** Who is this for? (recruiter, visitor, owner/admin)
2. **Goal:** What are they trying to do?
3. **Blocker:** What stops them today?
4. **Business value:** Why does this matter for the portfolio's purpose (getting hired)?
5. **Metric:** What improves if this works? (time-on-page, click-through, pitch generations)
6. **Trade-offs:** What did you give up to ship this?

**Design for the happy path. Always handle edge cases:**

- Empty states (with a next-action CTA)
- Loading states (describing what's loading, not just a spinner)
- Error states (naming the problem, offering a fix)
- Slow internet (skeletons, optimistic UI where safe)
- Missing data (truncate, hide, or placeholder — never crash)

---

## 2. TOKENS (Obsidian Forge)

Defined in `packages/web/src/styles/tokens.css`. Never hardcode a color in a component.

```
--void:        #0a0a0f   page background
--surface:     #111118   cards, panels
--border:      rgba(255,255,255,0.06)
--text:        #e2e8f0   primary text (14.2:1 on --void — WCAG AAA)
--muted:       #64748b   secondary text (5.1:1 on --void — WCAG AA)
--iris:        #7c3aed   primary accent
--iris-soft:   #a78bfa   accent hover
--ember:       #f59e0b   warning / secondary accent
--ember-soft:  #fb923c
```

Semantic (add to `tokens.css` on first use):

```
--danger:      #ef4444   errors, destructive actions
--success:     #10b981   success states
--info:        #3b82f6   informational
```

### 60-30-10 color rule (already satisfied by Obsidian Forge)

- **60% neutral:** `--void`, `--surface` (backgrounds, containers)
- **30% secondary:** `--border`, `--muted`, `--text` (UI, borders, content)
- **10% accent:** `--iris`, `--ember` (CTAs, links, focus states)

Never exceed 10% accent coverage on a screen. Purple should feel earned.

---

## 3. SPACING — 4px base unit

Use ONLY these values. Nothing else. Ever.

```
4    micro  (icon-to-label, badge padding, form label→input)
8    xs     (compact gaps, badge padding)
12   sm     (tight groupings)
16   md     (card internal padding, list gaps, form input→next)
24   lg     (input→submit, section gaps, gutter, page margin)
32   xl     (card padding on large surfaces, fieldset gaps)
48   2xl    (button height, touch target minimum)
64   3xl    (between major sections, page top/bottom)
```

Tailwind mapping (default scale matches):

```
p-1=4   p-2=8   p-3=12   p-4=16   p-6=24   p-8=32   p-12=48   p-16=64
```

Before committing, grep for `\[[0-9]+px\]` in className — should be zero matches except for one-off layout fixes.

---

## 4. GRID

- **Columns:** 12
- **Gutter:** 24px
- **Margin:** 24px (16px on mobile)
- **Max content width:** 1280px (`max-w-7xl` in Tailwind)

Layout patterns:

- **Content reading:** `max-w-2xl` (65ch) — never full-bleed body text
- **Two-column section:** `grid grid-cols-1 md:grid-cols-2 gap-6`
- **Three-column grid:** `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- **Never more than 4 columns** at any breakpoint

---

## 5. TYPOGRAPHY

**Font:** Inter (already installed). Fallback: system-ui.
**Code/mono:** JetBrains Mono.

### Scale (7 sizes, no others)

| Token | Size / LH | Tracking | Weight | Use |
|-------|-----------|----------|--------|-----|
| `text-xs`   | 12 / 16 | -2% | 400–500 | Captions, badges, helper |
| `text-sm`   | 14 / 21 | -2% | 400–500 | Secondary, meta |
| `text-base` | 16 / 24 | -2% | 400     | Body copy |
| `text-xl`   | 20 / 30 | -2% | 500     | Card heading |
| `text-2xl`  | 24 / 30 | -3% | 600     | Section heading (compact) |
| `text-3xl`  | 30 / 38 | -4% | 600     | Section heading (standard) |
| `text-5xl`  | 48 / 56 | -6% | 600–700 | Page heading (H1, one per page) |
| `text-6xl`  | 60 / 64 | -6% | 700     | Display (hero only) |

Mapping: H1 → `text-5xl` normally, `text-6xl` on the homepage hero only. H2 → `text-3xl`. Card headings → `text-xl`.

### Weights — 3 maximum per screen

- **400** Regular — body copy
- **500** Medium — labels, nav, UI controls
- **600** Semibold — headings

**700 Bold** reserved for the hero display. Never for buttons or body text.

### Rules

- Body text max 65ch wide.
- Never center-align paragraphs over 3 lines.
- Never use `--muted` for body copy — only for meta/secondary.
- Every size change comes from the table above.

---

## 6. COMPONENTS

### Interactive states — every control, every time

| State | Visual |
|-------|--------|
| Default | Spec'd below |
| Hover | Accent lift or 5% bg shift, 150ms |
| Focus | 2px ring `--iris`/40, offset 2px, always visible |
| Active | 1px translate down, or 10% darker |
| Disabled | 50% opacity, `cursor-not-allowed`, no hover |
| Loading | Spinner replaces label, no layout shift |
| Error | `--danger` border + helper text below |
| Success | `--success` inline feedback, auto-clears in 3s |

Use `focus-visible:` for keyboard-only focus rings.

### Buttons

```tsx
// Primary — filled iris, 48px min height
className="h-12 inline-flex items-center gap-2 rounded-full bg-(--iris) px-6 font-medium text-white transition hover:bg-(--iris-soft) focus-visible:ring-2 focus-visible:ring-(--iris) focus-visible:ring-offset-2 focus-visible:ring-offset-(--void) disabled:opacity-50 disabled:cursor-not-allowed"

// Secondary — outlined
className="h-12 inline-flex items-center gap-2 rounded-full border border-(--border) px-6 font-medium text-(--text) transition hover:border-(--iris-soft)"

// Ghost
className="h-10 px-3 font-medium text-(--muted) transition hover:text-(--text)"
```

### Inputs — form spacing (crucial)

```
Label → input:          6px  (gap-1.5)
Input → next label:     16px (gap-4 or space-y-4)
Input → submit button:  24px (mt-6)
Between field groups:   32px (space-y-8)
```

Field anatomy:

```tsx
<div className="flex flex-col gap-1.5">
  <label className="text-sm font-medium text-(--text)">Email</label>
  <input className="h-12 rounded-lg border border-(--border) bg-(--surface) px-3 text-base text-(--text) placeholder:text-(--muted) focus:border-(--iris) focus:outline-none focus:ring-2 focus:ring-(--iris)/40" />
  {error && <p className="text-xs text-(--danger)">{error}</p>}
</div>
```

### Cards

- Compact: `p-6` (24px)
- Section: `p-8` (32px)
- Soft shadow: `shadow-[0_4px_20px_rgba(0,0,0,0.15)]`
- Border: `border border-(--border)`
- Radius: `rounded-2xl`

### Touch targets

Minimum 48px height for any tap target. Text-only buttons pad to reach 48px. Table actions may be 36px with 8px clearance.

---

## 7. VISUAL EFFECTS

- **Glassmorphism:** `backdrop-blur-md bg-(--surface)/80` — cards, modals, nav on scroll
- **Glow:** `shadow-[0_0_30px_-8px_rgba(124,58,237,0.4)]` for primary CTAs only
- **Micro-interactions:** 150ms (color/border), 250ms (movement), 400ms (entrance)
- **Easing:** `ease-out` default. Never linear except for progress bars.
- **Scroll animation:** opacity + translateY(12px) only. No scale, no rotation.

---

## 8. UX WRITING

### CTAs — outcome-driven

| Bad | Good |
|-----|------|
| Submit | Send message → |
| Save | Save project |
| Login | Sign in |
| Search | Find jobs → |
| Continue | See availability → |

The `→` suffix means forward navigation. Not for saves.

### Micro-copy

- Speak as the product, not the developer.
- Errors name the problem + how to fix: "Password must be 12+ characters" — not "Validation failed."
- Empty states give next action: "No projects yet. **Add your first →**"
- Loading states describe the work: "Searching 4 sources…" not just "Loading…"

### Density

- Break content over 3 lines into sections, accordions, or tabs.
- Card descriptions truncate at `line-clamp-2`, expand in modals.

---

## 9. RESPONSIVE

### Breakpoints (content-driven)

```
sm:  640px   phone landscape
md:  768px   tablet
lg:  1024px  desktop
xl:  1280px  wide (content max)
```

### Rules

- Reflow, don't shrink. Reorganize content for space.
- Mobile: primary action above the fold. Secondary below.
- Nav collapses to hamburger below `md`. Focus-trap the mobile menu.
- Grid columns: 1 → 2 at `md` → 3 at `lg`. Never more.
- **No horizontal scroll, ever.** Test at 360, 412, 768, 1024.

---

## 10. ACCESSIBILITY (WCAG AA minimum)

- Body text on `--void`: 7:1 min → `--text` is 14.2:1 ✅
- Secondary text: 4.5:1 min → `--muted` on `--void` is 5.1:1 ✅
- Never put `--muted` on `--iris` or mid-tone surfaces without re-checking contrast
- Every interactive element Tab-reachable with visible focus ring
- Modals: trap focus, restore on close, `Esc` closes
- Loading skeletons use `aria-busy="true"`
- Icon-only buttons need `aria-label`

---

## 11. AI SELF-CRITIQUE (run before every commit)

Answer each in a comment block at the top of the file:

- [ ] Hierarchy obvious? (heading → subhead → body → caption in order)
- [ ] Body text max 65ch wide?
- [ ] All spacing from the 4px scale? (`grep '\[[0-9]+px\]'` returns zero)
- [ ] 60-30-10 color rule respected?
- [ ] Contrast ≥ 4.5:1 for text?
- [ ] Line-height comfortable on body copy (1.5–1.7)?
- [ ] ≤3 font weights on screen?
- [ ] Every interactive element has hover + focus + disabled states?
- [ ] Touch targets ≥ 48px on mobile?
- [ ] No horizontal scroll at 360px?
- [ ] Every CTA says what happens next?
- [ ] Empty + error + loading states handled?

Then run these three internal prompts and act on the output:

1. **Devil's Advocate:** As a senior UX designer, challenge this solution. What assumptions did you make? Where will this fail for a real user?

2. **Product Thinking:** What trade-offs did you make? How does this solve the user's actual problem?

3. **UX Writing Assistant:** Review every string. Can it be shorter, clearer, less jargony? Are button labels outcome-driven?

---

## How to use this file with an AI assistant

**Reference it, don't paste it.**

- ✅ Correct: `Read DESIGN.md. Fix the testimonial contrast in testimonials-section.tsx.`
- ❌ Wrong: paste the whole file into the chat

The AI reads `DESIGN.md` from disk. Saves ~3,000 tokens per task.

**One task, one session.** Close the chat between tasks. Long context chains burn tokens fast.

**Never let the AI paste DESIGN.md back at you.** Ask targeted questions ("What's the input→submit gap per DESIGN.md?") not general ones ("Summarize the design system").

---

## Updating this file

When a rule genuinely changes, edit this file in the same commit as the code change. Never let the file drift from reality.
```

---

## After Antigravity writes it

```bash
cd /Users/bjork/Documents/portfolio/darun.dev
wc -l DESIGN.md       # ~340 lines
head -5 DESIGN.md     # should start with "# darun.dev — Design System"
git status            # DESIGN.md untracked
```