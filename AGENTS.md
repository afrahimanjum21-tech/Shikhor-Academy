# Project Instructions

## Build & Deploy (CRITICAL)

- Frontend build runs in `frontend/`: `npm run build` (outputs to `frontend/dist/`).
- **Deploy MUST be a separate command, run from the repo ROOT**: `vercel deploy --prod --yes`.
- NEVER chain build and deploy in the same shell command, and NEVER run `vercel deploy` with
  workdir `frontend/` — the project framework there is set to "services" and the deploy fails with:
  `Project framework is set to "services", but no services are declared.`
- Correct sequence: (1) build in `frontend/`, (2) deploy from root.
