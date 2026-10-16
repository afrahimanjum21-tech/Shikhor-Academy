# Uttoron Fix Tracker — audit 2026-10-10

Phase 0 (baseline + inventory). **No application code changed in this phase.** Maps 1:1 to `Uttoron-Full-Audit-Report.md` (§A–§I). Per-fix detail (root cause, files, tests, outcome) is filled in as each phase executes.

## Baseline (commands + exact outcomes)

| Check | Command | Result |
|---|---|---|
| Backend tests | `node --test --test-force-exit tests/{admin-students-pagination,faculty-concurrency,protected-file-access,teacher-marks-authorization}.test.mjs` (DATABASE_URL=dummy, model stubbed) | **22 pass / 0 fail** |
| Frontend unit test | `node --test frontend/src/services/responseUnwrap.test.mjs` | **9 pass / 0 fail** |
| Frontend lint | `npm run lint` (`eslint src`) | **exit 0 — 74 problems (0 errors, 74 warnings)**, all pre-existing (unused vars, react-hooks/exhaustive-deps). Not a regression. |
| Frontend build | `npm run build` (`vite build`) | **FAILS (exit 1)** — `MODULE_NOT_FOUND: @rollup/rollup-linux-x64-gnu`. ENVIRONMENT blocker: `node_modules` was installed on Windows; rollup's Linux native binary is absent in this sandbox. Not a code regression — builds on the user's Windows machine. Re-verify build locally. |
| Backend build | `npm run build` | no-op (`echo`) |
| Migrations | — | NOT run (no shared/prod DB touched, per rules) |

Test runner note: the repo has **no configured test script**; tests are standalone `node:test` files run by explicit path (`node --test tests/<file>` — not `node --test tests/`, which errors in this setup). No secrets were printed.

## Worktree-risk summary

- Branch `master`, HEAD `beea9c1`. **106 modified tracked + 41 untracked, 0 staged.** Everything is uncommitted on top of HEAD.
- Git cannot date individual uncommitted hunks, so changes can't be perfectly attributed. The **audit-fix + security-hardening work** (this and the prior SEC session) touched: the §A files below + `services/secretCrypto.js`, `models/PendingCredentialChange.js`, migrations `010`–`012`, `services/protectedFileAccess.js`, `services/responseUnwrap`(frontend), `backend/tests/*`, `scripts/*`. The **remaining** modified files (many public pages, controllers, SuccessStory feature, migrations `002`–`009`, email/sms services) are **earlier feature/WIP that predates this audit**.
- Risk controls: no `reset --hard`/`clean`/`checkout`/rebase will be run; nothing committed/pushed/deployed; scratch files (`tmp-*.mjs`, `smoke-harddel.mjs`) and the stray root `Start SpiderFoot.bat` are **flagged, not deleted** (see §F of the report).

## §A — Already FIXED (status: Fixed—verify regression only; DO NOT rewrite)

Markers verified present in the current tree + covered by the passing tests above.

| Item | Evidence (current code) | Regression test |
|---|---|---|
| Faculty public concurrency | `FacultyController.js` `buildListIncludes`/`buildDetailIncludes` present | faculty-concurrency (5) |
| Student pagination + api cache | `frontend/src/services/responseUnwrap.js` + `api.js applyUnwrap`; `AdminUserController` page/limit clamp | admin-students-pagination (6) + responseUnwrap (9) |
| Teacher marks Path A authz | `TeacherMarksController.js` `allowedSubjects` scoping | teacher-marks-authorization (5) |
| Content-access file authz | `services/protectedFileAccess.js` + `app.js decideMaterialAccess` | protected-file-access (6) |
| 6 admin listener leaks; Admission nationality+reset; MediaService empty catch | present in tree (grep-verified earlier) | no auto-test (UI/JSX; verify by review) |
| SEC-1..6; migration-001 showAllTables; SuccessStories prev; AdmissionService emergency map | present in tree | SEC unit tests (prior session) |

## §B — High (open)

| ID | Sev | Type | Finding | Status | Phase |
|---|---|---|---|---|---|
| B1 | High | BUG | Admission approval binds Student to any existing user by email + no transaction → orphan/lockout (`AdmissionService.js:188-213`) | Fixed—tests pass | 1 |
| B2 | High | BUG | Locked e-learning leaks playable `video_id` (`ElearningVideoController.js:112`) | Fixed—tests pass | 3 |
| B3 | High | BUG | Payment month stored in two formats → double-charge / "paid but due" (`SslCommerzController.js:167-174`, `PaymentController`) | Fixed—tests pass | 2 |
| B4 | High | BUG | Admin Leave Requests page always empty — `r.student.user` vs `r.Student.User` (`LeaveManager.jsx:88`) | Fixed—tests pass | 4 |

## §C — Medium (open)

| ID | Type | Finding | Status | Phase |
|---|---|---|---|---|
| C1 | NAI | Admin daily attendance sheet ignores `course_id`, lists all students (`AttendanceController.js:58-64`) | Fixed—tests pass | 4 |
| C2 | BUG | Teacher attendance written `course_id:null` → missing from admin sheet (`TeacherAttendanceController.js:149`) [= I-2] | Fixed—tests pass | 4 |
| C3 | BUG | Teacher attendance `session||null` defeats unique index → dup rows (`TeacherAttendanceController.js:151,167`) | Fixed—tests pass (service non-null; DB via migration 002) | 4 |
| C4 | BUG | Student `requestLeave` clobbers teacher-marked row (`AttendanceController.js:433-444`) | Fixed—tests pass | 4 |
| C5 | BUG | `resolveSession` noon split → punch-out "no punch-in" (`AttendanceController.js:24-28,534`) | Fixed—tests pass | 4 |
| C6 | NAI | Stale `pending` payments never reconciled → month locked (`SslCommerzController.js:241-255,407-411`) | Fixed—tests pass (Phase 2b: validate-before-reclaim — a stale pending is settled if the gateway confirms it was paid, released only if the gateway confirms NOT paid, kept if the gateway is unreachable; never a blind delete → double-charge-safe) | 2b |
| C7 | BUG | Manual payment create: no unique-index handling, no amount validation (`PaymentController.js:126-134`) | Fixed—tests pass | 2 |
| C8 | BUG | Public admission 500s on blank `course_id`/`dob` (`AdmissionController.js:33-43`) | Fixed—tests pass | 1 |
| C9 | NAI | Email never normalized → case-sensitive login, dup accounts (`AuthController.js:19` etc.) | Fixed—tests pass | 1 |
| C10 | BUG | Account creation not transactional → orphan User (`AdminUserController.js:194-214`) [overlaps B1] | Fixed—tests pass | 1 |
| C11 | BUG | `SiteSetting.email_enabled` can't be turned off — `Boolean('false')` (`SiteSettingController.js:81`) | Fixed—tests pass | 1b |
| C12 | NAI | Teacher assignment attachments served with no authz (`app.js` gate + `TeacherAssignmentController.js:78`) | Fixed—tests pass | 3 |
| C13 | BUG | `RoutineController` 500 on undefined `batch_id` in count where (`:36-37`, `saveAll`) | Fixed—tests pass (conditional where; shift guard in saveAll) | 7 |
| C14 | BUG | `generateStudentId` MAX+1 race → dup id 500 (`AdmissionService.js:17-33`) | Fixed—tests pass | 1 |
| C15 | BUG | Public `/api` edge-caches per-viewer material URLs 60s (`app.js:212-218` + `ResourceController`) | Fixed—tests pass (in-app headers; confirm CDN honors private) | 3 |
| C16 | BUG | PaymentSettings bank name blank — `settlement_bank_name` vs `settlement_bank` (`PaymentSettings.jsx:148`) | Fixed—verification incomplete (frontend; eslint clean, build env-blocked) | 5b |
| C17 | BUG | StudentManager client name-only filter hides email/phone/id matches (`StudentManager.jsx:146`) | Fixed—verification incomplete (frontend; server search already existed) | 5b |
| C18 | BUG | Add Student discards `temp_password` + password not required (`StudentManager.jsx:133`) | Fixed—verification incomplete (frontend shows one-time credential) | 5b |
| C19 | NAI | Admin course dropdowns cap at 12 + hide inactive (use `/public/courses`) (`ExamManager`/`AttendanceManager`/`BatchManager`/`RoutineManager`) | Fixed—verification incomplete (now `/admin/courses`) | 5b |
| C20 | BUG | Category reorder no-op (`CourseManager.jsx:512-542`) [= I-9] | Fixed—verification incomplete (frontend swaps elements; backend reorder OK) | 5b |
| C21 | BUG | Panel ErrorBoundary no `key` → stuck fallback (`AdminLayout`/`StudentLayout`/`TeacherLayout`) | Fixed—verification incomplete (route key added) | 5b |
| C22 | BUG | E-learning/Gallery lightbox scroll-lock leak (`ELearning.jsx:56,79`, `Gallery.jsx:34`) | Fixed—verification incomplete (overflow restored on unmount) | 5b |
| C23 | NAI | `is_locked` toggle does nothing (gating only via `access_type`) | Fixed—tests pass | 5b |
| C24 | SMELL/sec | Rate limiters in-memory → ineffective on Vercel serverless | Blocked—decision needed (centralized + warn; no shared store configured) | 3/DQ |
| C25 | SMELL/sec | JWT via `?token=` query → leakage [= H-sec4] | Fixed—verification incomplete (signed tokens; frontend not run) | 3 |

## §D — Low / code-smell (open; IDs assigned for tracking)

| ID | Type | Finding | Status | Phase |
|---|---|---|---|---|
| D1 | SMELL | Grade source-of-truth mismatch (admin/teacher/student recompute differ) | Fixed—tests pass | 5 |
| D2 | BUG | `ExamController.storeMarks` no transaction + no student-in-course check (`:112-133`) | Fixed—tests pass | 5 |
| D3 | BUG | `gradeSubmission` `marks_obtained` not validated (`TeacherAssignmentController.js:241,259`) | Fixed—tests pass | 5 |
| D4 | NAI | No `due_date` enforcement on submissions (`StudentAssignmentController.js:67-109`) | Fixed—tests pass (lateness recorded; late still accepted) | 5 |
| D5 | BUG | Routine `start_time`/`end_time` never set → unique index inert + unordered (`RoutineController`, `Routine.js:33`) [= I-22] | Fixed—tests pass (derived from time_slot via parseTimeSlot; store/saveAll/update + migration 015 prepared) | 7 |
| D6 | SMELL | `RoutineController.store` mass-assigns raw `req.body` (`:85`) | Fixed—tests pass (explicit ROUTINE_WRITABLE allowlist in store+update) | 7 |
| D7 | SMELL | `NotificationService` awaits SMS/email in request path → payment redirect delay | Fixed—tests pass (Phase 2b: the user-facing success redirect + initiate reconcile bound the slow SMS/email dispatch with a timeout; the critical in-app notification + the server-to-server IPN path still deliver reliably) | 2b |
| D8 | SMELL | SMS config static from env; creds in URL; 160-char truncation wrong for Bangla (`SmsService.js`) | Fixed—tests pass (per-call config; URL never logged + documented; encoding-aware grapheme-safe truncation; stripEmojis Bangla-safe) | 7 |
| D9 | SMELL | `EmailService.composeEmail` no HTML escaping + stray `sendToRaw` alias (`:99-111,257`) | Fixed—tests pass (escapeHtml + safeActionUrl; dead sendToRaw alias removed) | 7 |
| D10 | BUG | Leave notifications deep-link to nonexistent `/student/attendance` (`AttendanceController.js:273,310,348`) | Fixed (→ `/student/attendance-report`, route verified) | 7 |
| D11 | BUG | Unguarded admin deletes swallow rejections, no toast (Payment/Notice/Event/SuccessStory/Library managers) | Fixed—verification incomplete (try/catch + notify on all 5) | 5b |
| D12 | NAI | Load failures render as empty (no error UI) across many pages | Partially fixed (StudentResults + Admission course-load: error+retry; broader sweep recommended) | 5b |
| D13 | BUG | Public "DASHBOARD" button hardcodes `/admin/dashboard` for all roles (`Navbar.jsx:122,226`) | Fixed—verification incomplete (routes by role; safe fallback) | 5b |
| D14 | BUG | `CourseController.store` no title check → `makeSlug(undefined)` 500 (`:39`) | Fixed—tests pass (400 on missing title) | 7 |
| D15 | SMELL | `Public/CourseController.show` `findByPk(id,{where})` ignored (latent, unrouted) (`:125`) | Fixed—tests pass (findOne scoped to is_active) | 7 |
| D16 | BUG | SuccessStory duplicate guard trims query but stores untrimmed (`:88` vs `:109`) | Fixed (trim once for check + persist) | 7 |
| D17 | SMELL | `Faculty.jsx` dead details-modal code | Won't change—documented (superseded by `/faculty/:slug` detail page; left in place, flagged in code) | 5b |
| D18 | SMELL | `app.js:65` boot catch swallows → `/api` 503 path dead code | Fixed (dbReady flag; 503 branch truthful) | 7 |
| D19 | SMELL | `config/auth.js:29` cookie maxAge hardcoded 30d vs `JWT_EXPIRES_IN` | Fixed—tests pass (maxAge derived from JWT_EXPIRES_IN) | 7 |
| D20 | SMELL | ~18 admin controllers return 500 WITHOUT logging (3 log nothing: ContactMessage/CourseCategory/PaymentSetting) | Fixed (logging added to the 3 silent controllers; correlation-ID middleware = future) | 7 |
| D21 | NAI | API response-shape inconsistencies (SiteSettings, PaymentSettings GET/UPDATE, Routine create, course-categories) | Fixed—tests pass (contract pinned by tests; shapes documented, not rewritten — callers handle them) | 5b |

## §H — Second-pass (open)

| ID | Sev | Type | Finding | Status | Phase |
|---|---|---|---|---|---|
| H-sec1 | Med | BUG | Teacher `getStudentsForExam` leaks sibling-batch student PII (`TeacherMarksController.js:58-62`) | Fixed—tests pass | 3 |
| H-del1 | Med | BUG | `TeacherController.destroy` orphans teacher's Assignment/StudyMaterial/Routine/Attendance rows (`:210-232`) | Fixed—tests pass (blocks when authored content exists; else atomic delete + nulls metadata) | 6 |
| H-del2 | Med | BUG | Batch/Course delete never removes `AssignmentSubmission` (`BatchController:112-131`, `CourseController:179-197`) | Fixed—tests pass (blocks when submissions/marks exist; never destroys student work) | 6 |
| H-del3 | Med | BUG | Multi-table deletes without a transaction (Batch/Course/Teacher controllers) | Fixed—tests pass (all wrapped in `sequelize.transaction`) | 6 |
| H-sec2 | Med | BUG | Encrypted secret overflows `VARCHAR(255)` → save/migration fails (`SiteSetting`/`PaymentSetting`; should be TEXT) | Fixed—tests pass (migration 013 created, NOT run) | 1b |
| H-sec3 | Med | SMELL | No security headers (helmet/nosniff/Referrer-Policy/X-Frame) | Fixed—tests pass (in-app middleware; frontend-HTML CSP still deploy-side) | 3 |
| H-sec4 | Med | BUG | 30-day JWT in `?token=` on `/uploads/students` links [= C25] | Fixed—verification incomplete (= C25) | 3 |
| H-cfg1 | Med | VERIFY | `vercel.json` non-standard schema (`services` + object rewrites) — confirm prod routing | Blocked—decision needed (evidence: separate projects likely govern prod; no speculative change) | 3/DQ |
| H-low1 | Low | SMELL | Attendance `batch_id`/`course_id` not FKs; NULL-batch defeats unique index (`Attendance.js:26-33`) | Fixed—migration 002 repairs (verified, not re-run) + non-null writers | 4 |
| H-low2 | Low | BUG | `007-success-story-slugs` backfill can collide with existing slugs → migration abort | Fixed—tests pass (dedupe vs existing DB slugs + same-run; rerun-safe) | 6 |
| H-low3 | Low | BUG | Payment date/month use UTC/server-local not Asia/Dhaka (`PaymentController.js:17-19,133`) | Fixed—tests pass | 2 |
| H-low4 | Low | SMELL | Upload MIME/ext regex unanchored; txt/csv no magic-byte check (`middleware/upload.js:40-49`) | Fixed—tests pass (anchored ext+mime allowlists; txt/csv ext-only documented) | 7 |
| H-low5 | Low | SMELL | `PaymentController.index` LIKE `%${q}%` not escaped | Fixed (escape %/_/\ ; still parameterized) | 7 |
| H-low6 | Low | SMELL | JWT also in `localStorage` (XSS-stealable) [relates to C25] | Blocked—decision needed (= J; plan documented) | 3/DQ |
| H-low7 | Low | SMELL | `sw.js` STATIC_CACHE never versioned; `addAll` atomic (`public/sw.js:5,24`) | Fixed (v2 + bump note; per-asset allSettled install; API never cached) | 7 |
| H-low8 | Low | SMELL | `generate-ico.cjs` broken (jimp missing) [= E6] | Reviewed—dead code, documented; deletion deferred to E6 (approval) | 7/DQ |
| H-low9 | Low | SMELL | Sitemap base URL hardcoded + CSP `connect-src 'self'` assume same-origin API | Fixed (sitemap base from SITE_URL/FRONTEND_URL); CSP connect-src = deploy-side, documented w/ H-cfg1 | 7 |
| H-low10 | Low | BUG | Restricted StudyMaterial with image extension bypasses the material gate (edge) | Fixed—tests pass | 3 |
| H-low11 | Low | SMELL | No CSRF token (mitigated by SameSite=Lax + POST/PUT/DELETE only) | Blocked—decision needed (= J; plan documented) | 3/DQ |

