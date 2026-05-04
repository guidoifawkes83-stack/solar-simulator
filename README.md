# ☀️ Solar Installation Simulator

A drag-and-drop solar system designer built with React, React Flow, and Tailwind CSS — inspired by circuito.io.

## Features

- **8 solar components** — panels, batteries, inverters, charge controllers, grid, loads, meters, EV chargers
- **Drag & drop** canvas with snap-to-grid
- **Wire connections** between components (click + drag from a handle)
- **Live system stats** — generation, storage, load totals
- **Validation warnings** — detects missing inverters, unconnected components, etc.
- **Component inspector** — click any node to see its full specs
- **Search + category filter** in the sidebar
- **Mini-map** for large layouts
- **Font Awesome icons** loaded from CDN

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open http://localhost:5173

## Tech Stack

| Library | Purpose |
|---|---|
| React 18 | UI framework |
| React Flow (`@xyflow/react`) | Drag-and-drop node canvas |
| Zustand | Global state (nodes, edges, stats) |
| Tailwind CSS | Utility-first styling |
| Vite | Build tool |
| Font Awesome 6 | Component icons (CDN) |

## Project Structure

```
src/
  components/
    Sidebar.jsx      # Left panel — component catalog
    Canvas.jsx       # Main React Flow canvas
    SolarNode.jsx    # Individual draggable node
    InfoPanel.jsx    # Right panel — stats & detail
  data/
    components.js    # Component definitions & specs
  hooks/
    useStore.js      # Zustand store — nodes, edges, stats
  App.jsx
  main.jsx
  index.css
```

## Adding Custom Components

Edit `src/data/components.js` and add an entry to `COMPONENT_CATALOG`:

```js
{
  id: 'wind-turbine',
  type: 'windTurbine',       // must be unique
  label: 'Wind Turbine',
  description: '5kW vertical axis',
  icon: 'fa-wind',           // any Font Awesome icon
  color: '#22D3EE',
  bgColor: 'rgba(34,211,238,0.12)',
  borderColor: 'rgba(34,211,238,0.4)',
  category: 'Generation',
  specs: { power: '5000W', cutIn: '2.5 m/s', ... },
  inputs: [],
  outputs: ['dc-out'],
}
```

No other changes needed — the canvas and sidebar pick it up automatically.
