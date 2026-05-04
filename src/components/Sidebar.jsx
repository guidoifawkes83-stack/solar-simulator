import React, { useState } from 'react'
import { COMPONENT_CATALOG, CATEGORIES } from '../data/components'

const Sidebar = () => {
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')

  const filtered = COMPONENT_CATALOG.filter((c) => {
    const matchCat = activeCategory === 'All' || c.category === activeCategory
    const matchSearch =
      !search ||
      c.label.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const onDragStart = (e, component) => {
    e.dataTransfer.setData('application/solar-component', JSON.stringify(component))
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-700/60 w-64 flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/60">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center">
            <i className="fa-solid fa-solar-panel text-yellow-400" style={{ fontSize: 13 }} />
          </div>
          <span className="text-white font-semibold text-sm">Solar Sim</span>
          <span className="ml-auto text-xs text-slate-500 font-mono">v1.0</span>
        </div>

        {/* Search */}
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" style={{ fontSize: 12 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search components..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-slate-300 placeholder-slate-500 outline-none focus:border-yellow-400/50 transition-colors"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="px-3 py-2 border-b border-slate-700/60 flex flex-wrap gap-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`text-xs px-2 py-1 rounded-md transition-all ${
              activeCategory === cat
                ? 'bg-yellow-400 text-slate-900 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Component list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <p className="text-xs text-slate-500 px-2 py-1 font-medium uppercase tracking-wider">
          Drag to canvas
        </p>
        {filtered.map((component) => (
          <div
            key={component.id}
            draggable
            onDragStart={(e) => onDragStart(e, component)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-grab active:cursor-grabbing hover:bg-slate-800 border border-transparent hover:border-slate-700/60 transition-all group select-none"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: component.bgColor,
                border: `1px solid ${component.borderColor}`,
              }}
            >
              <i
                className={`fa-solid ${component.icon}`}
                style={{ color: component.color, fontSize: 16 }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm text-slate-200 font-medium leading-tight">
                {component.label}
              </div>
              <div className="text-xs text-slate-500 leading-tight mt-0.5 truncate">
                {component.description}
              </div>
            </div>
            <i
              className="fa-solid fa-grip-dots-vertical text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0"
              style={{ fontSize: 12 }}
            />
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div className="p-3 border-t border-slate-700/60">
        <div className="flex items-start gap-2 text-xs text-slate-500">
          <i className="fa-solid fa-circle-info mt-0.5 flex-shrink-0" style={{ fontSize: 11 }} />
          <span>Drag components onto the canvas and connect them with wires.</span>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
