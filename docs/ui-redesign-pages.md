# Uttoron — UI Redesign Page Tracker

Companion to `ui-redesign-plan.md`. Every page/route in the app, grouped. Tick `[x]` as redesigned. **Rule: back up a page's files before editing it, every time** (backups live in `.ui-backups/`).

**Design foundation** (shared by all pages):
- [x] Color tokens (navy + brass "merit" + paper) — `tailwind.config.js`
  - 2026-10-12: `paper` changed `#F6F8FB` → `#EEF2F7` (clearer soft off-white) and every solid `bg-white` surface across the redesigned pages + the shared `PublicLayout` backdrop wash swapped to `bg-paper`, so no page uses stark white anymore (navy/dark `bg-white/5../20` overlays kept). Backup: `.ui-backups/offwhite-2026-10-12/`.
  - 2026-10-12: segment-colour rhythm — the all-light inner pages (About, Courses, Faculty, Gallery, Notices) got a compact **navy (`bg-ink`) header band** (white title + brass eyebrow + dot-grid) so each page reads navy-header → off-white content → dark footer, matching Home's two-colour segment feel instead of one flat tone. (CourseDetail + Admission already have navy heroes; FacultyProfile still has a light header card — can match on request.) Backup: `.ui-backups/segment-colour-2026-10-12/`.
- [x] Fonts (Fraunces display + Tiro Bangla + Inter) — `index.html`
- [ ] Shared components still to modernize: **Navbar**, **Footer**, the 3 dashboard **Layouts** (sidebars)
  - 2026-10-12: **Footer** made mobile-compact (tighter padding/gaps, Quick Links in a 2-col grid on phones, long email/address wrap safely) — shared across all public pages; backup `.ui-backups/footer-mobile-2026-10-12/`.

**Totals:** Public 15 · Utility 3 · Admin 22 (+6 student-detail tabs) · Student 12 · Teacher 8 = **~60 pages**

---

