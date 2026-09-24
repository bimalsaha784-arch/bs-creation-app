# BS Creation — Branding & Course Management

## Replace the logo

All logo usage (navbar, mobile menu, login/register, dashboard, course pages,
Razorpay checkout popup, footer, browser tab icon) reads from **one** place:
`src/config/brand.ts`.

**Easiest:** replace `public/assets/logo.png` with your own image, keeping the same
file name. Square images work best (256×256 or larger). Redeploy. Done.

**Different file/format:** put the file in `public/assets/` and change `logo` in
`src/config/brand.ts` (e.g. `logo: "/assets/logo.svg"`). Also update the two
`/assets/logo.png` lines in `index.html` if you want the browser tab icon to match.

Other options in `src/config/brand.ts`:

| Setting | What it does |
|---|---|
| `showWordmark` | `false` hides the "BS Creation" text beside the logo (use if your logo already contains the name) |
| `logoOnDark` | Optional white/light logo for the dark green footer. If `null`, the normal logo is shown on a small white tile |
| `tagline` | Footer tagline |
| `supportEmail` | Footer + Contact page email |
| `checkoutThemeColor` | Colour of the Razorpay popup |

If the logo file is ever missing, a "BS" tile is shown instead so nothing breaks.

## Add, edit or remove courses — no code changes

Everything is managed from **Admin panel → Courses**:

| Task | Where |
|---|---|
| Add a course | Admin → Courses → **+ New Course**, then **Publish** |
| Change price / discount | Course edit page → **Price** |
| Change thumbnail | Course edit page → **Thumbnail** (16:9 images look best, e.g. 1280×720) |
| Change title / descriptions / level / duration | Course edit page → **Course details** |
| Remove a course from the site | **Unpublish** it. Students who already bought it keep their enrollment |

New published courses automatically appear on the homepage, the Courses page, and
in every student's **Explore more courses** section.

### How course cards get their "subjects" and "practice / mock" info

Worked out automatically from the course's content:

- **Subjects** — your module titles, in order
- **Notes** — PDF lessons
- **Practice sets** — HTML-app lessons
- **Mock tests** — HTML-app lessons whose title contains "Mock" (e.g. "Mock Test 1")

Courses without a thumbnail get a designed green placeholder with the course initials.