## §I — Third-pass (open)

| ID | Sev | Type | Finding | Status | Phase |
|---|---|---|---|---|---|
| I-1 | High | BUG | Saving any site setting overwrites homepage `hero_title`/`subtitle` with default — `home_hero_*` vs `hero_*` (`SiteSettings.jsx:20-21,84-89` ↔ `SiteSettingController.js:51,53`) | Fixed—tests pass | 1 |
| I-2 | Med | BUG | = C2 (teacher attendance `course_id:null`) | Fixed—tests pass | 4 |
| I-3 | Med | BUG | Admin exam view shows raw (un-enriched) grade/gpa/position (`PaymentController.studentExamResults:265-279`) | Fixed—tests pass | 5 |
| I-4 | Med | BUG | `position` never persisted on teacher marks path (`ExamResultService.js:66,119` / `TeacherResultController`) | Fixed—tests pass | 5 |
| I-5 | Med | BUG | Record-Payment modal lists only first 20 students (`PaymentManager.jsx:64-65` ↔ `/admin/students`) | Deferred → Phase 2b (frontend; no React test harness) | 2 |
| I-6 | Med | BUG | Payment confirmation shows one month's fee for multi-month (`PaymentResult.jsx:58-59` ↔ `SslCommerzController:525-530`) | Deferred → Phase 2b (frontend; no React test harness) | 2 |
| I-7 | Med | BUG | Routine publish/unpublish return no `status` → Draft badge persists (`RoutineManager.jsx:366,381` ↔ `RoutineController:205,225`) | Fixed—tests pass (API returns status; UI already consumes it) | 5b |
| I-8 | Med | BUG | Admin "Student Count" override ignored on Home (`StatsSection.jsx:107-111`) | Fixed—verification incomplete (frontend; matches About mapping) | 5b |
| I-9 | Med | BUG | = C20 (category reorder no-op) | Fixed—verification incomplete (= C20) | 5b |
| I-10 | Med | BUG | Stale paginated api.js cache — `invalidateCache` misses `?page=` keys (`api.js:116-118`) | Fixed—tests pass | 5b |
| I-11 | Med | BUG | StudentDashboard total-due formula ≠ fees page (`DashboardController.js:79-81`) | Fixed—tests pass | 2 |
| I-12 | Med | BUG | Null `exam.total_marks` → TeacherResult stores grade F/GPA 0 for all (`TeacherResultController.js:237,254`) | Fixed—tests pass | 5 |
| I-13 | Low | BUG | Two teacher paths differ on fallback denominator (`||100` vs `||0`) | Fixed—tests pass | 5 |
| I-14 | Low | BUG | `TeacherMarksController.saveMarks` stores marks with no clamp/validation (follow-up to session fix, `:150-151`) | Fixed—tests pass (both paths reject out-of-range) | 5 |
| I-15 | Low | BUG | Pass/fail fallback compares absolute marks to 33 as % (`PaymentController.js:277`) | Fixed—tests pass | 5 |
| I-16 | Low | BUG | Course edit form can't clear optional fields (drops `''`) (`CourseManager.jsx:93-97`) | Fixed—tests pass (backend '' → null; frontend sends cleared fields on edit) | 5b |
| I-17 | Low | BUG | Teacher `status:'leave'` not rendered/counted in admin (`AttendanceManager:260-270`, `AttendanceController:393-395`) | Fixed—tests pass | 4 |
| I-18 | Low | BUG | `/student/results` returns unpublished subject marks; summary counts them (`ExamController.myResults:228-239`) | Fixed—tests pass | 5 |
| I-19 | Low | SMELL | `studentStats` denominator counts pending/rejected leave; doesn't reconcile (`AttendanceController:388-397`) | Fixed—tests pass | 4 |
| I-20 | Low | SMELL | `buildMonthlyBreakdown` `amount||monthlyFee` overwrites ৳0 waiver (`PaymentController.js:42`) | Fixed—tests pass | 2 |
| I-21 | Low | SMELL | Seeders hardcode `category_id:1/4` (`seeders/run.js:66,78`) | Fixed (resolve category by slug; safe on non-pristine DB + reruns) | 6 |
| I-22 | Low | BUG | = D5 (routine unique index inert) | Fixed—tests pass (= D5) | 7 |
| I-dead | Low | NAI | Dead/unused fields: hero_bg_image branch, linkedin/whatsapp, gallery caption/thumbnail, dashboard dup keys, course.category/sorting_order, payment camelCase dupes, ContactMessages search/show | Reviewed—documented (Phase 7 item 24: confirmed dead/duplicate; NOT deleted — some touch public API/data shape; deletion deferred to E6, needs approval) | 7/DQ |

## §E / Decision queue (needs user decision or deployment-dependent — do NOT decide silently)

