# SmartPark — Sprint 1 frontend starter

Implements Team-2 GitHub Issue #1: View Live Parking Availability using **simulated** parking occupancy. Not an official campus parking feed.

## Run locally

Install Node.js 22.12+ (or a compatible version supported by Vite 7). Then:

```bash
npm install
npm run dev
```

Open the local URL printed in the terminal (typically http://127.0.0.1:5173/).

## Test

```bash
npm test
npm run build
```

Manual checks: search a deck by name, expand details, check total and available spaces, verify three color states, observe an update after 30 seconds, and inspect North Deck's unavailable state.

## Architecture

- `public/data/parking.csv` — initial simulated data from the team's prepared CSV
- `src/utils/parkingLogic.js` — CSV mapping, availability/status rules, random occupancy simulation
- `src/hooks/useParkingAvailability.js` — load on mount, update state every 30 seconds
- `src/components/` — reusable visual components
- `src/App.jsx` — screen composition and search state
- `src/styles.css` — responsive styling based on planning document

All capacities/occupancy values are fictional. Green >=20% of total available, yellow >=5% and <20%, red <5%. Unavailable data is displayed as unavailable rather than a misleading number.

## Git workflow

Do not copy this project over teammates' existing work. Coordinate the starter commit on your feature branch and push incremental commits at meaningful milestones; review and merge via pull requests.

## AI use disclosure (edit before submission)

Initial application structure and code were generated with ChatGPT as a development aid based on the team's Copilot plan and design descriptions. The team must review, modify, test, and be able to explain the submitted code. Document actual Copilot usage and Figma MCP access truthfully; the MCP design-data permission error remains unresolved unless later fixed.


## Interactive prototype flow
Click **Choose deck** on a deck with available data -> choose a green demo spot A1–A6 -> **Continue** -> **Tap in** -> **Tap out** -> see session summary. These spot labels and sessions are illustrative only: the CSV tracks aggregate deck occupancy, **not individual spots**, and the frontend does not reserve real parking or connect to NFC hardware. The page reload resets the demo session.

The GitHub Issue #1 scope is the deck availability overview, calculations, status, error handling and updates. The additional tap-in/out flow is a visual interaction demo from later Figma screens, not a completed real parking service.