## A. Public pages (15) — highest priority (first impression + conversion)
- [x] 1. **Home** — `/`  ✅ redesigned (navy split hero + logo card, stat strip, feature cards, success-stories & faculty conditional on data, navy closing CTA). 2026-10-12: re-verified against the premium reference spec; bg-pattern (PublicLayout crest watermark) confirmed preserved — Home sections are opaque navy/paper/white in both the original and the redesign, so the watermark stays intentionally covered on Home (unchanged). (A reduced-motion/MotionConfig tweak was added, then reverted at the user's request — Home is back to its pre-tweak state.)
- [x] 2. **About** — `/about`  ✅ redesigned (slim header + 3 stat cards + alternating text/photo editorial sections; no content card). ⏳ follow-up (deferred): make section photos dynamic / admin-managed per section
- [x] 3. **Courses** — `/courses`  ✅ redesigned (premium header + ink/brass system; modern course cards with hover lift + brass accent + ghost glyph; restyled search, filter chips, stat cards). 2026-10-12: made page root + header transparent so the shared PublicLayout crest watermark (the site background pattern) shows through again instead of being hidden by an opaque `bg-white`; added brass rule under the title.
- [ ] 4. **Course Detail** — `/course/:slug`  ⏳ redesigned 2026-10-12 (restrained navy hero w/ brass Enroll CTA + course visual; key-facts cards; About + What-you'll-learn; sticky enrollment card w/ fee/savings/seats + ShareButtons; related courses; navy closing CTA). Single vertical flow on mobile; transparent root preserves the PublicLayout crest watermark; all data/API/slug-handling/links preserved. Lint-clean (1 pre-existing deps warning); **awaiting on-device screenshot before ticking**.
- [ ] 5. **Faculty** — `/faculty`  ⏳ redesigned 2026-10-12 (compact header; white toolbar panel w/ full-width search + boxed category/department/subject filters + reset; premium bordered portrait cards now keyboard-accessible `<Link>`s w/ brass featured badge, missing-photo fallback + alt text; restyled skeleton/empty/load-more). Transparent root preserves the crest watermark; all search/filter/pagination/nav preserved; the pre-existing dead faculty modal left untouched. Lint 0 errors (3 pre-existing warnings); **awaiting on-device screenshot before ticking**.
- [ ] 6. **Faculty Profile** — `/faculty/:slug`  ⏳ redesigned 2026-10-12 (editorial profile: white header card w/ portrait + brass corner, name/designation/department, tappable phone/email/office, expertise chips; main column = biography, academic background, achievements, certifications, gallery; sidebar = at-a-glance, subjects, batches, connect/social). Added a "Back to faculty" link; replaced hardcoded grey/blue inline styles with ink/brass/paper + Fraunces + lucide icons; transparent root preserves the crest watermark; all data/fetch/meta/slug-redirect preserved. Lint 0 errors (1 pre-existing deps warning); **awaiting on-device screenshot**.
- [ ] 7. **Gallery** — `/gallery`  ⏳ redesigned 2026-10-12 (compact header; album cards → photo masonry → accessible lightbox; keyboard Esc/←/→ + swipe, 44px touch controls w/ aria-labels, role=dialog, alt text; added loading/empty/error states + retry). Album cards & photo tiles are now keyboard-operable `<button>`s; transparent root preserves the crest watermark; `/public/gallery` fetch, markViewed, scroll-lock all preserved. Shared by `/gallery` + `/student/gallery`. Lint 0 errors/0 warnings; **awaiting on-device screenshot**.
- [ ] 8. **Notices** — `/notices`  ⏳ redesigned 2026-10-12 (compact header; single-column notice cards w/ brass left-accent, metadata row = type badge + date, wrapping title/description, ShareButtons; urgent notices get a restrained red accent from the real `type` field; added loading skeleton + error/retry alongside the existing empty state). Transparent root preserves the crest watermark; `/public/notices` fetch + markViewed preserved; no search/filters/pagination/downloads exist in this page's data, so none were invented. Lint 0/0; **awaiting on-device screenshot**.
- [ ] 9. **Success Stories** — `/success-stories`
- [ ] 10. **Success Story Detail** — `/success-stories/:slug`
- [ ] 11. **Contact** — `/contact`
- [ ] 12. **Admission** — `/admission`  ⏳ redesigned (navy hero + 6 grouped section cards, accessible labels + htmlFor, native validation, pending/success/error states, mobile-first, reduced-motion, site bg-watermark preserved). Lint-clean; **awaiting your on-device screenshot before ticking** (can't render React in my sandbox).
- [ ] 13. **Login** — `/login`
- [ ] 14. **Set Password** — `/set-password`
- [ ] 15. **Library (public)** — `/library`

## B. Utility pages (3)
- [ ] 16. **Check Result** — `/check-result`
- [ ] 17. **Verify Credential Change** — `/verify-credential-change`
- [ ] 18. **Payment Result** — `/payment/success` · `/failed` · `/cancelled`

## C. Admin panel (22 + 6 tabs) — consistency + modern polish
- [ ] 19. **Admin Dashboard** — `/admin/dashboard`
- [ ] 20. **Admission Manager** — `/admin/admissions`
- [ ] 21. **Course Manager** — `/admin/courses`
- [ ] 22. **Staff / Faculty Manager** — `/admin/staff`
- [ ] 23. **Gallery Manager** — `/admin/gallery`
- [ ] 24. **E-Learning Manager** — `/admin/e-learning`
- [ ] 25. **Notice Manager** — `/admin/notices`
- [ ] 26. **Success Story Manager** — `/admin/success-stories`
- [ ] 27. **Exam Manager** — `/admin/exams`
- [ ] 28. **Attendance Manager** — `/admin/attendance`
- [ ] 29. **Leave Manager** — `/admin/leave-requests`
- [ ] 30. **Library Manager** — `/admin/library`
- [ ] 31. **Student Manager** — `/admin/students`
- [ ] 32. **Student Details** — `/admin/students/:id` (tabs: profile · academic-history · exam-results · attendance · payment-history · documents)
- [ ] 33. **Routine Manager** — `/admin/routine`
- [ ] 34. **Batch Manager** — `/admin/batches`
- [ ] 35. **Event Manager** — `/admin/events`
- [ ] 36. **Payment Manager** — `/admin/payments`
- [ ] 37. **Payment Settings** — `/admin/payment-settings`
- [ ] 38. **Site Settings** — `/admin/site-settings`
- [ ] 39. **Security Settings** — `/admin/security`
- [ ] 40. **Contact Messages** — `/admin/contact-messages`

## D. Student panel (12)
- [ ] 41. **Student Dashboard** — `/student/dashboard`
- [ ] 42. **Student Profile** — `/student/profile`
- [ ] 43. **Notifications** — `/student/notifications`
- [ ] 44. **Results** — `/student/results`
- [ ] 45. **Class Routine** — `/student/routine`
- [ ] 46. **Academic Calendar** — `/student/calendar`
- [ ] 47. **Attendance Report** — `/student/attendance-report`
- [ ] 48. **Tuition Fees** — `/student/fees`
- [ ] 49. **Extra Curricular** — `/student/extra-curricular`
- [ ] 50. **E-Learning** — `/student/e-learning`
- [ ] 51. **Assignments** — `/student/assignments`
- [ ] 52. **Assignment Results** — `/student/assignment-results`
  - (Student Library `/student/library` + Student Gallery `/student/gallery` reuse the public Library/Gallery pages above.)

## E. Teacher panel (8)
- [ ] 53. **Teacher Dashboard** — `/teacher/dashboard`
- [ ] 54. **Teacher Profile** — `/teacher/profile`
- [ ] 55. **Batches** — `/teacher/batches`
- [ ] 56. **Students** — `/teacher/students`
- [ ] 57. **Attendance** — `/teacher/attendance`
- [ ] 58. **Marks** — `/teacher/marks`
- [ ] 59. **Materials** — `/teacher/materials`
- [ ] 60. **Assignments** — `/teacher/assignments`

---

## Suggested order
Public (A) first → then Student panel (D) + Teacher (E) → Admin (C) consistency pass last. Within A: Courses, Faculty, Success Stories, Admission are the biggest wins after Home. Do shared Navbar/Footer/Layouts polish alongside the first few.

## How we work (per your rule)
1. You pick the next page (or say "follow the order").
2. I back up that page's file(s) → `.ui-backups/<page>-<date>/`.
3. I redesign it to match the premium/result-driven system, run lint, and you review a screenshot.
4. Keep or revert from the backup.