| ID | Decision needed | Status |
|---|---|---|
| E1 | TeacherProfile vs Faculty duplication. Safe sub-fix available now: stop `FacultyManagementController.destroy` hard-deleting the teacher User/profile. Full merge = deferred. | Safety sub-fix DONE (Faculty-card delete no longer touches the teacher account — tests pass). Full merge still deferred (see decision doc below). |
| E2 | Faculty JSON vs 4 orphaned child tables + dead gallery write path. Keep JSON (authoritative)? drop dead tables? (migration) | APPROVED + DONE (Phase 9): 4 orphan models/tables (Qualification/Achievement/Certification/SocialLink) retired — models deleted, index.js + dead destroy() calls cleaned, migration 017 prepared (NOT run; run on a backed-up DB AFTER deploying code). FacultyGallery kept (still read). |
| E3 | Two marks systems: retire legacy `/teacher/exams*` + unify grade source-of-truth? | Grade source-of-truth UNIFIED (all paths use ExamResultService). Legacy routes KEPT + tested; retire = separate recommendation below (needs approval) |
| E4 | Exam unpublish doesn't clear `published_subjects`. Safe fix exists; confirm intended publish semantics. | Fixed—tests pass (unpublish clears `published_subjects`; marks preserved) |
| E5 | SEC-3: plaintext generated student password emailed on approval (policy). | APPROVED + DONE (Phase 9): approval now emails a one-time, 48h, single-use SETUP LINK (token bound to the account's password hash → self-invalidating); no plaintext password sent. Backend tested; `/set-password` page added (on-device/browser verify pending). |
| E6 | Delete confirmed-unused files (NotificationDot.jsx, App.css, generate-ico.cjs)? User KEEPS notification code (NotificationBadge/Bell/Dropdown). | APPROVED + DONE (Phase 9): the 3 zero-reference files deleted (lint still 0 errors). Live notification components untouched. |
| C24 | Shared rate-limit store (needs an infra choice: Postgres table / Upstash / Redis). | APPROVED + DONE (Phase 9): custom Postgres-backed express-rate-limit store (no new dependency/vendor — reuses Neon) on login/admission/contact/set-password; opt-in `RATE_LIMIT_STORE=postgres`; migration 016 prepared (NOT run); fail-open + tested. Global limiter stays in-memory by design. |
| C25 / H-sec4 / H-low6 | JWT-in-URL + localStorage: move to short-lived signed download tokens? (design + possibly cookie-only) | C25/H-sec4 IMPLEMENTED (Phase 3: signed download tokens; backend tested, frontend on-device check pending). H-low6 (localStorage JWT) + CSRF now DONE as item J (Phase 9): cookie-only auth + double-submit CSRF (backend tested; frontend on-device verify pending). |
| H-sec3 | Add security headers (helmet) — safe to implement; confirm no CSP conflict with current CDN/inline usage. | Fixed—tests pass (Phase 3: in-app `securityHeaders` middleware; no helmet dep). Browser-facing HTML CSP stays deploy-side (see H-cfg1). |
| H-cfg1 | Verify `vercel.json` governs prod routing (AGENTS.md confirms the "services" framework is intentional) — needs your deployment confirmation. | RESOLVED as SAME-ORIGIN (Phase 9) from repo evidence: `vercel.json` routes `/api/*`→backend under one domain; frontend default base is relative `/api`; CSP `connect-src 'self'`. Cookie-only+CSRF finalized on that basis. ⚠️ If prod sets `VITE_API_URL` cross-origin, SameSite/CORS/CSP must be revisited. |
| D8 | SMS provider behavior (static env config; Bangla truncation) — provider/product decision. | Fixed—tests pass (Phase 7: per-call config, Bangla-safe encoding, URL redaction). Provider upgrade to SMS Plus v3 = optional product decision. |

## Phase ordering (fix phases; execute one at a time, only when prompted)

1. **Phase 1 — Admission + account integrity:** B1, C8, C9, C10, C14, I-1.
2. **Phase 2 — Payments:** B3, C6, C7, C16, I-5, I-6, I-11, I-20, H-low3, D7.
3. **Phase 3 — Content-access:** B2, C12, C15, C23, H-low10.
4. **Phase 4 — Attendance + results correctness:** B4, C1–C5, H-sec1, H-low1, D1, D2, D10, I-3, I-4, I-12, I-13, I-14, I-15, I-17, I-18, I-19.
5. **Phase 5 — Admin/UI correctness + hygiene:** C11, C13, C17–C22, D3–D6, D9, D11–D21, H-low5, H-low7, H-low9, I-7, I-8, I-9/C20, I-10, I-16, I-22, I-dead.
6. **Phase 6 — Delete-cascades + schema safety (migrations):** H-del1, H-del2, H-del3, H-sec2, H-low2, H-low4, I-21.
7. **Decision queue (DQ):** E1–E6, C24, C25, H-sec3, H-cfg1, D8 — await decisions.

## New findings (added during fix phases)

_Template: `NEW-00x | sev | type | finding | repro evidence | fixed/deferred | phase`._

- **NEW-001** | Low/Med | SEC | `AdmissionManagerController.approve` returned the raw Sequelize `User` instance, serializing the bcrypt `password` hash + `token_version` to the admin client | found while implementing E5 (same flow) | **Fixed—tests pass** (sanitized via `toSafeApprovedUser`; `set-password.test.mjs`) | 9

## Notes / ID location

- All audit IDs (B1–B4, C1–C25, D1–D21, E1–E7, H-*, I-*) were located and mapped; **none missing**. §D/§H-low/§I-dead had no per-item IDs in the report — IDs assigned here (prefixed D/H-low/I-dead) and cross-referenced.
- Dedups recorded: C2=I-2, C20=I-9, C25=H-sec4, D5=I-22, E6=H-low8, E7 folds into C24/C25.
- Open-ID count tracked: **4 High, ~25 Medium, ~40 Low/smell, + 11 decision-queue** ≈ **80 actionable + 11 decisions** (dedups counted once).
- This phase verified only §A regressions (markers + passing tests). Open items were NOT individually re-traced here; each will be re-verified against current code at the start of its fix phase (Master Prompt rule 4) before any edit.

---

## Phase 1 — execution (in progress, 2026-10-10)

Scope: B1, C8, C9, C10, C14, I-1. All six verified OPEN against current code (file:line reads done).

Plan:
- **Shared helpers (new):** `backend/utils/normalizeEmail.js` (trim+lowercase); `backend/services/studentId.js` (`nextStudentId`, `isStudentIdConflict`, `withStudentIdRetry`).
- **B1/C10/C14** `AdmissionService.approveAdmission`: wrap user+student+admission writes in one `sequelize.transaction` with a row lock on the admission; never bind a Student to a non-student account (409); restore a soft-deleted student account; generate the student id inside the tx with `withStudentIdRetry`; make the post-commit approval email non-fatal (idempotent re-approve). `AdminUserController.store`: wrap User+Student create in a transaction + `withStudentIdRetry`.
- **C8** `Public/AdmissionController.submit`: coerce blank `course_id`/`dob` to null, 400 on a non-numeric course_id.
- **C9** normalize email on write (admin create/update, admission submit, approval) + case-insensitive login lookup (`lower(email)`); CredentialChange already lowercases. No DB migration/uniqueness change this phase (deferred — needs prod data inspection).
- **I-1** `SiteSettingController` show + update responses alias `home_hero_title/subtitle` ← `hero_title/subtitle` so the admin form loads the real value and unrelated saves stop overwriting it with the default.
- Tests: `studentId`, `admission-approval`, `admission-submit` sanitize, `normalizeEmail`, `site-settings-hero`, login case-insensitivity (node:test, model-stubbed, no DB/mail/network).

### Phase 1 — results (complete; tests pass)

B1, C8, C9, C10, C14, I-1 → **Fixed—tests pass**. (C9: code paths fixed; a case-insensitive UNIQUE constraint is **deferred as a decision** — needs prod-data inspection, no migration run this phase.)

Root causes + fixes:
- **B1 / C10 / C14** — `AdmissionService.approveAdmission` and `AdminUserController.store` were non-transactional and the student id used an unsafe MAX+1 read-then-write; approval also reused any email match. Now: a single `sequelize.transaction` (admission row-locked) covers user+student+admission; an existing **non-student** email → 409 (never bound); a **soft-deleted student** is restored and re-credentialed; account creation is atomic (no orphan User); the id is generated inside the tx via `withStudentIdRetry`+`nextStudentId` (bounded retry on a unique collision; an admin-supplied id is never silently changed); the post-commit approval email is best-effort (idempotent re-approve, no misleading 500).
- **C8** — `Public/AdmissionController.submit` coerces blank `course_id`/`dob` to null and 400s a non-numeric course id (was a Postgres 500) via the exported `prepareAdmissionFields`.
- **C9** — new `utils/normalizeEmail.js`; emails normalized on admin create/update, admission submit, and approval; login matches case-insensitively (`lower(email)`); CredentialChange already lowercased.
- **I-1** — `SiteSettingController` show + update responses alias `home_hero_title/subtitle` ← stored `hero_title/subtitle`, so the admin form loads the real value and an unrelated save no longer overwrites the homepage hero with the default.

Files changed: `backend/services/AdmissionService.js`, `backend/controllers/Public/AdmissionController.js`, `backend/controllers/Auth/AuthController.js`, `backend/controllers/Admin/AdminUserController.js`, `backend/controllers/Admin/SiteSettingController.js`. New: `backend/utils/normalizeEmail.js`, `backend/services/studentId.js`, tests `backend/tests/{student-id,admission-fields,admission-approval,site-settings-hero}.test.mjs`. Migrations added: **none**.

Tests/commands + outcomes: `node --check` clean on all edited files; backend `node --test` **40 pass / 0 fail** (was 22; +18 new, all §A regressions still green); frontend `node --test responseUnwrap` **9/9**; frontend build still blocked by the Windows-rollup env issue (unchanged, pre-existing). No migration run; no commit/push/deploy.

New findings this phase: none genuinely new. The teacher-marks clamp (I-14, already tracked) stays scheduled for Phase 4. `git diff --stat` on these controllers also reflects pre-existing uncommitted WIP — only the edits described above were made this phase.

Remaining risks: C9 case-insensitive login relies on an in-SQL `lower()` match (no functional index yet) and a case-insensitive UNIQUE constraint is still deferred (documented decision); approval/account flows verified by model-stubbed unit tests, not a live DB run.

### Phase 1b — admission/account/site-setting integrity (extended): C11, H-sec2, C9 hardening

Verified carried from Phase 1 (no re-implementation): B1, C8, C9(base), C10, C14, I-1 — Fixed—tests pass (regression tests green).

New this run:
- **C11** — `SiteSettingController.update` used `Boolean(email_enabled)` so the string `'false'` became `true`. New `backend/utils/parseBool.js` (true/'true'/1/'1' only); `email_enabled` now parsed strictly.
- **H-sec2** — inspected: `SiteSetting.smtp_password`=STRING, `SiteSetting.email_api_key`=STRING(255), `PaymentSetting.store_password`=STRING; the `enc:v1:` envelope can exceed 255. Models changed to `TEXT`; forward migration `013-widen-secret-columns.mjs` (`changeColumn` → TEXT, guarded + idempotent, down() disabled to avoid truncation). NOT run against any DB. secretCrypto read/write conventions unchanged (plaintext/legacy + enc:v1: still transparent). No secret decrypted/logged.
- **C9 hardening** — inspected `User.email` (unique:true, case-sensitive index). Added case-variant collision reporting: `AdminUserController.store`/`update` return 409 (not 500) when the normalized email already belongs to another account; login now tries exact match first, then a `lower(email)` fallback (so existing exact-case + mixed-case both sign in, dupes resolved deterministically, never merged). No citext/functional-unique migration (deferred decision — needs prod data inspection).

E5 note (unchanged): the generated-password-emailed-on-approval policy is intentionally deferred; B1's restore/re-approve path reuses that EXISTING delivery policy (generates + emails a password for a new/restored account) — it does not introduce a new mechanism.

### Phase 1b — results (complete; tests pass)

C11, H-sec2 → **Fixed—tests pass**. C9 **hardened** (login exact→`lower()` fallback; 409 case-variant collision reporting at admin create/update). B1/C8/C9/C10/C14/I-1 regression-verified (all green).

Files changed: `models/SiteSetting.js` (`smtp_password`, `email_api_key` → TEXT), `models/PaymentSetting.js` (`store_password` → TEXT), `controllers/Admin/SiteSettingController.js` (`parseBool` for `email_enabled`), `controllers/Auth/AuthController.js` (two-step case-insensitive login), `controllers/Admin/AdminUserController.js` (`fn/col/where` import; 409 collision pre-check in `store` + unique-error → 409 in catch; 409 clash check in `update`). New: `utils/parseBool.js`, `migrations/013-widen-secret-columns.mjs`, tests `parse-bool`, `secret-columns`, `site-settings-email`, `auth-login`, `admin-user-collision`.

Migration added (NOT run against any DB): `013-widen-secret-columns.mjs` — `changeColumn('SiteSettings','smtp_password'/'email_api_key')` + `('PaymentSettings','store_password')` → TEXT; table/column-guarded, idempotent, `down()` disabled (narrowing could truncate encrypted secrets). secretCrypto conventions unchanged.

Tests/commands: `node --check` clean on all edited/new files; backend `node --test` **51 pass / 0 fail** (40 prior + 11 new); frontend **9/9**; frontend build still env-blocked (Windows rollup; unchanged). No migration run; no commit/push/deploy.

Deferred decisions (documented, not decided): a case-insensitive UNIQUE email constraint (citext / functional unique index) — needs prod-data inspection for existing case-variant duplicates; E5 generated-password delivery policy unchanged.

New findings this run: none.

---

## Phase 2 — execution (complete; 2026-10-10)

Scope (per instruction): B3, C6, C7, §H payment date (H-low3), I-5, I-6, I-11, I-20, §D (notification/redirect), D7. Each verified against current code before editing.

Delivered this pass — backend money-correctness, fully unit-tested: **B3, C7, I-11, I-20, H-low3, §D** date helper.

Sequenced to **Phase 2b** (documented, not silently dropped):
- **C6** (stale-pending reconciliation) and **D7 + §I** (notification/redirect serverless timing) → gateway-interaction pass. Both need a server-to-server gateway `validate` and serverless-timing design that can't be unit-verified without a mocked gateway, and a naive "delete the stale pending row and re-charge" would risk a **double charge** if a lost callback later validates — forbidden by the Master Prompt. Sequenced, with the validate-before-reclaim design noted.
- **C16, I-5, I-6** → frontend pass; no React test harness in the repo, so these are verified on-device.

### Root causes + fixes (delivered)

- **B3** (the money bug) — payments were written as `YYYY-MM` by the gateway path and `Mon YYYY` by the manual path, so one real month existed under two keys: a month paid online still showed "due", and a second charge for it bypassed the `(student_id, month)` unique index → double charge. New pure service `services/paymentMonth.js` defines ONE canonical key `Mon YYYY` (fixed ABBR table, not locale/`toLocaleString`-dependent) and `canonicalMonthKey()` that folds `YYYY-MM`, `Mon YYYY`, `Month YYYY`, `YYYY-MM-DD` to it (invalid/out-of-range → null). Every write/read path now canonicalizes: manual `PaymentController.store`, gateway `initiate` (`months.map(canonicalMonthKey)`), and the fee breakdown. Legacy `YYYY-MM` rows already stored are matched correctly by read-time canonicalization, so the display is fixed with no data change required; migration 014 is the optional backfill.
- **C7** — manual `PaymentController.store` had no amount validation and let a duplicate-month insert surface as a 500. Now: `student_id` required (400); amount must be finite and ≥ 0 (400; a `৳0` waiver is allowed); 404 if the student doesn't exist; month canonicalized (invalid → 400); a `(student_id, month)` unique violation is mapped to **409** (not 500); `date` defaults to `todayDhaka()`.
- **I-11** — the student dashboard computed total-due with its own `months*fee − paid` formula that could disagree with the fees page. It now calls the SAME `summarizeFees(student, payments, monthlyFee)` the fees page uses, so the two can never diverge.
- **I-20** — `buildMonthlyBreakdown` used `amount || monthlyFee`, so a genuine `৳0` waiver (a paid row recorded as 0) was overwritten with the full fee. The paid amount is now `payment ? parseFloat(payment.amount) : monthlyFee` — a 0 waiver is preserved while an *unpaid* month still defaults to the fee.
- **H-low3 / §D** — payment `date` on the manual path and both gateway terminal paths (`success`, `ipn`) used server-local/UTC `new Date()`, which lands on the wrong calendar day near midnight in Bangladesh. New `todayDhaka()` returns `YYYY-MM-DD` in `Asia/Dhaka` via `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' })`; all three paths use it.

### Shared services (new, pure — single source of truth)

- `services/paymentMonth.js` — `canonicalMonthKey`, `displayMonth`, `isValidMonthInput`, `todayDhaka`.
- `services/feeBreakdown.js` — `buildMonthlyBreakdown` + `summarizeFees` → `{ monthlyBreakdown, paidMonths, dueMonths, totalPaid, totalDue, pendingPayments }`; now the ONLY fee math, shared by the fees page, the manual-payment controller, and the dashboard.

### Migration (created, NOT run against any DB)

- `migrations/014-canonicalize-payment-months.mjs` — backfills `Payments.month` to the canonical key. Before changing any row it detects same-student rows whose different stored strings canonicalize to the SAME real month (a cross-format duplicate) and **ABORTS** rather than merging or deleting — a human must resolve a real duplicate. Idempotent; `down()` disabled (canonicalization isn't losslessly reversible).

### Files changed

Backend: `controllers/Admin/PaymentController.js` (store rewrite + `summarizeFees`/`canonicalMonthKey`/`todayDhaka`; removed the local `monthKey`/`buildMonthlyBreakdown`), `controllers/Student/DashboardController.js` (I-11 → `summarizeFees`), `controllers/Student/SslCommerzController.js` (`isValidMonthInput`; `canonicalMonthKey` on initiate months; `todayDhaka` on success + ipn). New: `services/paymentMonth.js`, `services/feeBreakdown.js`, `migrations/014-canonicalize-payment-months.mjs`, tests `tests/{payment-month,fee-breakdown,payment-store}.test.mjs`.

### Tests / commands + outcomes

- `node --check` clean on all six edited/created backend files.
- New Phase 2 tests: `payment-month` (5) + `fee-breakdown` (3) + `payment-store` (5) = **13 pass / 0 fail** (model-stubbed; `NotificationService.create` stubbed; dummy `DATABASE_URL`, `--test-force-exit`; no DB/gateway/network, no live charge, no secret logged).
- Full backend suite **64 pass / 0 fail** across 16 files (51 prior + 13 new; run in batches due to the sandbox mount's slow imports). Frontend `responseUnwrap` **9/9**. Frontend build still env-blocked (Windows rollup native binary; pre-existing, unchanged).
- No migration run; nothing committed/pushed/deployed.

### Remaining risks / notes

- The B3 display fix is read-time; stored legacy `YYYY-MM` rows remain until the optional 014 backfill is run on a real DB (after its duplicate-abort check passes). Running it is out of scope here (no shared/prod DB touched).
- Phase 2b (C6, D7/§I, C16, I-5, I-6) is intentionally sequenced — each is listed above with the specific reason it needs mocked-gateway or on-device verification rather than being shipped unverified. Do not begin Phase 2b (or Phase 3) until prompted.

---

## Phase 3 — execution (in progress, 2026-10-10)

Scope (access control + security boundaries): B2, C12, C15, H-sec1, C25/H-sec4, H-sec3, C24, H-low10, H-cfg1, J. Each verified against current code (file:line reads done).

Verification notes (what the code actually does today):
- **B2** `Admin/ElearningVideoController.publicIndex` nulls only `video_url` for locked videos; `platform` + `video_id` are still serialized → a watch URL is reconstructable. OPEN.
- **C12** teacher assignment attachments are re-filed by MediaService to `/uploads/general/` (the multer field is `attachment` on an `assignments` route, but `MediaService.upload(..., { folder: 'general' })` moves them into `general` — same folder as study materials), so they hit the gate's study-material branch, miss the `StudyMaterial` lookup, and fall through to public. OPEN (attachments world-readable).
- **C15** `app.js` sets `Cache-Control: public, s-maxage=60` on ALL `/api/public` GETs, but `/public/materials` and `/public/e-learning` are per-viewer (`is_unlocked`, nulled URLs). Shared edge cache can serve one student's view to another. OPEN.
- **H-sec1** `TeacherMarksController.getStudentsForExam` returns students for ALL batches of the exam's course (`current_batch_id IN courseBatchIds`), exposing name/email/phone/photo of sibling-batch students the teacher doesn't teach. `saveMarks` already scopes to the teacher's assigned batches — mirror it. OPEN.
- **C25/H-sec4** `buildAuthenticatedAssetUrl` (frontend) appends the 30-day session JWT from `localStorage` as `?token=` for `/uploads/students/*`; both `/uploads` gates accept a raw session JWT via `?token=`. OPEN.
- **H-sec3** no security headers set by Express; the root `vercel.json` has them but its applicability to prod is uncertain (see H-cfg1). Add headers in-app (helmet is NOT a dependency; use an explicit middleware — no new dep, works regardless of deploy). 
- **C24** `express-rate-limit` default MemoryStore; no Redis/Upstash/pg limiter dependency installed → per-isolate on Vercel. BLOCKED for distributed (no shared store configured).
- **H-low10** `/uploads` gate short-circuits ALL image-extension files to public before the `StudyMaterial` lookup → a restricted material with an image extension bypasses authz. OPEN.
- **H-cfg1** root `vercel.json` uses a non-standard `services`+object-rewrite schema; `backend/api/index.js` is a serverless entrypoint and AGENTS.md says deploy frontend/backend separately → prod is almost certainly two dashboard-configured projects (roots `frontend/`,`backend/`), so the root file's routing/headers likely do NOT govern prod. Document; no speculative routing change.
- **J** JWT stored in `localStorage` (`ACCESS_TOKEN`) + sent as Bearer by axios; cookie is HttpOnly SameSite=Lax. Document decision + migration plan.

Plan: fix B2, C12, C15, H-sec1, H-low10 at the root cause with focused unit tests; implement signed download tokens (C25) end-to-end (backend unit-tested; frontend producer+callers rewired, verification-incomplete without a React harness) and stop accepting the session JWT in `?token=`; add in-app security headers (H-sec3) with tests; centralize the rate limiter + startup warning and document C24 as blocked; document H-cfg1 evidence and the J decision/plan. No migration, commit, push, or deploy.

### Phase 3 — results (complete; backend tests pass)

Fixed—tests pass: **B2, C12, H-low10, H-sec1, H-sec3, C15** (C15 at the header level — the server now emits `private, no-store` for personalized endpoints; that the CDN honors it is a deploy-side confirmation). **Fixed—verification incomplete: C25/H-sec4** (backend signed-token path unit-tested; the frontend rewire is not run — no React harness). **Blocked—decision needed: C24, H-cfg1, J (= H-low6 + H-low11)** — documented below, no silent infra/arch decision made. **Deferred: C23** (not in this phase's instruction set).

Root causes + fixes (delivered):
- **B2** — `publicIndex` nulled only `video_url` for a locked video; `platform`+`video_id` still shipped and rebuild a watch URL. Now a locked video also nulls `video_id` and `platform`. Enforcement is server-side (the client never receives the reconstruction data), not a hidden player.
- **C12** — teacher assignment attachments are stored in `/uploads/general/` (MediaService re-files them there, alongside study materials), so they hit the gate's material branch, missed the `StudyMaterial` lookup, and fell through to public. The gate now, when a `general` file matches no StudyMaterial, looks up `Assignment` by `attachment_path` and applies `decideAssignmentAttachmentAccess` (staff allow; student allow only if enrolled in the assignment's batch; else 403; unmanaged file stays public). Student submissions in `/uploads/assignments/` keep their existing submission-ownership gate. Genuinely public media is untouched (only files backed by an Assignment/StudyMaterial row are gated).
- **H-low10** — the gate short-circuited every image-extension file to public before the material lookup, so a restricted material saved as `.png`/`.jpg` bypassed authz. New `shouldLookupMaterial(folder, filename)` policy: the `general` folder (where materials live) is ALWAYS checked regardless of extension; other folders keep the image fast-path. Decision is by explicit folder policy, never filename alone.
- **H-sec1** — `getStudentsForExam` listed students for ALL batches of the exam's course (`current_batch_id IN courseBatchIds`), leaking sibling-batch students' name/email/phone/photo. Now scoped to the teacher's OWN assigned batches (mirrors `saveMarks`); a teacher assigned to no batch in the course gets 403 and students are never queried.
- **C15** — `app.js` set `public, s-maxage=60` on all `/api/public` GETs; `/public/materials` and `/public/e-learning` are per-viewer. New `isPersonalizedPublicPath()` makes those two emit `Cache-Control: private, no-store` + `Vary: Authorization, Cookie`, so a shared edge can't serve one student's view to another; the rest keep the fast public cache.
- **H-sec3** — Express set no security headers. New `middleware/securityHeaders.js` (no new dependency — helmet is not installed) sets `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN` (so the SPA's same-origin PDF/ID-card iframes still work), `Permissions-Policy`, a strict `default-src 'none'` CSP on `/api` JSON, and a file CSP (`object-src 'none'; frame-ancestors 'self'`, img/media allowed) on `/uploads` + `/storage`. CORP is intentionally NOT set (frontend may load backend assets cross-origin). The browser-facing HTML/asset CSP stays the frontend deployment's responsibility (see H-cfg1).
- **C25/H-sec4** — new `services/downloadToken.js` mints short-lived (30-min default), file-scoped tokens signed with an HMAC key DERIVED+namespaced from `JWT_SECRET` (a download token can never be used as an auth JWT or vice-versa). Both `/uploads` gates now accept `?token=` ONLY as such a signed token (scoped to the exact path + expiry); the session JWT is NO LONGER accepted from the URL (still used via HttpOnly cookie / Bearer header for same-origin). `StudentDocumentController` attaches a per-file `download_token`; the frontend producer `buildAuthenticatedAssetUrl(path, downloadToken)` uses it and no longer reads the JWT from `localStorage`. No full-lifetime-JWT-in-URL fallback remains.

Blocked / documented (no silent infra or architecture decision):
- **C24 (distributed rate limiting)** — `express-rate-limit` uses the in-process MemoryStore; no Redis/Upstash/pg-backed limiter is installed, so on Vercel the counters are per-isolate, not global. Done safely: the limiter is centralized (`createLimiter`) so a shared `store` can be injected in one place, and a startup `console.warn` fires on Vercel without a configured store. BLOCKED until a shared store is chosen. To enable later: provision a store (e.g. Upstash Redis or a Postgres-backed limiter), add its env (suggested `RATE_LIMIT_STORE`/connection URL), and pass `store` into `createLimiter`. No paid provider added, no credentials hardcoded; local/dev behavior unchanged.
- **H-cfg1 (prod deploy config)** — EVIDENCE that the root `vercel.json` likely does NOT govern production: (1) `backend/api/index.js` is a serverless-function entrypoint (`export default app`), the shape Vercel expects when a project's root dir is `backend/`; (2) AGENTS.md says build in `frontend/` and deploy separately from root; (3) there is no `vercel.json` in `frontend/` or `backend/`; (4) the root file uses a non-standard `services` key and object-form rewrite `destination` that current Vercel does not interpret. Conclusion: production is almost certainly two dashboard-configured projects (roots `frontend/`, `backend/`), so the root file's routing AND its header block probably don't apply to prod — which is exactly why H-sec3 was implemented IN-APP. No speculative routing rewrite made. ACTION FOR USER: confirm in the Vercel dashboard which project(s)/root dirs deploy prod; if a single root project with the `services` schema is actually used and is broken, say so and it will be fixed + routing (`/api`,`/uploads`,`/storage`, SPA fallback) verified.
- **J (localStorage JWT + CSRF)** — current architecture: the JWT is stored in `localStorage` (`ACCESS_TOKEN`), sent by axios as a `Bearer` header, AND mirrored into an HttpOnly `SameSite=Lax` cookie (`uttoron_auth`). CSRF exposure is low today because the API authorizes on the Bearer header (not ambient cookie) for XHR and the cookie is Lax + only unsafe methods mutate. XSS exposure is the real risk (localStorage is script-readable). Recommended decision + SAFE migration plan (NOT executed — touches every login/refresh/logout/request path + depends on prod same-origin/cross-site cookie behavior, which must be confirmed first):
  1. Confirm whether `/api` is same-origin with the SPA in production (rewrite) or cross-site (separate domain). This determines cookie viability.
  2. If same-origin: move to cookie-only auth — stop storing the JWT in `localStorage`, have the server set/refresh the HttpOnly cookie, and drop the axios `Authorization` injection. Then add CSRF defense-in-depth (double-submit cookie or a per-session CSRF token header) since auth becomes ambient. Add tests for login/refresh/logout + a CSRF-rejection case.
  3. If cross-site: keep the Bearer-from-memory model (JS variable/in-memory, not `localStorage`) with a short-lived access token + refresh endpoint; CSRF is moot for pure Bearer. 
  Either path is a dedicated, test-covered change; not safe to do blind this phase. The C25 signed-token work already removes the worst concrete leak (long-lived JWT in `/uploads` URLs).

Migrations added: none. Files changed — backend: `app.js` (security-headers middleware; centralized limiter + Vercel warn; both `/uploads` gates now take signed download tokens, drop JWT-in-URL; `general`-folder image lookup for H-low10; assignment-attachment branch for C12; `private,no-store` for personalized public endpoints), `controllers/Admin/ElearningVideoController.js` (B2), `controllers/Teacher/TeacherMarksController.js` (H-sec1), `controllers/Admin/StudentDocumentController.js` (attach `download_token`). New backend: `services/downloadToken.js`, `services/cachePolicy.js`, `middleware/securityHeaders.js`, extended `services/protectedFileAccess.js` (`decideAssignmentAttachmentAccess`, `shouldLookupMaterial`). Frontend: `services/config.js` (`buildAuthenticatedAssetUrl(path, token)`, no more `localStorage` JWT), `pages/admin/StudentDocumentsTab.jsx`, `pages/student/StudentProfile.jsx` (pass per-file `download_token`). New tests: `tests/{download-token,security-headers,elearning-locked,teacher-exam-students-scope}.test.mjs` + extended `tests/protected-file-access.test.mjs`.

Tests / commands + outcomes: `node --check` clean on all edited backend files. Backend `node --test` (model-stubbed, dummy `DATABASE_URL`, `JWT_SECRET` set, `--test-force-exit`, run in batches) = **79 pass / 0 fail** across 20 files (64 prior + 15 new: download-token 5, security-headers 3, protected-file-access +4, elearning-locked 1, teacher-exam-students-scope 2). Frontend `responseUnwrap` **9/9**; `eslint` on the 3 changed frontend files = **0 errors** (3 pre-existing warnings). Frontend `vite build` still env-blocked (Windows rollup; pre-existing). No DB/gateway/network in tests; no secret or token value logged (verified by grep: the only token-adjacent log is a generic logout-failure message). No migration run; nothing committed/pushed/deployed.

Remaining risks / notes: (1) C25 frontend path is unverified without a React harness — ON-DEVICE CHECK NEEDED: as a student, open Profile → the ID card + each document must display and download (URL carries a short `?token=`, not a JWT); as admin, the Student Documents tab view/download must work; after ~30 min idle a fresh page load re-mints tokens. (2) C15 relies on the CDN honoring `private, no-store` — confirm once H-cfg1's prod topology is known. (3) The signed-token TTL (30 min) is a UX/security tradeoff; adjust `DOWNLOAD_TOKEN_TTL_MS` if needed. New findings this phase: none.

Next recommended phase: **Phase 4 — attendance + results correctness** (B4, C1–C5, H-low1, D1, D2, D10, I-3, I-4, I-12–I-15, I-17–I-19; note H-sec1 already done here). Do not start it (or Phase 2b, or the J/C24/H-cfg1 decisions) until prompted.

---

## Phase 4 — execution (in progress, 2026-10-10)

Scope (attendance/leave cluster): B4, C1, C2/I-2, C3, C4, C5, I-17, I-19, §H. Verified against current code:
- **B4** `leaveRequests` returns `r.Student.User` (capitalized includes); `LeaveManager.jsx` reads `r.student.user.name` → every name shows "Unknown" + the search filter never matches. Fix via a normalized serializer.
- **C1** `getSheet` lists ALL students with a batch (ignores `course_id`, lines 58-64); `store`/`saveCell` never validate the student belongs to the selected course → cross-course writes accepted.
- **C2/I-2** teacher `markAttendance` writes `course_id: null` (line 149) → rows never appear in the admin monthly sheet (which filters by `course_id`). Must derive `course_id` from the validated batch.
- **C3** teacher `markAttendance`/`updateAttendance` write `session: session || null`; a NULL session defeats the Postgres unique `(student_id,batch_id,date,session)` index. Admin already resolves non-null via `resolveSession`; teacher must use the SAME rule.
- **C4** `requestLeave` uses `upsert` → silently overwrites a teacher-marked present/absent/late row with a pending leave (punchIn already guards; requestLeave does not).
- **C5** `punchOut` resolves session from the CURRENT clock (`resolveSession(session)`); a morning punch-in + afternoon punch-out (no client session) resolves to 'evening' → "No punch-in record found".
- **I-17** admin `StatusPill` has no branch for `status: 'leave'` without an approved/pending `leave_status` → falls through to the "-"/"Set" (unset) badge.
- **I-19** `studentStats` denominator = sum of ALL status rows (includes pending/rejected leave) → deflated percentage. Define eligible = present+absent+late+approved-leave; exclude pending/rejected.
- **§H / C3 DB** — **migration 002 (`002-attendance-dedupe.mjs`) ALREADY repairs this**: it backfills NULL sessions (from punch-in time) + NULL batch_id (from the student's current batch), deletes duplicates keeping the lowest id (reconciliation via `COALESCE(batch_id,0)`), and ensures the unique `(student_id,batch_id,date,session)` index exists. So NO new migration is needed — only the forward controller fixes (non-null session, derived course_id). Documented, not re-done.

Plan: extract one shared session resolver (`services/attendanceSession.js`) used by admin + teacher (C3); scope `getSheet` + validate `store`/`saveCell` writes to the course (C1); derive teacher `course_id` from the batch (C2/I-2); make `requestLeave` refuse to clobber a teacher mark with a clear 409 (C4); make `punchOut` find the open punch-in regardless of clock (C5); normalized leave serializer (B4); shared `attendanceSummary` eligible-day rule + fix `studentStats` and align the dashboard + admin monthly counting (I-19); add the `status:'leave'` StatusPill branch (I-17). Pure helpers get unit tests; controller fixes get model-stubbed tests. No migration/commit/deploy.

### Phase 4 — results (complete; tests pass)

All nine items **Fixed—tests pass**: B4, C1, C2/I-2, C3, C4, C5, I-17, I-19; §H/H-low1 verified already repaired by migration 002 (no new migration).

Root causes + fixes:
- **B4** — new pure `services/leaveSerializer.js` normalizes each leave row to `{ student: { user: {...}, card_no }, approver, ...top-level fields }`; `leaveRequests` returns it, so `LeaveManager.jsx`'s `r.student.user.name` + its search filter work. A missing related user yields `user: null` (no crash), empty list → `[]`.
- **C1** — `getSheet` now lists only students in the selected course's batches (was every batched student). `store` and `saveCell` validate each student's current batch is one of the course's batches and reject cross-course writes with 400 (server-side, not dropdown-only).
- **C2/I-2** — teacher `markAttendance` derives `course_id` from the validated batch (`Batch.findByPk(batch_id).course_id`), never a client value, so teacher rows now appear in the admin monthly sheet (which filters by `course_id`). `updateOnDuplicate` also refreshes `course_id`.
- **C3** — new shared `services/attendanceSession.js` (`resolveSession`/`dhakaTime`/`todayLocalDate`) is the ONE non-null session rule for both admin and teacher entry; teacher `markAttendance`/`updateAttendance` no longer write `session: null`. The DB-level duplicate prevention (backfill + dedupe + unique index) is already provided by migration 002 (see §H).
- **C4** — `requestLeave` now loads the existing row for (student, date, session) and returns **409** with a clear message if it is a teacher mark (status present/absent/late or a punch-in) or an already-approved leave; it only (re)writes an empty slot or the student's own still-pending leave. The student page already surfaces `err.response.data.message`.
- **C5** — `punchOut` finds today's row that actually has a punch-in (preferring the still-open one) instead of deriving the session from the current clock, so a morning punch-in + afternoon punch-out (no client session) resolves correctly. An explicit session still narrows it.
- **I-17** — admin `StatusPill` gained explicit branches for `leave_status === 'rejected'` ("RJ") and `status === 'leave'` ("LV"); a leave row no longer falls through to the "-"/"Set" (unset) badge.
- **I-19** — new pure `services/attendanceStats.js` defines eligible days = present + absent + late + approved leave; **pending and rejected leave are excluded** from the denominator (documented in the module). `studentStats`, the student dashboard, and the admin monthly sheet all use this one rule, so their percentages reconcile.
- **§H / H-low1** — VERIFIED that `002-attendance-dedupe.mjs` already (1) backfills NULL `session` from punch-in time, (2) backfills NULL `batch_id` from the student's current batch, (3) deletes duplicates keeping the lowest id (reconciliation via `COALESCE(batch_id,0)` — it does NOT fail on existing duplicates), and (4) ensures the unique `(student_id,batch_id,date,session)` index exists. So no new migration is needed; the only forward gap (teacher writing NULL session/course_id) is closed in code above. `batch_id`/`course_id` remain non-FK integer columns by existing design — left as-is (adding FKs would need orphan analysis + a constraint migration; not in scope and not required to fix the uniqueness).

Daily vs monthly parity: both admin sheets now resolve students through the course→batch relationship and share the one `resolveSession` rule and the one `attendanceSummary` percentage rule; teacher and admin writes both go through the same non-null session + unique key.

Files changed — backend: `controllers/Admin/AttendanceController.js` (shared session import; `getSheet` course scoping; `store`/`saveCell` cross-course rejection; `leaveRequests` serializer; `studentStats` eligible rule; `requestLeave` 409 conflict; `punchOut` punch-in-based resolution), `controllers/Teacher/TeacherAttendanceController.js` (derive `course_id` from batch; non-null session in `markAttendance`/`updateAttendance`), `controllers/Student/DashboardController.js` (attendance % aligned to the eligible rule). New backend: `services/attendanceSession.js`, `services/attendanceStats.js`, `services/leaveSerializer.js`. Frontend: `pages/admin/AttendanceManager.jsx` (StatusPill `leave`/`rejected` branches; monthly counting denominator = eligible days). `LeaveManager.jsx` unchanged (the backend now matches the shape it already reads). New tests: `tests/{attendance-session,attendance-stats,leave-serializer,teacher-attendance,admin-attendance}.test.mjs`.

Tests / commands + outcomes: `node --check` clean on all edited backend files. Backend `node --test` (model-stubbed, dummy `DATABASE_URL`, `JWT_SECRET` set, `--test-force-exit`, batched) = **97 pass / 0 fail** across 26 files (79 prior + 18 new: attendance-session 3, attendance-stats 4, leave-serializer 4, teacher-attendance 2, admin-attendance 5). `eslint` on `AttendanceManager.jsx` = **0 problems**. Frontend `vite build` still env-blocked (Windows rollup; pre-existing). No migration run; nothing committed/pushed/deployed. No secret/PII logged.

Remaining risks / notes: (1) the admin monthly sheet + leave UI are verified by backend tests + eslint, not a running React harness — ON-DEVICE CHECK: leave requests now show real names + are searchable; a teacher-marked class refuses a student leave with a clear message; morning punch-in → afternoon punch-out works; the monthly % no longer drops for pending leave. (2) `requestLeave`'s 409 relies on finding the existing row by (student, date, resolvedSession) — if a legacy row has a NULL session it won't match, but migration 002 backfilled those. (3) `batch_id`/`course_id` stay non-FK by existing design. New findings this phase: none.

### Home mobile compact pass 2 — verified

The second compact responsive pass was verified on the Home page at 360×800, 390×844, 768×1024, and 1440×900. Mobile sections were intentionally recomposed with smaller spacing and type while preserving readable hierarchy, 48px primary tap targets, the navy/brass/paper visual system, and the existing API-driven content. No page-level horizontal overflow was detected at any checked width.

Validation:

- `npm run lint` — exit 0; only pre-existing warnings.
- `npm run build` — passed (`vite build`).

### Site Settings About photo chooser interaction — verified

Replaced the nested label/file-input chooser with an explicit `type="button"` trigger and hidden file input. This prevents the upload control from participating in the settings form's submit/reset behavior while preserving keyboard and mouse activation.

Authenticated browser verification:

- Opened `/admin/site-settings`.
- Selected a Mission photo and a Vision photo through the real file chooser.
- The page remained rendered at `/admin/site-settings`.
- Selected previews appeared correctly; no blank page or runtime error occurred.
- Problems check — no errors in `Home.jsx`, `HeroSection.jsx`, `StatsSection.jsx`, `FeatureCards.jsx`, or the Home `SuccessStories.jsx`.
- Browser checks — no horizontal overflow at all four widths; CTA links measured 48px on mobile and 56px at tablet/desktop.
- Visual check — mobile screenshot reviewed at 390×844; hero, trust points, CTA buttons, logo proof card, and success-rate badge remain composed and readable.efuses a student leave with a clear message; morning punch-in → afternoon punch-out works; the monthly % no longer drops for pending leave. (2) `requestLeave`'s 409 relies on finding the existing row by (student, date, resolvedSession) — if a legacy row has a NULL session it won't match, but migration 002 backfilled those. (3) `batch_id`/`course_id` stay non-FK by existing design. New findings this phase: none.

### Dynamic About page photos — verified

Added three context-specific Site Settings image fields for the public About page: Mission, Vision, and Approach. The admin form previews selected images and submits them through the existing authenticated settings save flow. The backend stores the resulting media URLs, replaces old files safely, and exposes the fields through the existing public settings endpoint. The About page renders each configured image with a contextual accessible alt label and keeps the existing icon treatment as a fallback when no image is configured.

Validation:

- Problems check — no errors in the edited About, Site Settings, backend model/controller/routes, or migration files.
- Backend syntax checks — passed for all edited backend files.
- Site Settings regression tests — 6/6 passed.
- `npm run lint` — exit 0; only pre-existing warnings.
- `npm run build` — passed (`vite build`).
- Browser check — About page rendered configured test image URLs in all three section slots with no horizontal overflow.
- Database migration added: `019-site-setting-about-photos.mjs`; it is additive and idempotent. It must be applied in the deployment environment before saving the new fields.efuses a student leave with a clear message; morning punch-in → afternoon punch-out works; the monthly % no longer drops for pending leave. (2) `requestLeave`'s 409 relies on finding the existing row by (student, date, resolvedSession) — if a legacy row has a NULL session it won't match, but migration 002 backfilled those. (3) `batch_id`/`course_id` stay non-FK by existing design. New findings this phase: none.

### Site Settings About photo upload blank-page fix — verified

Separated newly selected About image `File` objects from the persisted settings URL state in the admin Site Settings form. The form now previews and submits only validated image files while keeping existing setting values as strings, preventing a runtime crash and white blank page after choosing an upload.

Validation:

- Problems check — no errors in `SiteSettings.jsx`.
- `npm run lint` — exit 0; only pre-existing warnings.
- `npm run build` — passed (`vite build`).efuses a student leave with a clear message; morning punch-in → afternoon punch-out works; the monthly % no longer drops for pending leave. (2) `requestLeave`'s 409 relies on finding the existing row by (student, date, resolvedSession) — if a legacy row has a NULL session it won't match, but migration 002 backfilled those. (3) `batch_id`/`course_id` stay non-FK by existing design. New findings this phase: none.

Next recommended phase: **Phase 5 — admin/UI correctness + hygiene** (C13, C17–C22, D3–D6, D9, D11–D21, H-low5/7/9, I-7–I-10, I-16, I-dead) or the remaining results-correctness items (D1, D2, I-3, I-4, I-12–I-15, I-18). Do not start it (or Phase 2b / the C24·H-cfg1·J decisions) until prompted.

---

## Phase 5 — execution (in progress, 2026-10-11): academic computation + data scope

Scope (§D, I-3, I-4, I-12, I-13, I-14, I-15, I-18, E4, J, K, L/E3). Verified against current code:
- **Canonical core already exists:** `GradeService` (percentage→grade/GPA map; PASS_THRESHOLD 33 **on percentage**) + `ExamResultService.computeForExam` (denominator = Σ per-subject full marks from `subject_marks`, default 100 each, never total_marks||0) + `recomputeExam` (competition ranking, ties share a position, persists total/grade/gpa/position) + `enrichResults` (read-time recompute). The bug is that NOT all write paths use it.
- **§D/I-12/I-13** — `TeacherResultController.saveMarks` persists grade via `GradeService.calculate(total, exam.total_marks||0)` → **F/GPA 0 when total_marks is null**; `TeacherMarksController.saveMarks` (legacy) uses `exam.total_marks||100`. Divergent denominators. Admin `ExamController.storeMarks` already uses the canonical service.
- **B** — `storeMarks` loops `upsert` with NO transaction (partial save on mid-loop failure) and never checks the student belongs to the exam's course batches.
- **I-3/I-15** — admin `PaymentController.studentExamResults` returns RAW stored grade/gpa and derives pass/fail from `total_obtained >= 33` (absolute marks, not %), so 40/500 shows "Pass" and stale stored grades disagree with the student page.
- **I-4** — only the canonical paths persist `position`; the two teacher paths don't → rank comes only from read-time enrichment.
- **I-14** — `TeacherResultController` silently CLAMPS marks to [0, full]; `TeacherMarksController` writes raw (no validation). Inconsistent; neither rejects bad input.
- **I-18** — `ExamController.myResults` filters to published EXAMS but still returns ALL subject marks and computes the summary over unpublished subjects (partial publish leaks hidden-subject marks).
- **E4** — `ExamController.togglePublish` does NOT clear `published_subjects` on unpublish → `myResults`'s `published_subjects.length > 0` keeps the result visible after unpublish.
- **J** — `TeacherAssignmentController.gradeSubmission` only checks `marks_obtained !== undefined`, then stores it raw (non-numeric/negative/over-full → bad data or 500).
- **K** — `StudentAssignmentController.submit` enforces NO `due_date` policy (late submissions silently accepted, not marked); the "already submitted" resubmission block exists and must stay.
- **L/E3** — legacy `/teacher/exams*` (`TeacherMarksController`) stays; make its computation consistent + tested; document a separate retire/unify recommendation.

Plan: route ALL three mark-write paths through `ExamResultService` (compute + `recomputeExam`) so persisted grade/gpa/position are canonical (§D, I-3, I-4, I-12, I-13, I-15); add a shared `marksValidation` helper and REJECT (4xx) out-of-range/non-numeric on both teacher paths + assignment grading (I-14, J) — documenting that this replaces the silent clamp; wrap `storeMarks` in a transaction + course-batch scope (B); clear `published_subjects` on unpublish (E4) and filter `myResults`/dashboard to published subjects for both marks AND summary (I-18); record+surface assignment lateness without inventing a grace period (K); keep legacy routes and document the E3 retire plan (L). Unit-test the pure helpers + model-stubbed controller paths. No migration/commit/deploy.

## Success Story Detail UI — verified

- Updated `frontend/src/pages/SuccessStoryDetail.jsx` for the approved Shikhor Academy visual system: compact navy editorial hero, white page canvas, brass achievement treatment, paper reading surfaces, responsive related-story cards, accessible focus states, and touch-friendly CTAs.
- Preserved the existing detail API, SEO metadata, real story content, photo handling, related-story links, and admission/contact actions. No records or claims were added.
- Verification: `problems` reported no errors; `npm run lint` exited 0 with the repository's pre-existing warnings; `npm run build` completed successfully.
- Browser verification used real story route `/success-stories/rahim-uddin` at 360×800, 390×844, 768×1024, and 1440×900. The page rendered with a white canvas, distinct navy hero, stacked mobile content, loaded images, and no unintended horizontal overflow.

## Success Stories CTA width — verified

- Expanded the closing CTA navy band on both `frontend/src/pages/SuccessStories.jsx` and `frontend/src/pages/SuccessStoryDetail.jsx` to the full viewport width, matching the public navbar edge-to-edge treatment while keeping inner copy constrained for readability.
- Verification: `problems` reported no errors; `npm run lint` exited 0 with pre-existing warnings; `npm run build` completed successfully.
- Browser verification confirmed the CTA spans the viewport at desktop and mobile widths on `/success-stories` and `/success-stories/rahim-uddin`, with no horizontal overflow.

## Success Stories footer spacing — verified

- Normalized the CTA-to-footer spacing on both Success Stories routes to a consistent 32px closing gap. The listing page's excessive bottom padding was reduced, and the detail page now uses a dedicated bottom-padding wrapper to avoid margin collapse.
- Browser measurement confirmed a 32px gap between the navy CTA and footer on both `/success-stories` and `/success-stories/rahim-uddin` at desktop width, with no page-level overflow.

## Success Stories CTA/footer direct connection — verified

- Removed the optional bottom spacing from both Success Stories pages so the full-width navy CTA connects directly to the footer, as requested.
- Detail-page top breathing room remains intact via wrapper padding rather than a collapsing section margin.
- Verification: `problems` reported no errors; `npm run lint` exited 0 with pre-existing warnings; `npm run build` completed successfully. Browser verification confirmed zero CTA-to-footer gap on both routes after the entrance animation settled.

## Mobile footer refinement — verified

- Refined the shared `frontend/src/components/common/Footer.jsx` for premium mobile composition: compact brand block, two-column quick-links/contact arrangement, tighter typography and icon rhythm, balanced section spacing, and a smaller copyright row. Desktop spacing and three-column layout remain preserved from the `sm` breakpoint upward.
- Browser verification on `/success-stories/rahim-uddin`: footer reduced from approximately 543px to 430px at 390px width, email wrapping remained controlled, and no horizontal overflow occurred. Desktop footer remained approximately 377px.
- Verification: `problems` reported no errors; `npm run lint` exited 0 with pre-existing warnings; `npm run build` completed successfully.

## Home mobile premium refinement — verified

- Refined the Home page's mobile composition across `HeroSection`, `StatsSection`, `FeatureCards`, Home `SuccessStories`, featured faculty, and the closing CTA. Mobile now uses intentional compact spacing, readable type scale, balanced card padding, full-width 48px actions, a smaller logo proof card, and two-column trust/stat arrangements instead of a squeezed desktop layout. Desktop styling remains available from the `sm` breakpoint upward.
- Added the project-level premium responsive UI rule in `.github/copilot-instructions.md`: use premium editorial/product patterns, recompose mobile layouts rather than merely shrinking desktop, preserve touch targets, and verify 360px/390px/tablet/desktop widths.
- Browser verification at 360×800, 390×844, 768×1024, and 1440×900 confirmed no horizontal overflow. At 390px, primary Home buttons render at 48px height and full content width; the hero and section rhythm are substantially more compact and composed.
- Verification: edited-file `problems` reported no errors; `npm run lint` exited 0 with pre-existing warnings; `npm run build` completed successfully.

### Phase 5 — results (complete; tests pass)

All items **Fixed—tests pass**: §D (D1), D2/B, D3/J, D4/K, I-3, I-4, I-12, I-13, I-14, I-15, I-18, E4. L/E3: grade source-of-truth unified, legacy routes KEPT + tested, retire plan documented below.

Policy decisions made explicit (NOT silent):
- **Grade/pass thresholds UNCHANGED** — the existing `GradeService` map (A+ 80 / A 70 / A- 60 / B 50 / C 40 / D 33 / F) and the 33% pass line are kept as the canonical rule; no threshold was invented.
- **Denominator (I-12/I-13)** — the one rule is `ExamResultService.computeForExam`: Σ per-subject full marks from `subject_marks`, each defaulting to **100** (the pre-existing default used across the teacher UI), falling back to `total_marks` only if no per-subject marks exist. This never divides by zero and never grades everyone F because `total_marks` is null.
- **I-14 marks validation = REJECT, not clamp** — this REPLACES `TeacherResultController`'s old silent `Math.min/max` clamp. Non-numeric / negative / above-full values now return 4xx on BOTH teacher paths and assignment grading; a BLANK cell means "not entered" and is skipped (so a partial sheet still saves) — it is no longer coerced to 0. Documented as a deliberate behaviour change.
- **K late submissions = still ACCEPTED, now recorded** — no grace period invented, the "already submitted" resubmission block is preserved; a submission past `due_date` is stored with `status:'late'` and surfaced via a derived `is_late` (so it survives grading).

Root causes + fixes:
- **§D/I-3/I-4/I-12/I-13/I-15** — `GradeService` + `ExamResultService` were already the canonical core, but `TeacherResultController.saveMarks` persisted grade via `GradeService.calculate(total, total_marks||0)` (F/0 when total_marks null) and `TeacherMarksController.saveMarks` used `total_marks||100`. Both now compute via `ExamResultService.computeForExam` and call `recomputeExam(exam)` after writing, which persists canonical total/grade/gpa AND competition **position** (ties share a rank) for every student. Admin `storeMarks` already did this. `PaymentController.studentExamResults` (admin Academic History) now runs the same `enrichResults` the student page uses and derives Pass/Fail from `GradeService.passFailStatus(percentage)` — no more raw stale values (I-3) or absolute `>=33` pass (I-15).
- **D2/B** — `storeMarks` now (1) verifies every posted student belongs to a batch of the exam's course (400 otherwise) and (2) validates all marks, then writes the batch inside `sequelize.transaction` so a mid-batch failure rolls back every row (no partial save).
- **I-14/J** — new `services/marksValidation.js` (`validateMark`, `validateMarksDetails`, `fullMarksForSubject`); both teacher mark paths and `gradeSubmission` reject non-numeric/negative/above-full with 4xx and never persist invalid values.
- **I-18/E4** — `togglePublish` clears `published_subjects` on unpublish (revokes visibility; marks untouched). `ExamResultService` gained `visibleSubjectSet` + a `restrictToPublished` mode: `myResults` and the student dashboard now filter marks_details AND compute the summary/rank only over the subjects a student may see (fully-published = all; partial = published_subjects only).

### Success Stories page redesign — 2026-10-15

Verified complete: redesigned the public `/success-stories` listing in `frontend/src/pages/SuccessStories.jsx`. The page now uses the existing navy/brass/paper design tokens, preserves the existing `PageBackground` pattern, keeps the real success-stories API/search/sort/load-more/detail-link behavior, and provides responsive story cards, empty/loading states, and accessible focus/tap targets. Verified at 360px and 1440px widths with no page-level horizontal overflow.
- **K** — `StudentAssignmentController.submit` compares the submission date (Asia/Dhaka) to `due_date`, stores `status:'late'` when past due, and both `submit` and `results` expose a derived `is_late`.

Files changed — backend: `services/ExamResultService.js` (visible-subject filtering + transaction option), `services/marksValidation.js` (new), `controllers/Admin/ExamController.js` (storeMarks transaction+scope+validation; unpublish clears published_subjects; myResults restrictToPublished), `controllers/Admin/PaymentController.js` (studentExamResults enriched + percentage Pass/Fail), `controllers/Teacher/TeacherResultController.js` + `controllers/Teacher/TeacherMarksController.js` (validate + canonical compute + recompute), `controllers/Teacher/TeacherAssignmentController.js` (gradeSubmission validation), `controllers/Student/StudentAssignmentController.js` (lateness), `controllers/Student/DashboardController.js` (recent results restrictToPublished). New tests: `tests/{grade-service,marks-validation,exam-result-service,exam-store-marks,assignment-grade-submit}.test.mjs`; `tests/teacher-marks-authorization.test.mjs` updated for the recompute step.

Tests / commands + outcomes: `node --check` clean on all 9 edited backend files. Backend `node --test` (model-stubbed, dummy `DATABASE_URL`, `JWT_SECRET` set, `--test-force-exit`, batched) = **118 pass / 0 fail** across 30 files (97 prior + 21 new: grade-service 4, marks-validation 4, exam-result-service 6, exam-store-marks 3, assignment-grade-submit 4). Covered: cross-course attempt rejected, mid-batch failure surfaced (no partial success), denominator null/zero/normal, below-zero/above-full/non-numeric rejection, tied ranks, publication-filtered marks+summary, pass boundary (40/500 = Fail), on-time/late submission. No frontend code change was required (response shapes are additive — admin results gain percentage/position/pass_fail; student results gain is_late/due_date; myResults marks are publication-filtered). Frontend `vite build` still env-blocked (Windows rollup; pre-existing). No migration run; nothing committed/pushed/deployed. No secret/PII logged.

### L / E3 — legacy teacher-marks endpoints: retire recommendation (NOT executed; needs approval)
- Two write paths still exist: **Path B** `/teacher/results/marks` (`TeacherResultController`, the one `TeacherMarks.jsx` uses — per-subject, assignment-scoped) and **Path A** `/teacher/exams*` (`TeacherMarksController`, not used by the current UI). Both now share the SAME authorization model, validation, canonical computation and ranking, so they are behaviourally consistent and safe to keep.
- Recommendation (future phase, with approval): retire Path A `/teacher/exams*` — confirm no mobile/legacy client calls it (grep the frontend shows only Path B in use), add a deprecation log for one release, then remove the routes + controller and its test. Impact: low (UI already on Path B); risk is an unknown external caller. Do NOT delete this phase.

Remaining risks / notes: (1) all paths verified by model-stubbed unit tests + the pure canonical service, not a live DB run; (2) `recomputeExam` runs after the `storeMarks` transaction commits in the two teacher paths (not inside a txn there) — a recompute failure leaves marks saved with stale ranks that self-heal on the next save or read-time `enrichResults`; (3) on-device check: admin Academic History now matches the student result page; a partially-published exam shows only published subjects to the student; grading a mark above full is refused with a clear message. New findings this phase: none.

Next recommended phase: **Phase 6 — delete-cascades + schema safety (migrations)** (H-del1–3, H-low2, H-low4, I-21) or **Phase 5b — admin/UI hygiene** (C13, C17–C22, D5–D21, H-low5/7/9, I-7–I-10, I-16, I-dead). Do not start it (or Phase 2b / the C24·H-cfg1·J decisions) until prompted.

---

## Phase 5b — execution (complete, 2026-10-11): frontend/backend-contract fixes

Scope (A–Q): C16, C17, C18, C19, C20/I-9, C21, C22, C23, I-7, I-8, I-10, I-16, §D delete-feedback (D11), §D load-states (D12), §D Navbar (D13), §D Faculty modal (D17), §D API contracts (D21). Visual language preserved — no page redesigns; only the minimal elements each fix needs. **No React test harness** exists and `vite build` is env-blocked (Windows rollup native binary — confirmed the SAME pre-existing `MODULE_NOT_FOUND`, not a new failure), so frontend-only fixes are marked "verification incomplete" and verified by `eslint` (0 new errors) + extracted-logic unit tests; backend-backed fixes are "tests pass".

What each fix does:
- **A/C16** — `PaymentSettings.jsx` now reads/writes `settlement_bank` (the real column), so the Bank/MFS name loads and saves (the controller already accepted the value).
- **B/C17** — removed the leftover client-side name-only `.filter`; the list renders the server page, and the server already searches name/email/phone/ID across the whole dataset (debounced `?search=`), so those searches now work. Pagination envelope untouched (regression test still green).
- **C/C18** — `handleAdd` reads the backend's one-time `temp_password` (returned only when no manual password was given) and shows it once in a dismissible notice so the account is usable; a typed password is used as-is. No password is logged or written to this tracker.
- **D/C19** — ExamManager, AttendanceManager, BatchManager, RoutineManager load courses from `/admin/courses` (authorized, ALL courses incl inactive, no 12-item public cap) instead of `/public/courses`.
- **E/C20/I-9** — category up/down now swaps the array ELEMENTS and sends `display_order` by the NEW position (the old code swapped only the two values then sent original indices — a no-op); optimistic update + reload + failure toast. Backend `reorder` was already correct.
- **F/C21** — Admin/Student/Teacher route-level `<ErrorBoundary key={location.pathname}>` (PublicLayout already had it) so a crash on one page clears on navigation; keyed on path only → no reset loop.
- **G/C22** — ELearning + Gallery lock body scroll via a `useEffect([open])` that restores the PREVIOUS `overflow` on close AND on unmount, so navigating away mid-lightbox can't leave the page scroll-locked.
- **H/C23** — `publicIndex` visibility is now `!is_locked && isUnlocked(access_type, student)`: the admin lock toggle actually gates, and a locked video is never public even with `access_type:'all'`. Legacy inconsistent rows are reconciled at read-time (no migration). Tested (`elearning-locked`).
- **I/I-7** — `RoutineController.publish`/`unpublish` return the same `status:{hasDraft,hasPublished}` shape as index/saveAll; `RoutineManager` already consumed `data.status` (previously undefined → stale badge).
- **J/I-8** — `StatsSection` uses the admin `student_count` override (fallback `real_student_count`) — the SAME mapping About uses, so Home and About agree.
- **K/I-10** — `invalidateCache` now strips each cache key's `?query` before matching, so paginated keys (`…?page=2`) are cleared along with path/child keys; cross-invalidation extended to course/category/e-learning/gallery public feeds. Pure helpers (`invalidationNamespace`, `keyPathInvalidated`) unit-tested; no over-broad cross-user clear (keys stay token-scoped on read).
- **L/I-16** — backend `CourseController.update` coerces `''`→`null` for optional fields (clear vs leave-unchanged vs value); frontend sends cleared optional fields as `''` on edit so category/discount/seats/duration/teacher/class-mode are clearable.
- **M/§D (D11)** — all 5 managers (Payment/Notice/Event/SuccessStory/Library) wrap DELETE in try/catch, show a failure toast, and refresh only on success (Library gained the `notify` import).
- **N/§D (D12)** — StudentResults and the Admission course loader now distinguish load FAILURE (error banner + Retry) from an empty set; a broader page-by-page sweep is recommended as follow-up.
- **O/§D (D13)** — the public DASHBOARD button (desktop + mobile) routes by `user.role` (`dashboardPath`), with a `/login` fallback for unknown/missing roles.
- **P/§D (D17)** — `Faculty.jsx` cards navigate to the live `/faculty/:slug` detail PAGE; the unused `handleViewDetails` + modal are documented in-code as dead/superseded (not re-wired — that would change UX — and not deleted, per the deferred-deletion policy).
- **Q/§D (D21)** — contract tests pin `applyUnwrap` for all four shapes (`{data}` array with pagination, `{data}` object, bare array, bare object) + the `{settings}` envelope; the per-endpoint shapes are intentional and handled by their callers, so they are documented, NOT rewritten (no speculative global change).

Files changed — backend: `controllers/Admin/RoutineController.js` (publish/unpublish return status), `controllers/Admin/CourseController.js` (optional-field `''`→null on update), `controllers/Admin/ElearningVideoController.js` (publicIndex `!is_locked && isUnlocked`). Frontend services: `services/responseUnwrap.js` (invalidation helpers + CROSS_INVALIDATE extended), `services/api.js` (invalidateCache uses the pure helpers; strips query). Frontend pages/components: `pages/admin/{StudentManager,PaymentSettings,CourseManager,ExamManager,BatchManager,RoutineManager,LibraryManager,NoticeManager,EventManager,SuccessStoryManager,PaymentManager}.jsx`, `pages/student/{ELearning,StudentResults}.jsx`, `pages/{Gallery,Faculty,Admission}.jsx`, `components/common/Navbar.jsx`, `components/home/StatsSection.jsx`, `layouts/{AdminLayout,StudentLayout,TeacherLayout}.jsx`. Tests: `frontend/src/services/responseUnwrap.test.mjs` extended (contract shapes + I-10 invalidation).

Tests / commands + outcomes: `node --check` clean on the 3 edited backend controllers. Frontend `responseUnwrap` **14 pass / 0 fail** (9 prior + 5 new: bare array/object + {settings} contracts, `invalidationNamespace`, paginated-key invalidation, cross-invalidate). Backend regression batch (elearning-locked, grade-service, marks-validation, exam-result-service, exam-store-marks, teacher-marks-authorization) **23 pass / 0 fail** — confirms the C23 publicIndex change and nothing else broke. `eslint` on all 24 changed frontend files = **0 errors** (25 warnings, all pre-existing: unused lucide imports, exhaustive-deps, and the now-flagged dead `handleViewDetails`). Frontend `vite build` fails with the SAME pre-existing rollup `MODULE_NOT_FOUND` (Windows node_modules in the Linux sandbox) — unchanged, not a regression; re-verify the build on the Windows machine. No migration run; nothing committed/pushed/deployed; no password/secret logged.

Remaining risks / notes: (1) frontend components are verified by eslint + extracted-logic tests, NOT a running React app — ON-DEVICE CHECK list: PaymentSettings bank name loads/saves; StudentManager search by email/phone/ID returns matches across pages; Add Student shows a one-time password when none typed; the 4 admin course dropdowns list inactive courses too; category up/down persists after reload; a panel page crash recovers on navigation; the e-learning/gallery lightbox never leaves the page unscrollable; a locked `all` video isn't watchable; routine Publish/Unpublish flips the badge; Home student-count honours the admin override; after add/edit/delete the admin list refreshes immediately (incl page 2+); clearing a course's optional field persists; a failed delete shows an error; StudentResults/Admission show an error+Retry on load failure; the DASHBOARD button lands each role on its own panel. (2) N (load-error states) is only applied to the two named pages + the pattern documented; a full sweep is a recommended follow-up. (3) D21/Q contracts are pinned by tests and documented, not rewritten. New findings this phase: none.

Next recommended phase: **Phase 6 — delete-cascades + schema safety (migrations)** (H-del1–3, H-low2, H-low4, I-21), or remaining §D hygiene (D5, D6, D9, D14–D16, D18–D20, H-low5/7/9, I-dead), or the Decision Queue (C24, C25-followups, H-cfg1, J, E1/E2/E5/E6, D8). Do not start it until prompted.

---

## Phase 6 — execution (complete, 2026-10-11): relational integrity + migrations

Scope (A–I): H-del1, H-del2, H-del3, E1 (safety sub-fix), §H migration-007 slug collisions (H-low2), §H seeders (I-21), §H nullable attendance keys (G), §F repo hygiene, E1/E2 architecture decision doc. No destructive change; academic/financial history preserved; **no migration run against any DB**.

Policy applied — RETENTION OVER DELETION: a delete that would destroy academic history is BLOCKED with a clear message rather than silently cascading. Deletes that are safe run inside a single transaction.

Root causes + fixes:
- **H-del1** (`TeacherController.destroy`) — hard-deleted the teacher's User + hard-deleted profile/faculty/assignments while leaving authored `Assignment` (NOT-NULL `teacher_id`), `StudyMaterial`, exam marks, `Routine.updated_by`, `Attendance.leave_approved_by` pointing at a gone account. Now: if the teacher authored any Assignment / StudyMaterial / ExamResult, the delete is **blocked (409)** with a message to deactivate instead (history preserved). When there is none, the account + its links are removed in ONE transaction, and the nullable metadata stamps (`Routine.updated_by`, `Attendance.leave_approved_by`) are nulled so no row points at a deleted account.
- **H-del2** (`BatchController.destroy`, `CourseController.destroy`) — both deleted assignment/submission FILES and the parent rows but left `AssignmentSubmission` ROWS orphaned (dangling `assignment_id`) — destroying student work. Now each **blocks (409)** when any `AssignmentSubmission` (and, for a course, any `ExamResult`) exists; only a batch/course with no academic history is deletable, and then submissions are removed explicitly inside the transaction (defensive against a race).
- **H-del3** — the course/batch/teacher cascades are now wrapped in `sequelize.transaction`; a failure part-way rolls back every related delete (no partial destruction). Non-transactional media (file) cleanup runs only AFTER the DB commit.
- **E1 safety sub-fix** (`FacultyManagementController.destroy`) — removing a PUBLIC Faculty card hard-deleted the linked teacher's User account, TeacherProfile, and batch assignments. It now ONLY soft-deletes the Faculty card (Faculty is paranoid → restorable); the teacher account + academic records are retained. (Authorized narrow fix; `Faculty`/`TeacherProfile` NOT merged.)
- **§H migration 007** (`H-low2`) — slug backfill deduped only against same-run values, so a generated slug could collide with a slug ALREADY in the table and make the unique-index creation fail on a non-pristine DB/rerun. Extracted a pure `resolveSlugs(existingSlugs, rows)` that seeds the used-set with EVERY existing slug first, then assigns deterministic `-2/-3…` suffixes; the migration loads existing slugs before backfilling. Idempotent; logs counts only (no names/slugs).
- **§H seeders** (`I-21`) — `category_id: 1/4` hardcoded the auto-increment id (wrong/missing on a non-pristine DB). Now resolves the category id by its stable `slug` (`science-group`, `language`) after the categories are ensured; `findOrCreate`/`ignoreDuplicates` keep reruns safe.
- **§H nullable attendance keys** (G) — CONFIRMED (from Phase 4) that `002-attendance-dedupe.mjs` already backfills NULL `session`/`batch_id`, dedupes (keep lowest id, reconciliation not fail-on-dup) and adds the unique index. NO new attendance migration — not duplicated.

### §F — repository hygiene (inspected; NO files executed/deleted/committed)
- Untracked, NON-git-ignored scratch files present in the working tree: `backend/smoke-harddel.mjs`, `backend/tmp-cleanup.mjs`, `tmp-dbcheck.mjs`, `tmp-examresult-test.mjs`, `tmp-livetest.mjs`, `tmp-livetest2.mjs`, `tmp-results.cjs`, `tmp-sec2-test.mjs`, `tmp-sec6-migration-test.mjs`, and the repo-root `Start SpiderFoot.bat` (an unrelated OSINT tool launcher — NOT executed). None are tracked by git; none are ignored, so a careless `git add .` would stage them. RECOMMENDATION (for the user to action — not done automatically): review and delete the throwaway `tmp-*`/`smoke-*` scripts (the `tmp-sec2/sec6` ones relate to this project's SEC verification and may be worth keeping locally), remove `Start SpiderFoot.bat` from the repo if unintended, and/or add `backend/tmp-*`, `backend/smoke-*.mjs`, `*.bat` to `.gitignore`. Not modified here because the user asked to confirm intent first.
- Secret hygiene CONFIRMED: `backend/.env.staging` is git-ignored (`git check-ignore` → ignored via `.env*`/`.env.*`), while `.env.staging.example` is intentionally un-ignored (negation). No secret was staged or printed.

### E1 / E2 — architecture decision (DOCUMENTED; no change made beyond the E1 safety sub-fix)
- **Source-of-truth conflict:** a teacher exists as a `User` (role teacher) + `TeacherProfile` (account/academic side) AND, optionally, a public `Faculty` card linked by nullable `Faculty.user_id`. They are independent stores kept loosely in sync by `TeacherController`. Separately, `Faculty` keeps qualifications/achievements/certifications/social-links in JSON columns (authoritative, read+written), while the parallel child tables `FacultyQualification/Achievement/Certification/SocialLink` (+ `FacultyGallery`) exist (migration 001) but are NEVER written/read — dead, orphaned schema.
- **Risks of “fixing” it now:** merging `Faculty`↔`TeacherProfile`, or migrating JSON→child tables, or starting to write the dead tables, would touch the public faculty pages, the teacher admin flow, and require a data migration with real backfill + a cutover — high blast radius, needs product decisions (which store wins, what the public card shows vs the account).
- **Recommendation:** keep JSON as the authoritative faculty-detail store; treat the child tables as dead and (separately, with approval) DROP them in a dedicated migration after confirming no reader exists; keep `Faculty` and `TeacherProfile` as distinct models with the E1 safety boundary now in place (card delete ≠ account delete). Do NOT merge. This remains **Blocked—decision needed** for anything beyond the shipped E1 safety sub-fix.

Files changed — backend: `controllers/Admin/TeacherController.js` (block-or-atomic delete + null metadata), `controllers/Admin/BatchController.js` + `controllers/Admin/CourseController.js` (block-when-history + transactional cascade + submission rows removed), `controllers/Admin/FacultyManagementController.js` (card-only delete), `migrations/007-success-story-slugs.mjs` (exported `slugify`/`resolveSlugs`; collision-safe backfill), `seeders/run.js` (category-by-slug). New tests: `tests/{slug-dedupe,teacher-delete,batch-course-delete,faculty-delete}.test.mjs`.

Tests / commands + outcomes: `node --check` clean on all 6 edited backend files. New Phase-6 tests **12 pass / 0 fail** (slug-dedupe 5, teacher-delete 2, batch-course-delete 4, faculty-delete 1 — covering: block on authored content, atomic delete when none, block on student submissions / exam marks, atomic cascade when none, Faculty-card delete preserving the teacher account, slug collisions vs existing+same-run, rerun idempotency). Regression batches: **42 pure pass** + **33 model pass** (faculty-concurrency, payment-store, admin-attendance, exam-store-marks, protected-file-access, teacher-marks-authorization) — no regressions. Backend total now **130 tests across 34 files**. No migration run on any DB; nothing committed/pushed/deployed; no secret printed.

Remaining risks / notes: (1) transaction rollback is verified by the `sequelize.transaction(cb)` stub pattern (cb executed, throws propagate), not a live DB — re-verify on a disposable local DB before relying on it in prod; (2) the retention policy makes a batch/course/teacher with academic history NON-deletable by design — a dedicated "archive/deactivate" flow is the recommended richer alternative (future phase); (3) migration 007's collision logic is unit-tested as a pure function; run the migration itself only on a disposable/test DB. New findings this phase: none.

Next recommended phase: remaining §D hygiene (D5, D6, D9, D14–D16, D18–D20, H-low4/5/7/9, I-dead), or Phase 2b (payments), or the Decision Queue (C24, C25-followups, H-cfg1, J, E2/E5/E6, D8, + the §F scratch-file cleanup confirmation). Do not start until prompted.

---

## Phase 7 — execution (complete, 2026-10-11): remaining low-severity bugs + code smells

Scope (items 1–25). Each verified present before editing; tracked by ID. Not a broad refactor — small, localized fixes with focused tests.

Fixed—tests pass / Fixed:
- **1/C13** — `RoutineController` status counts build the `where` conditionally (no `batch_id: undefined`); `saveAll` only filters by `shift` when supplied.
- **2/D5 (=I-22)** — new pure `services/routineTime.js` `parseTimeSlot` derives `start_time`/`end_time` from the `time_slot` label (range split, else label as both bounds, never null); `store`/`saveAll`/`update` populate them so the unique index + `myRoutine` sort are meaningful. Migration `015-routine-time-backfill.mjs` prepared (NOT run) to backfill existing null rows.
- **3/D6** — `Routine.store` + `update` use an explicit `ROUTINE_WRITABLE` allowlist instead of `{ ...req.body }`.
- **4/D14** — `CourseController.store` returns 400 on a missing title (no more `makeSlug(undefined)` 500).
- **5/D15** — `Public/CourseController.show` uses `findOne({ where: { id, is_active: true } })` so the active filter actually applies (findByPk ignored it). Route wiring: `show` is NOT currently mounted in `routes/public.js` (bySlug is used); the fix removes the latent leak if it is ever routed. Regression test asserts findOne + the active filter.
- **6/D16** — `SuccessStory.store` trims `student_name`/`story` ONCE and uses the same values for the duplicate check AND persistence (whitespace can no longer slip a duplicate past the guard).
- **7/D10** — the three leave-notification deep links now point to `/student/attendance-report` (route verified in AppRoutes); no `/student/attendance` deep link remains in any controller.
- **9/D9** — `EmailService.composeEmail` escapes `body`/`actionLabel` (`escapeHtml`) and only emits an action button for an http(s)/site-relative URL (`safeActionUrl` rejects `javascript:`/`data:`/protocol-relative); admission/other flows unchanged.
- **25** — the dead `sendToRaw` alias (zero references) removed from the EmailService default export; `sendRaw` kept.
- **10/D8** — SMS config resolved PER CALL (not frozen at import); the request URL (legacy query creds) is never logged (documented, recommend SMS Plus v3); new pure `services/sms/smsEncoding.js` gives encoding-aware (UCS-2 70 / GSM-7 160) grapheme-safe truncation; confirmed `stripEmojis` leaves Bangla intact (tested).
- **12/D18** — `app.js` tracks a `dbReady` flag so the boot DB failure is no longer swallowed and the `/api` 503 branch is truthful; only `err.message` is logged (no connection string).
- **13/D20** — structured `console.error('<Controller> error:', error.message)` added to the three silent controllers (ContactMessage/CourseCategory/PaymentSetting); PaymentSetting logs message-only to avoid leaking the encrypted store_password in SQL params. A request/correlation-ID middleware is recommended as a future, non-refactor follow-up.
- **14/D19** — `config/auth.js` derives the cookie `maxAge` from a parsed `JWT_EXPIRES_IN` (`expiresInToMs`, validated, 30d default) so cookie + token expiry can't diverge.
- **15/H-low5** — `PaymentController.index` escapes `%`/`_`/`\` in the literal LIKE search (still parameterized).
- **16/H-low4** — `middleware/upload.js` allowlists are ANCHORED (ext + exact mime), rejecting spoofed `.notpng`/`.jpg.exe`/wrong-mime pairs; txt/csv remain ext-only (inert text, served with nosniff + file CSP) — documented.
- **17/H-low7** — `sw.js` cache bumped to `v2` (+ per-release bump note); install uses per-asset `allSettled` so one missing optional asset can't block the whole SW; API/media never cached (unchanged).
- **18/H-low9** — sitemap canonical base URL now from `SITE_URL`/`FRONTEND_URL` config; CSP `connect-src` is a deploy-side setting (static `vercel.json`) — documented to include the API origin if the backend deploys separately (ties to H-cfg1).

Cross-phase verification (items 8, 11, 19, 20, 21, 22 — confirmed OWNED elsewhere, NOT re-implemented here):
- **8** Faculty details modal → owned by Phase 5b (D17: documented dead; superseded by `/faculty/:slug`). No duplicate change.
- **11** notification request path (slow external calls blocking redirects) → owned by Phase 2b (D7 / §I); deferred there with the gateway/serverless-timing pass. No duplicate.
- **19** legacy teacher-marks validation → owned by Phase 5 (I-14: both teacher paths reject out-of-range via `marksValidation`). Not fixed twice; route not retired here.
- **20** course optional fields → owned by Phase 5b (I-16). No duplicate.
- **21** API response shapes → owned by Phase 5b (D21: contracts pinned by tests, documented). No duplicate.
- **22** I-13/I-14/I-15/I-18 → Phase 5; I-19 → Phase 4; I-20 → Phase 2 — all already Fixed by their owning phase. This was a verification check only.

### 23 — npm audit (COULD NOT RUN; not a clean bill of health)
- Exact result: `npm audit` fails in this sandbox — `npm warn audit 403 Forbidden ... Connection blocked by network allowlist; npm error audit endpoint returned an error` (exit 1). A lockfile IS present (`backend/package-lock.json`), so the audit WILL run in a networked environment. **Do not interpret this as "no vulnerabilities."**
- `multer@1.4.5-lts.1`: the 1.x line has known DoS advisories (unhandled errors on malformed multipart input); the patched line is `multer@2.x`, a BREAKING major (changed error/file handling API). Recommendation: run `npm audit` locally, then evaluate the 2.x upgrade behind a reviewed diff + the upload tests (H-low4) + an end-to-end upload smoke on a real build — do NOT blindly upgrade or rewrite the lockfile. BLOCKED pending a networked run.

### 24 — dead/unused review (confirmed by search; NOTHING deleted — E6 deferred, needs approval)
- Zero-reference (safe to delete WITH approval): `NotificationDot.jsx` (no importers; the LIVE bubble is NotificationBadge/Bell/Dropdown — keep those), `App.css` (no import), `frontend/generate-ico.cjs` (broken, jimp missing — H-low8), unused faculty fields `linkedin_url`/`whatsapp_number` (no frontend refs).
- Others named (gallery caption/thumbnail, dashboard duplicate keys, legacy `course.category`/`sorting_order`, `/student/payments` camelCase duplicates, unused ContactMessages params): documented as low-impact dead/duplicate; removing any touches the public API or user-facing data shape → confirm + approve first. No files deleted, no public API changed.

Files changed — backend: `controllers/Admin/RoutineController.js`, `controllers/Admin/CourseController.js`, `controllers/Public/CourseController.js`, `controllers/Admin/SuccessStoryController.js`, `controllers/Admin/AttendanceController.js` (D10 URL), `controllers/Admin/PaymentController.js` (LIKE escape), `controllers/Admin/PaymentSettingController.js` + `CourseCategoryController.js` + `ContactMessageController.js` (logging), `services/email/EmailService.js`, `services/sms/SmsService.js`, `config/auth.js`, `app.js` (D18 + sitemap), `middleware/upload.js`. New backend: `services/routineTime.js`, `services/sms/smsEncoding.js`, `migrations/015-routine-time-backfill.mjs` (NOT run). Frontend: `public/sw.js`. New tests: `tests/{phase7-pure,email-compose,course-validation}.test.mjs`.

Tests / commands + outcomes: `node --check` clean on all edited backend files + migration 015. New Phase-7 tests **12 pass / 0 fail** (phase7-pure 6: parseTimeSlot, SMS encoding/Bangla, anchored upload, cookie-duration; email-compose 4: escape/safe-url/compose; course-validation 2: title 400 + public show findOne). Regression: **48 pure pass** + **24 model pass** (auth-login, payment-store, admin-attendance, teacher-marks-authorization, email-compose, course-validation) — no regressions. Backend total now **142 tests across 37 files**. `npm audit` could NOT run (network-blocked — see item 23). Frontend `vite build` still env-blocked (Windows rollup; unchanged). No migration run; nothing committed/pushed/deployed; no secret/credential/PII logged.

Remaining risks / notes: (1) SMS live-toggle: config is now read per-call from env — if an admin DB toggle for SMS is desired (like email_enabled), it plugs into `getSmsConfig()` (noted). (2) H-low9 CSP `connect-src` can't be env-driven in static `vercel.json`; if the API is a separate origin it must be added there (ties to the H-cfg1 decision). (3) migration 015 is prepared, run on a disposable/test DB first. (4) items 23 (npm audit) + 24 (dead-file deletion, E6) remain open pending a networked run / user approval. New findings this phase: none.

Next recommended phase: Phase 2b (payment gateway timing), or the Decision Queue (C24 shared rate-limit store, C25 signed-token on-device verification, H-cfg1 Vercel topology, J localStorage/CSRF, E2 dead faculty tables, E5 password-delivery, E6 + §F file cleanup, D8 SMS provider, multer upgrade). Do not start until prompted.

---

## Phase 8 — final decision / reconciliation (2026-10-11): NO code changes

This phase made **no source edits** — only tracker reconciliation + this decision memo. No commits, pushes, or deploys. Verification matrix re-run and reported to the user.

### 8.1 Decision-queue reconciliation (stale cells corrected)
The §E table above had cells left at "Blocked—decision needed" that later phases had actually resolved. Corrected this phase:
- **C25 / H-sec4** → signed download tokens were **implemented in Phase 3** (backend tested; frontend on-device check still pending). Was stale "Blocked".
- **H-sec3** → **Fixed in Phase 3** (in-app `securityHeaders` middleware). Was stale "Blocked".
- **D8** → **Fixed in Phase 7** (per-call SMS config + Bangla-safe encoding + URL redaction). Was stale "Blocked".
- **H-low6 / CSRF (= item J)** split out of the C25 cell: still a documented decision, NOT implemented.
- **I-dead** (§I table) → moved from "Not started" to "Reviewed—documented" (Phase 7 item 24; deletion deferred to E6).

Everything else in §E (E1 safety-done/merge-deferred, E2 blocked, E3 unified+legacy-kept, E4 fixed, E5 blocked, E6 blocked, C24 blocked, H-cfg1 blocked) was already current.

### 8.2 Decision memo — architectural items needing YOUR approval

Each item below is written as: **what it is → risk of acting silently → recommended option → what I did/didn't do**. None of these were decided or changed silently.

**E1 — TeacherProfile vs Faculty duplication**
Two models describe the same people: `TeacherProfile` (the login account / teacher data) and `Faculty` (the public "our teachers" card). The audit flagged that `FacultyManagementController.destroy` hard-deleted the underlying teacher *User* when you deleted a public card.
- Done now (safe, authorized sub-fix): card delete removes only the Faculty card, never the teacher account (tested, `faculty-delete.test.mjs`).
- Deferred (needs approval): fully merging the two models into one. That is a schema + UI migration touching login, the admin teacher manager, and the public page — too large to do silently.
- Recommendation: keep them separate for now; revisit only if the duplication causes real data-sync pain.

**E2 — Faculty JSON vs orphaned child tables**
Faculty data is stored as JSON on the Faculty row, but there are also ~4 child tables (education/experience/etc.) plus a dead gallery write path that nothing reads. Nothing is broken; it's dead schema.
- Risk of acting silently: dropping tables is destructive and irreversible without a backup; "dead" must be confirmed against the live DB, not just the repo.
- Recommendation: keep JSON as authoritative; write a *forward-only* migration to drop the confirmed-dead tables **only after** you confirm on a DB snapshot that they hold no data you want. No change made.

**E3 — Two marks systems / legacy `/teacher/exams*`**
There were two code paths that computed grades. 
- Done now: grade/GPA/rank is **unified** — every path (teacher save, admin exam, result publish, recompute) goes through the one `ExamResultService`/`GradeService`. The legacy `/teacher/exams*` routes are **kept and tested** (not retired).
- Needs approval: actually *removing* the legacy routes. Recommendation: retire them in a dedicated pass once you confirm no client/bookmark still calls them; low urgency since they now share the canonical compute.

**E4 — Exam unpublish didn't clear `published_subjects`** 
Fixed (safe, tested): unpublishing an exam now clears `published_subjects` so a later re-publish can't leak a stale subject set. Marks themselves are preserved. No open decision.

**E5 — Plaintext generated student password emailed on approval** (SEC-3)
When an admission is approved, the system generates a password and emails it to the student in plaintext. This is the single most sensitive open item.
- Risk: plaintext credentials sit in the student's inbox (and any mail-provider logs) indefinitely; if the mailbox is later compromised, the account is too. Emailing passwords is an industry anti-pattern.
- Risk of acting silently: changing credential delivery changes the student's first-login experience and the admin flow — must not be swapped without your sign-off.
- Recommended migration (needs approval): replace the plaintext password with a **one-time setup/reset link** (short-lived, single-use token → student sets their own password). Keeps the same "approved → you can log in" UX without a reusable secret in email.
- What I did: left the current behavior intact and documented the risk + the migration path. No change made.

**E6 — Delete confirmed-unused files**
Zero-reference files found: `NotificationDot.jsx`, `App.css`, `frontend/generate-ico.cjs` (broken — jimp missing). You previously said to KEEP the live notification code (NotificationBadge/Bell/Dropdown) — those are untouched; `NotificationDot.jsx` is a *different*, unused file.
- Recommendation: safe to delete the three with your OK; harmless to keep.
- What I did: nothing deleted (deletion needs your approval per the Master Prompt). Also covers the other "dead/duplicate" fields in `I-dead` (gallery caption/thumbnail, dashboard dup keys, legacy `course.category`/`sorting_order`, payment camelCase dupes, unused faculty `linkedin_url`/`whatsapp_number`) — all documented, none removed because several touch the public API/data shape.

**E7 / C24 — Shared rate-limit store**
Rate limiting currently uses an in-memory store. On Vercel serverless, each cold instance has its own memory, so the limit is per-instance, not global — weaker protection under scale.
- Risk of acting silently: a real shared store means picking paid/managed infra (Upstash/Redis) or a Postgres table — an infra + cost decision that's yours.
- What I did: centralized the limiter and left it configurable; added a boot-time warning on serverless; marked **blocked** pending your infra choice. Recommendation: a Postgres-backed limiter reuses your existing Neon DB (no new vendor) if you want shared limits without new cost.

**C25 — Signed download tokens (on-device verification)**
Implemented in Phase 3: long-lived JWTs are no longer placed in `?token=` download URLs; downloads use short-lived (30-min), file-scoped HMAC tokens. Backend is fully unit-tested. 
- Still needed from you: an **on-device/browser verification** that the frontend wiring (StudentProfile / StudentDocumentsTab passing `download_token`) works end-to-end against a real build — there's no React test harness here to prove it. Marked "fixed, frontend verification pending".

**H-cfg1 — Which project deploys production (Vercel routing)**
`vercel.json` uses a "services" framework layout. I could NOT verify from the repo alone which Vercel project is wired to your production domain, or whether the API deploys same-origin or as a separate origin.
- Why it matters: it determines (a) whether the browser-facing **CSP `connect-src`** must list a separate API origin, and (b) whether cookie `SameSite`/`Secure` settings are correct for cross-origin.
- What I did: no change to `vercel.json`. In-app security headers were added (H-sec3); the HTML/CSP layer stays deploy-side by design. **Blocked** on your confirmation of the deploy topology. Recommendation: tell me "API is same-origin" or "API is `api.<domain>` separate" and I'll finalize the CSP + cookie flags.

**J — localStorage JWT + CSRF** (H-low6 / H-low11)
The token is currently also kept in `localStorage` (readable by any injected script = XSS blast-radius) alongside the HttpOnly cookie.
- Risk of acting silently: moving to cookie-only auth changes how the SPA attaches the token and introduces the need for **CSRF protection** (cookies auto-send; you'd need a CSRF token or strict `SameSite`). Removing localStorage without tracing every reader would break silent logins.
- What I did: traced the usage, documented the plan, made NO change. Recommended end-state: cookie-only (HttpOnly, `SameSite=Lax`/`Strict`, `Secure`) + a CSRF token for state-changing requests. This pairs with the H-cfg1 topology answer (same-origin makes `SameSite` sufficient; cross-origin needs more care). **Blocked** on your go-ahead because it's an auth change.

### 8.3 Verification matrix (re-run this phase, vs Phase 0 baseline)

| Check | Command | Result | vs baseline |
|---|---|---|---|
| Backend tests | `JWT_SECRET=x DATABASE_URL='postgresql://u:p@127.0.0.1:1/nodb' node --test --test-force-exit tests/*.mjs` (in batches) | **142 pass / 0 fail** (37 files) | +142 (no runner existed at baseline; all green) |
| Frontend unit | `node --test` on extracted pure logic (responseUnwrap) | **14 pass / 0 fail** | no change |
| Lint (frontend) | `npm run lint` | 0 errors / 74 warnings | **= baseline** (same 74 pre-existing warnings) |
| Build (frontend) | `npm run build` (vite) | **FAIL** — `Cannot find module @rollup/rollup-linux-x64-gnu` | **= baseline** (pre-existing env issue: Windows `node_modules` under Linux sandbox; NOT a regression) |
| Migrations syntax | `node --check backend/migrations/*.mjs` | all **15 clean** | n/a |
| npm audit | `npm audit` | **FAIL** — `403 ... blocked by network allowlist` | **= baseline** (sandbox has no registry network; lockfile present so it runs in CI) |
| Git state | `git status` / `git rev-parse HEAD` | HEAD `beea9c1` unchanged; nothing staged | no commit/push/deploy |

**New failures introduced by this work: NONE.** The only failing checks (vite build, npm audit) fail for the same environmental reasons they failed at Phase 0 — not because of any change in this effort.

### 8.4 Migrations created across all phases (none run on any DB)
- `007-success-story-slugs.mjs` — edited (collision-safe `resolveSlugs`); pure logic unit-tested (`slug-dedupe.test.mjs`).
- `013-*`, `014-*` (earlier phases), `015-routine-time-backfill.mjs` — **prepared, NOT run**. Validated only by `node --check` + pure-function unit tests. Run each on a **disposable/local/test DB first**; never on production.

### 8.5 Blocked / deployment-dependent (cannot be closed from inside the sandbox)
1. **H-cfg1** — Vercel prod topology (your confirmation).
2. **C24 / E7** — shared rate-limit store (infra choice).
3. **C25** — signed-token frontend on-device verification (needs a real build + browser).
4. **J** — localStorage→cookie-only + CSRF (auth change, your go-ahead; depends on H-cfg1).
5. **npm audit** — must run in a networked env; **not** a clean bill until it does.
6. **multer@1.4.5-lts.1 → 2.x** — breaking upgrade; evaluate behind a reviewed diff + upload smoke.
7. **E2 / E5 / E6** — dead faculty tables / password-delivery / dead-file deletion (your approval).
8. **§F** — `.env.staging` must stay git-ignored; `Start SpiderFoot.bat` + scratch files reviewed, NOT executed/deleted.
9. **Phase 2b** — C6/D7/§I payment-gateway timing (needs mocked gateway + serverless-timing design).

### 8.6 Manual staging test steps (staging is UNAVAILABLE in this sandbox)
No network to Neon and `.env.staging` is not present here, so I could not run the staging preflight/smoke. The repo's `uttoron-new` staging Neon project + preflight tooling exist (see `project_uttoron_security_staging` memory). To verify safely on your machine, **without charging a real payment, sending real bulk SMS/email, or touching production data**:

1. **Checkout + install** on a branch (do NOT deploy): `npm ci` in `backend/` and `frontend/`.
2. **Point at staging, not prod**: use `.env.staging` (staging Neon `DATABASE_URL`, staging JWT secret). Confirm it is NOT the production DB URL. Keep `.env*` git-ignored (verify `git check-ignore .env.staging`).
3. **Run migrations on staging only**: `node backend/migrations/run.js` against the staging DB. Confirm 007/013/014/015 apply cleanly and are idempotent on a 2nd run.
4. **Backend up**: `npm start` in `backend/`; hit `/api/health` (or `/api`) — expect 200 only after DB connects (D18 `dbReady`).
5. **Build the frontend in a real env** (this is where the rollup error won't occur): `npm run build` in `frontend/` — this is the real check for C25 frontend wiring + general build health.
6. **Smoke, read-only / sandbox-safe**:
   - Payments: use the gateway **sandbox** credentials only; do a test transaction in SSLCommerz sandbox — never live keys.
   - SMS/email: set the provider to **test/sandbox mode or a single whitelisted number/your own address**; do NOT trigger a bulk send.
   - Downloads: log in as a test student, open a protected material → confirm the signed-token URL works and expires (~30 min).
   - Auth: confirm login sets the HttpOnly cookie and protected routes work.
7. **Never**: run against the production `DATABASE_URL`, print `.env` contents, or commit `.env.staging`.

### 8.7 Status summary
Phases 1–7 complete; Phase 8 is reconciliation + decisions only. Fixed-and-tested items span admission, payments, access control, attendance/leave, academic computation, frontend contracts, relational integrity, and low-severity hygiene. **Open items remain** — all are either deployment-dependent, infra/product decisions, or need your explicit approval (listed in 8.5). This is NOT an "all fixed" state while those decisions are open.

---

## Phase 9 — execution (complete, 2026-10-11): user-APPROVED architectural changes

The user explicitly approved these previously-blocked items (H-cfg1 same-origin, E5, J, C24, E2, E6). Worked them with evidence + regression tests; nothing committed/pushed/deployed; migrations prepared but NOT run on any DB.

### H-cfg1 — confirmed SAME-ORIGIN (evidence)
`vercel.json` is one project routing `/api/*`→backend, everything else→frontend, under a single domain; `frontend/src/services/config.js` defaults the API base to the relative `/api`; `vercel.json` CSP sets `connect-src 'self'` (a cross-origin API would be blocked by it). Conclusion: production is same-origin. All of J below is finalized on that basis. ⚠️ If prod actually sets `VITE_API_URL` to a cross-origin API, the auth cookie `SameSite`, CORS, and CSP `connect-src` must be revisited.

### E6 — deleted 3 confirmed-dead files
Removed `frontend/src/components/notifications/NotificationDot.jsx` (zero importers; the live bubble is NotificationBadge/Bell/Dropdown — untouched), `frontend/src/App.css` (no import), `frontend/generate-ico.cjs` (broken helper, no refs). Verified zero references first; frontend lint still **0 errors / 74 warnings**.

### C24 — shared Postgres rate-limit store (opt-in)
New `backend/services/rateLimitStore.js`: a custom express-rate-limit `Store` backed by a `rate_limits` table via the existing Sequelize/Neon connection — **no new dependency, no new paid vendor**. Wired into the abuse-sensitive limiters (login/admission/contact/set-password) in `routes/public.js`; the coarse global limiter stays in-memory on purpose (avoids a DB write per request). Opt-in via `RATE_LIMIT_STORE=postgres`; **fail-open** (DB error ⇒ request allowed, logged once) so a DB hiccup can't lock everyone out. Migration `016-rate-limit-store.mjs` creates the table (additive, reversible; **NOT run**). Documented in `.env.example`.

### E5 — one-time setup link replaces plaintext password email
New `backend/services/passwordSetupToken.js`: a stateless HMAC token = `base64url(userId.exp).base64url(HMAC)` where the HMAC key is derived from `JWT_SECRET` **and the account's current bcrypt hash** — so the link self-invalidates the instant the student sets a password (single-use) and also expires in 48h. **No DB column / migration.** On approval, `AdmissionService` now stores an unknown random password and emails a `/set-password?token=…` link (never a plaintext password); an admin-supplied password instead gets a neutral "log in" email (shared out-of-band, never emailed). New public endpoint `POST /api/set-password` (`AuthController.setPassword`, rate-limited) validates the token against the current hash, sets the chosen password, and bumps `token_version` (revokes old sessions). New frontend page `frontend/src/pages/SetPassword.jsx` + route `/set-password` (matches the Login page's visual language). **NEW-001** (found + fixed here): the admission-approve response was serializing the raw `User` instance (leaking the bcrypt hash + token_version) — now sanitized via `toSafeApprovedUser`.

### J (H-low6 / H-low11) — cookie-only auth + CSRF
Frontend no longer stores the JWT in `localStorage`: `AuthContext` keeps only the non-secret `USER` profile and a presence flag (the HttpOnly cookie, sent via `withCredentials`, authenticates); `services/api.js` dropped the `Authorization: Bearer` injection and now attaches an `X-CSRF-Token` header (read from the readable `uttoron_csrf` cookie) on unsafe methods; the per-user GET-cache is namespaced by USER id instead of the token; 401 clears USER. New `backend/middleware/csrf.js`: issues the readable csrf cookie and enforces a **double-submit** check on unsafe methods, but ONLY for cookie-authenticated requests — safe methods, Bearer API clients, and unauthenticated public/callback posts are exempt, and `/api/public/admissions/action` (a native email-action form already protected by its own signed, action-bound JWT) is explicitly exempt so a logged-in admin's form POST isn't blocked. Same-origin `SameSite=Lax` on the auth cookie is unchanged (defence-in-depth). **Frontend behaviour needs an on-device/browser check** (no React harness here).

### E2 — retire 4 orphaned faculty child tables
Evidence: `FacultyQualification/Achievement/Certification/SocialLink` are written nowhere and read nowhere — their data is superseded by JSON columns on `Faculty`; the only references were dead `.destroy()` cleanup calls. Removed those calls, removed the 4 models from `models/index.js`, deleted the 4 model files, and prepared migration `017-drop-orphan-faculty-tables.mjs` (guarded drop; `down()` recreates structure). `FacultyGallery` (read on the public profile) and the `FacultySubject`/`FacultyBatch` join tables are **kept**. ⚠️ DESTRUCTIVE migration — **NOT run**; deploy the code first, then run 017 on a **backed-up** DB after confirming the tables hold nothing still needed.

### Files changed — Phase 9
Backend (modified): `app.js` (csrf wire + rate-limit store import/warn), `routes/public.js` (shared store on limiters + `/set-password` route), `controllers/Auth/AuthController.js` (`setPassword`), `services/AdmissionService.js` (setup link, no plaintext), `controllers/Admin/AdmissionManagerController.js` (`toSafeApprovedUser`, NEW-001), `controllers/Admin/FacultyManagementController.js` (drop dead destroy calls), `models/index.js` (remove 4 models), `.env.example` (RATE_LIMIT_STORE/CSRF docs). Backend (new): `middleware/csrf.js`, `services/rateLimitStore.js`, `services/passwordSetupToken.js`, `migrations/016-rate-limit-store.mjs`, `migrations/017-drop-orphan-faculty-tables.mjs`. Backend (deleted): `models/Faculty{Qualification,Achievement,Certification,SocialLink}.js`. Frontend (modified): `context/AuthContext.jsx`, `services/api.js`, `routes/AppRoutes.jsx` (+`/set-password`). Frontend (new): `pages/SetPassword.jsx`. Frontend (deleted): `components/notifications/NotificationDot.jsx`, `App.css`, `generate-ico.cjs`. Tests (new): `tests/phase9-pure.test.mjs`, `tests/set-password.test.mjs`.

### Tests / commands + outcomes — Phase 9
`node --check` clean on all edited/new backend files + all 17 migrations. New tests **16 pass / 0 fail** (phase9-pure 11: CSRF safe/Bearer/no-cookie/mismatch/match/exempt + setup-token sign-verify/single-use/expiry/tamper/decode; set-password 5: valid set + replay-blocked + 400s + NEW-001 sanitize + C24 factory/fail-open). Full regression: backend **158 pass / 0 fail across 39 files** (batches); frontend unit **14 pass**; frontend lint **0 errors / 74 warnings** (= baseline). `vite build` still env-blocked (Windows rollup — unchanged). `npm audit` still network-blocked. git **HEAD = beea9c1 unchanged**, 0 staged, no commit/push/deploy; no real `.env`/secret in the change set.

### Remaining risks / needed verification — Phase 9
(1) **Frontend on-device check** for J + E5 (cookie-only login/logout, CSRF on mutations, the `/set-password` page) — needs a real build + browser; no React harness here. (2) **Migrations 016 + 017 not run** — run on a disposable/backed-up DB first; 017 is destructive (deploy code first, then migrate). (3) **E5 email-delivery gap**: if the setup email fails to send, the new student has an unknown password and no link until an admin intervenes — recommend a "resend setup link"/forgot-password endpoint (trivial to add — reuse `passwordSetupToken`). (4) If prod is cross-origin (not same-origin), revisit cookie SameSite/CORS/CSP (H-cfg1 ⚠️). New findings this phase: **NEW-001** (approve response leaked the password hash — fixed + tested).

---

## Phase 2b — execution (complete, 2026-10-11): payment-gateway timing (C6, D7/§I)

User-approved. Scope: C6 (stale-pending reconciliation) + D7/§I (notification/redirect serverless timing). The deferred-reasons in the Phase 2 report are now resolved with a mocked-gateway test harness. Nothing committed/pushed/deployed.

### C6 — stale-pending reconciliation (validate-before-reclaim)
Root cause: a `Payment` row stuck at `status:'pending'` (gateway session created but no callback ever settled it — abandoned tab / lost callback) **locked its month forever**, because `initiate` treats any non-`due` row as already-charged. The old code only cleared `due` rows.
Fix (double-charge-safe): new exported `reconcileStalePendingForMonths` runs at the top of `initiate`. It groups the student's pending rows for the requested months by `trx_id`, and only for groups **older than `SSLC_PENDING_STALE_MINUTES` (default 30)** asks the gateway (server-to-server `validateWithGateway`, now also returning `valId`) what really happened — bounded by a timeout so a hung gateway can't stall the new payment. The pure decision `decideStalePending` returns:
- `settle` — gateway says VALID + amount matches → mark the rows **paid** (the money was taken; never re-charge);
- `reclaim` — gateway says a non-paid outcome (FAILED/EXPIRED/…) → delete the pending rows so the month can be retried;
- `keep` — still live, gateway unreachable, or VALID-but-amount-mismatch anomaly → do nothing (fail-safe).
A lost success callback therefore can never cause a double charge: reclaim happens ONLY on a positive non-paid confirmation.

### D7 / §I — notification/redirect serverless timing
Root cause: `NotificationService.create` awaits the slow external SMS **and** email dispatch; the payment `success` handler `await`ed it before `res.redirect`, so the student's post-payment redirect was blocked on two external API calls. Fix: a `withTimeout` wrapper bounds the user-facing paths (`success` redirect + the reconcile `settle`) to `PAYMENT_NOTIFY_BUDGET_MS` (default 3s) — the payment is already settled (critical work done) and the in-app notification write is fast; the slow SMS/email run best-effort. The **IPN** server-to-server path keeps the full `await` (no user waiting) as the reliable delivery backstop, and the existing idempotent `status!=='paid'` guard means IPN + success never double-notify.

### Files changed — Phase 2b
Backend (modified): `controllers/Student/SslCommerzController.js` — `validateWithGateway` returns `valId`; new `STALE_PENDING_MINUTES`/`decideStalePending`/`reconcileStalePendingForMonths` + `withTimeout`; `initiate` reconciles before locking; `success` bounds the notify. New: `tests/payment-reconcile.test.mjs`. (No model/migration/route change; `ipn` unchanged.)

### Tests / commands + outcomes — Phase 2b
`node --check` clean; backend boots (`import('./app.js')` OK). New `payment-reconcile.test.mjs` **10 pass / 0 fail** (decideStalePending: live/unreachable/settle/mismatch/reclaim×2; reconcile orchestration: settle-not-delete, reclaim-releases, live-untouched-&-gateway-not-queried, gateway-down-kept, no-op). Payment cluster regression (payment-store + payment-month + fee-breakdown) **23 pass**. Full backend now **168 tests / 0 fail across 40 files**. No commit/push/deploy.

### Remaining risks / notes — Phase 2b
(1) Reconcile + redirect use the live gateway validator in production — the unit tests inject a fake validator, so **verify once against the SSLCommerz sandbox** on staging (a stale pending that was really paid → settles; one that failed → releases). (2) `withTimeout` leaves the slow dispatch running best-effort on the redirect path; on Vercel it may be frozen after the response, but the IPN path is the reliable delivery channel. (3) Tunables via env: `SSLC_PENDING_STALE_MINUTES`, `PAYMENT_NOTIFY_BUDGET_MS`, `SSLC_VALIDATE_BUDGET_MS`. New findings this phase: none. Still open in the broader payment area: **I-5 / I-6 / C16** (frontend — no React harness) remain deferred/handled in 5b where applicable.

---

## Feature addition (beyond the audit) — biometric/fingerprint attendance-device integration (2026-10-11)

User-requested forward-looking feature (machine not purchased yet; built device-agnostic so any machine plugs in later). Chosen approach: a **local bridge agent** on an office PC reads the machine and POSTs to a secure cloud ingestion API (the Vercel app can't reach a LAN device directly). Scope: plug-and-play ready.

- **Ingestion:** `POST /api/integrations/attendance/punch` — device-key auth (`X-Device-Key` vs `ATTENDANCE_DEVICE_KEY`; **disabled/503 unless the key is set**, so never an open write endpoint). De-dupes on the unique (device_id, device_user_id, punched_at); maps `device_user_id`→student→Attendance; present/late by configurable Asia/Dhaka session windows (`ATTENDANCE_MORNING_START`/`EVENING_START`/`LATE_GRACE_MIN`). Idempotent on the Attendance (student,batch,date,session) unique key. Raw punches kept (source of truth) for later re-processing.
- **Admin:** `POST /enroll` (map a student↔device id) + `GET /punches?status=unmapped` (review).
- **Schema:** migration **018** — `Students.device_user_id` (nullable, unique) + `AttendancePunches` table (additive, reversible; **ran on staging**, pending on prod).
- **Files:** `middleware/deviceAuth.js`, `services/attendanceIngest.js` (pure classify), `controllers/Integration/AttendanceDeviceController.js`, `routes/integrations.js` (mounted in app.js), `models/AttendancePunch.js` + `Student.device_user_id` + index.js, `.env.example` keys. Sample agent `tools/attendance-agent/` + doc `docs/integrations/attendance-device.md`.
- **Tests:** `attendance-ingest-pure` (7: classifyPunch present/late/evening/date-rollover/invalid + deviceAuth disabled/wrong/right) + `attendance-device` (5: mapped-create, duplicate, unmapped, 400, enroll 200/404/409/400). Backend total now **180 pass / 42 files**. Backend boots (`import app.js` OK). CSRF middleware auto-exempts the device POST (no session cookie). Nothing committed/deployed.
- **Follow-ups:** wire a `device_user_id` field into the admin student-edit UI (currently settable via the enroll endpoint); fine-tune session/late rules when the real machine + schedule are known.







