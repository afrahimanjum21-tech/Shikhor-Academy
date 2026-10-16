# Uttoron Coaching Centre — UI Redesign Plan

**Direction:** Premium / result-driven (institutional, credible, achievement-forward).
**Goal:** make results the hero; convert parents + students through proof and clarity; mobile-first (most visitors are on phones).
**Stack:** React + Vite + Tailwind (evolve the existing system, don't rebuild from scratch).
**Legend:** priority `P0` (do first / highest impact) · `P1` · `P2`. Tick `[x]` as done.

---

## 0. Design foundations — build these FIRST (everything else uses them) · P0

- [ ] **0.1 Color tokens** (extend `tailwind.config.js`)
  - `ink` `#13293D` — deep navy for headlines/hero (premium weight)
  - `primary` `#1F4E79` — keep as the brand navy (buttons, links)
  - `brass` `#C8A14A` — merit/achievement accent; ONLY on results, toppers, key CTAs (the one bold element)
  - `paper` `#F6F8FB` — cool light background (NOT warm cream)
  - `slate` `#334155` body text · `muted` `#64748B`
  - Rule: gold is for *achievement*, never decoration. One accent, used sparingly.
- [ ] **0.2 Typography** (add real fonts — today it's only Inter, so Bangla looks like a generic fallback)
  - Bangla: **Anek Bangla** or **Hind Siliguri** (pick one) — load via Google Fonts
  - Headlines (Latin): one confident display — **Fraunces** (serif gravitas) or **Sora** (modern) 
  - Body (Latin): keep **Inter**
  - Define a type scale (e.g., 48/32/24/18/16/14) with intentional weights; no ALL-CAPS eyebrow labels
- [ ] **0.3 Spacing & layout scale** — one consistent section rhythm + container width; generous breathing room
- [ ] **0.4 Core components (reusable)**
  - [ ] Buttons: primary (navy), accent (brass), ghost — consistent sizes/radius, visible focus ring
  - [ ] Cards: a **hierarchy** system (featured / standard / compact) — stop using identical same-size/same-shadow cards everywhere
  - [ ] Inputs & forms: one style, clear labels, error state
  - [ ] Badge / stat / result pill (for GPA-5, pass %, "Topper")
  - [ ] Section header component (title + optional subtitle, no templated eyebrow)
  - [ ] Navbar + Footer refresh (sticky, clean, mobile drawer)
- [ ] **0.5 Motion & states**
  - [ ] One orchestrated hero load moment only (not fade-up on every section)
  - [ ] Loading / empty / error states with helpful copy in the interface voice

## 1. Public / marketing pages — first impressions + conversion · P0

- [ ] **1.1 Home** (biggest win)
  - [ ] Hero: lead with PROOF, not a generic banner — a confident line about Uttoron + real result metrics (this year's GPA-5 count, pass %, admissions) and/or topper faces
  - [ ] Signature **Results / Toppers** strip — real photos + achievement (the memorable, boldest section)
  - [ ] Featured courses preview (card hierarchy, clear "Apply / Details")
  - [ ] Faculty highlight (credibility) + a single strong admission CTA
  - [ ] Trim: remove any decorative-only sections that don't build trust
- [ ] **1.2 Success Stories / Results** (`SuccessStories`, `SuccessStoryDetail`) — make this a centerpiece, not a buried page: real student + achievement, filterable by year/exam
- [ ] **1.3 Courses + Course detail** (`Courses`, `CourseDetail`) — card hierarchy (featured bigger), each card: title · class/level · key info · fee · CTA; detail page = clear syllabus + outcome + apply
- [ ] **1.4 Faculty + profile** (`Faculty`, `FacultyProfile`) — credibility cards: photo, name, subject, qualification; clean profile layout
- [ ] **1.5 Admission** (`Admission`) — the conversion page: simple, inviting, mobile-friendly multi-step form; trust cues
- [ ] **1.6 Supporting public pages** — `About`, `Contact`, `Notices`, `Gallery`, `CheckResult`, `Library` (public), `ExtraCurricular` — apply the new system, consistent headers/cards
- [ ] **1.7 Auth** — `Login`, `SetPassword` — premium, calm, on-brand (already clean; align to tokens)

## 2. Student panel · P1
- [ ] `StudentDashboard` — clear at-a-glance: next class, dues, latest result, notices (result-forward)
- [ ] Results: `StudentResults`, `StudentExamResults`, `StudentAcademicHistory` — readable result tables/cards, GPA emphasis
- [ ] `StudentAttendance`, `ClassRoutine`, `AcademicCalendar` — clean schedule/attendance views
- [ ] Fees: `TuitionFees`, `StudentPaymentHistory` — clear due/paid status, pay CTA
- [ ] `StudentAssignments`, `StudentAssignmentResults`, `Library`, `ELearning`, `StudentProfile`, `StudentNotifications`

## 3. Teacher panel · P1
- [ ] `TeacherDashboard`, `TeacherAttendance`, `TeacherMarks`, `TeacherMaterials`, `TeacherAssignments`, `TeacherBatches`, `TeacherStudents`, `TeacherProfile` — function-first clarity, consistent tables/forms

## 4. Admin panel · P2 (consistency + polish pass, not re-invention)
- [ ] `AdminDashboard` — meaningful summary cards (students, dues, pending admissions, attendance)
- [ ] Managers (one consistent table + form + modal + delete-confirm pattern across all): `StudentManager`, `CourseManager`, `BatchManager`, `ExamManager`, `AttendanceManager`, `LeaveManager`, `RoutineManager`, `NoticeManager`, `GalleryManager`, `PaymentManager`, `FacultyManager`, `StaffManager`, `SuccessStoryManager`, `ContactMessages`, `ElearningManager`, `LibraryManager`, `EventManager`, `SiteSettings`, `PaymentSettings`, `SecuritySettings`

## 5. Cross-cutting — apply throughout (part of every page) 
- [ ] **Mobile-first**: every page excellent on a phone (nav drawer, cards stack, tap targets, result/fee tables scroll)
- [ ] **Accessibility**: visible keyboard focus, color contrast, `prefers-reduced-motion` respected
- [ ] **States**: consistent loading / empty / error everywhere, copy in the interface voice
- [ ] **Consistency audit**: one card system, one button system, one spacing scale — remove one-off styles

## What I need from you (to make it real, not a template)
- [ ] Real result data: this year's GPA-5 count, pass %, notable university admissions
- [ ] 4–8 toppers: name + photo + achievement (for Home + Results)
- [ ] Hi-res logo + any brand photos; confirm the Bangla font choice (Anek Bangla vs Hind Siliguri)
- [ ] Screenshots of current `Home`, `Courses`, `Faculty`, and one dashboard (so I redesign against the real thing)

## Suggested execution order
1. **Foundations (§0)** — tokens + fonts + core components.
2. **Home hero + Results (§1.1–1.2)** — highest impact; your first "wow".
3. Rest of public (§1.3–1.7).
4. Student panel (§2) → Teacher (§3) → Admin consistency (§4).
5. Mobile + a11y + states polish pass (§5) throughout.

> Approach: evolve the existing React/Tailwind — add tokens/fonts, build the shared components once, then reskin page by page. Ship + review page-by-page (screenshot each) rather than one big-bang change.
