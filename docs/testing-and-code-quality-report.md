# SmartPark – Automated Testing and Code Quality Report

**Team 2** · Prepared by Krish Patel · November 15, 2026
Tested branch: `krish-testing-quality` (based on `feature/live-parking-availability`, commit b16eeac)

## 1. Summary

The SmartPark front end is in good shape: after updating two outdated tests, all 114 automated front-end tests pass, line coverage is 99%, the production build succeeds, and there are no known dependency vulnerabilities. The main problem is in the Flask back end: the database setup script keeps only 16 of the 96 parking spots, so the spots API returns no spots for five of the six decks. This should be fixed before the front end switches from the CSV files to the API.

## 2. Scope and tools

| Area | What was checked | Tool |
|---|---|---|
| v2 front end (React) | Unit, component and full-flow tests; coverage | Vitest 5, React Testing Library, jsdom, @vitest/coverage-v8 |
| v1 front end | Parking logic unit tests | Node test runner |
| Flask back end | API tests, database seeding, direct API calls | pytest (`test_app.py`), Flask test client |
| Code quality | Linting, React Hooks rules, Python style and security | ESLint 9 + eslint-plugin-react / react-hooks, Ruff, Bandit |
| Build and dependencies | Production build, known vulnerabilities | Vite build, npm audit |

## 3. Test results

| Check | Result |
|---|---|
| v2 front-end tests | 114 / 114 passed (12 test files) |
| v1 tests | 7 / 7 passed |
| Back-end API tests (`test_app.py`) | 4 / 4 passed |
| Production build | Succeeded (JS bundle 243.7 kB, 75.7 kB gzipped) |
| npm audit | 0 vulnerabilities |

### Coverage (v2 front end)

| Statements | Branches | Functions | Lines |
|---|---|---|---|
| 99.31% | 91.89% | 99.20% | 99.09% |

### Tests updated and added

When testing started, 2 of 110 tests failed. Both came from the recent ParkingFlow update that added the "spot unavailable / alternative spots" screen. The app behaved correctly; the tests still described the old behavior.

- **ParkingFlow.test.jsx:** replaced the outdated test (which expected a disabled Continue button when the chosen spot was taken) with tests for the new unavailable screen.
- **App.test.jsx:** the full driver-flow test now reselects a spot after "Not here? Choose another spot", since that button now clears the selection.

New tests for the alternative-spots feature:

- When the chosen spot is taken, the unavailable screen appears, with same-floor alternatives listed first.
- The same happens if the spot is taken while on the confirm screen.
- Picking an alternative goes straight to the confirm screen with the right spot and level.
- "Choose another spot manually" returns to the picker with nothing selected.
- A clear message is shown when no other spot in the deck is free.

## 4. Code quality findings

| Severity | Finding | Location | Recommendation |
|---|---|---|---|
| **High** | The database keeps only 16 of 96 spots. Spot IDs such as 1A-01 repeat in every deck, but `spot_id` alone is the primary key, so each deck overwrites the previous one. Only deck D06's spots survive, and `/api/spots?deckId=D01` returns an empty list. The existing API tests do not check this. | `v2/backend/init_db.py` | Use a composite primary key `(deck_id, spot_id)` and update the ON CONFLICT clause. Add a test that each deck returns its spots. |
| **Medium** | Flask runs with `debug=True`, which enables the Werkzeug debugger and lets anyone who can reach the server run code (flagged by Bandit). | `v2/backend/app.py:86` | Read debug mode from an environment variable and keep it off by default. |
| Low | `node_modules` is committed to git in v1 and v2, causing large noisy commits. | `v1/`, `v2/` | Remove it from git and add it to `.gitignore`. |
| Low | Unreachable code: the `if (!ready)` check in the "Tap in" handler can never run because the button is disabled when no spot is ready. | `ParkingFlow.jsx:336–337` | Remove the dead branch. |
| Low | React Hooks lint warning: the effect's dependency array uses an expression (`[!spots]`). It works but is hard to read. | `useSpotAvailability.js:21` | Move the expression to a named variable. |
| Low | Missing newline at end of file (Ruff). | `init_db.py:142` | Add a trailing newline. |

Apart from the warnings above, ESLint reported no errors in v1 or v2.

## 5. Environment note

The test library jsdom 31 needs Node 22.22+ or 24.15+. On older Node versions (for example 22.9) every test file fails to start with an `ERR_REQUIRE_ESM` error. Upgrade Node (`nvm install 24`) or run the tests from the v2 folder with:

```
npx -y node@24 node_modules/vitest/vitest.mjs run
```

## 6. Next steps

1. Fix the database primary-key bug and add a per-deck API test.
2. Turn off Flask debug mode by default.
3. Remove `node_modules` from git.
4. Rerun this test and quality check after the database branches are merged.
