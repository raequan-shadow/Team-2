# SmartPark — Sprint 1

**Team 2 | ITSC 3155 Software Engineering**

SmartPark is a React-based parking availability prototype for UNC Charlotte commuters and faculty. It lets users compare campus parking decks, search by deck or location, and view estimated available spaces and availability status. The app uses **simulated CSV data**, not live university parking sensors or an official campus parking service.

This Sprint 1 implementation focuses on [GitHub Issue #1: View Live Parking Availability](https://github.com/raequan-shadow/Team-2/issues/1). The term “live” in this prototype refers to automatically refreshed **simulated** occupancy values.

## Requirements

- Node.js compatible with Vite 7 (Node.js 20.19+ or 22.12+)
- npm
- A modern web browser

## Install and run locally

Clone the [Team-2 repository](https://github.com/raequan-shadow/Team-2), or open an existing local clone in VS Code. From the repository root, open a terminal and run:

```bash
cd v2
npm install
npm run dev
```

Open the local URL Vite prints in the terminal (usually `http://localhost:5173/`; a different port may be used if that port is occupied).

> **Folder note:** The repository also contains `v1`, the earlier frontend starter. Use **`v2`** for the more recent interactive prototype. 

To stop the development server, press **Ctrl + C** in the terminal.

## Implemented functionality

### Parking availability overview — Sprint 1 / Issue #1

- View the campus parking decks in a searchable list.
- See each deck's total capacity and calculated available spaces.
- Calculate availability as **total capacity − occupied spaces**.
- Display an availability label based on the percentage of available spaces:
  - **Green / Available:** at least 20% of capacity is available.
  - **Yellow / Limited spaces:** at least 5% but less than 20% is available.
  - **Red / Almost full:** less than 5% is available.
- Automatically simulate occupancy changes about every **30 seconds** while the page is open, without requiring a browser refresh.
- Display an unavailable-data message rather than inventing an availability count when occupancy information is missing.
- Expand a deck card to view additional details.

### Nearby parking — Issue #4

- Open the **Nearby parking** tab and choose a destination building.
- Decks within an 800 m walk are listed closest first, with available spaces, distance and estimated walking time (80 m/min).
- Switch between **List** and **Map** views. Click a deck to open it, or use **Directions** to open Google Maps.
- If no nearby deck has space (try Harris Alumni Center), a message says so.

**Limitation:** building and deck coordinates are approximate, and distances are straight-line, not walking paths.

### Interactive driver flow — illustrative prototype only

The application also includes clickable screens based on later driver-flow designs:

1. Choose a deck.
2. Pick a level, then select a green spot in Section A or B (for example, 1A-02). Spot statuses refresh every 30 seconds.
3. Continue to the selected spot's instructions.
4. Use the simulated **Tap in** and **Tap out** actions.
5. View a simulated parking-session summary.

**Limitations:** Per-spot data comes from the simulated `public/data/spots.csv`, which covers all six decks (two levels, sections A/B, four sample spots each). A deck missing from that file shows an "individual-space data is unavailable" message. Spot statuses, parking sessions, and tap-in/tap-out actions are demonstrations only. They do not reserve a real space, track a real vehicle, access NFC hardware, or connect to campus systems. Reloading the page resets the local demo session.

## Simulated data and application structure

The application begins with parking occupancy records stored in a CSV file. JavaScript loads those records, calculates availability, and changes simulated occupied-space counts at timed intervals. Those updates happen in the running browser; **they do not rewrite the CSV file**.

Key files and folders in the React app include:

| Path (inside `v2/`) | Purpose |
| --- | --- |
| `public/data/parking.csv` | Starting simulated parking data |
| `public/data/spots.csv` | Simulated per-spot occupancy by deck, level and section |
| `src/utils/parkingLogic.js` | Data conversion, availability calculations, status rules, and simulated occupancy changes |
| `src/hooks/useParkingAvailability.js` | Data loading and automatic refresh |
| `src/components/` | Reusable interface elements and the interactive parking flow |
| `src/components/ParkingFlow.jsx` | Deck selection, spots by level and section, and simulated parking actions |
| `src/App.jsx` | Main application screens and state |
| `src/styles.css` | Responsive interface styling |

The data and labels are illustrative. They should not be used to make real parking decisions.

## Testing

From the `v2` directory, run:

```bash
npm test
npm run build
```

The first command runs the project's configured automated tests; the second checks whether the production build can be generated. **Run these commands in your local checkout and record their actual results** rather than assuming they pass.

### Manual acceptance-criteria checklist

- [ ] **All decks appear:** Open the homepage and verify that the expected deck cards are displayed.
- [ ] **Capacity and available spaces appear:** Verify both numbers on each deck with available occupancy data.
- [ ] **Availability calculation is correct:** For a known CSV row, confirm `capacity − occupied = available`.
- [ ] **Status colors are correct:** Check green, yellow, and red cases, including values near the 20% and 5% thresholds.
- [ ] **Automatic refresh works:** Leave the page open for at least 30–60 seconds and verify that the simulated update time or parking counts change without manually refreshing.
- [ ] **Unavailable data is handled:** Use an unavailable-data sample or test state and verify that a clear message appears instead of a misleading number.

### Additional interactive checks

- [ ] Search by a deck name or location and clear the search to restore the full list.
- [ ] Open and close a deck's details.
- [ ] Choose a deck, switch levels, and select a green spot.
- [ ] Complete the simulated tap-in/tap-out flow and return to the deck list.
- [ ] Open **Nearby parking**, choose Atkins Library, switch to Map, and open a deck from the map.
- [ ] Check that the layout is usable on both narrow and wide screens.

## Collaboration and Git workflow

Team members start from the shared working prototype, create their **own branches**, make meaningful incremental commits, and test locally. When a contribution is ready, its author pushes their branch and opens a pull request targeting the agreed integration branch. Teammates review and test before merging.

Our repository : the working prototype is on  `feature/live-parking-availability` and has been used as the default branch. 


## AI-assisted development and design reference

The initial application structure and example code were developed with assistance from **ChatGPT and Copilot**, using the team's implementation plan and reference screenshots. GitHub Copilot has also been used in the team's planning workflow. Team members are responsible for reviewing, adapting, testing, and explaining the code they submit.

Figma MCP was connected during planning, but direct access to the relevant design file was blocked by a permissions error. The available design screenshots/document were used as reference instead.


