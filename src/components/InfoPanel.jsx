import React from 'react'
import useStore from '../hooks/useStore'

const StatCard = ({ icon, label, value, unit, color }) => (
  <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
    <div className="flex items-center gap-2 mb-1">
      <i className={`fa-solid ${icon}`} style={{ color, fontSize: 13 }} />
      <span className="text-xs text-slate-400 font-medium">{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-xl font-bold font-mono" style={{ color }}>
        {value}
      </span>
      <span className="text-xs text-slate-500">{unit}</span>
    </div>
  </div>
)

const InfoPanel = () => {
  const { systemStats, nodes, edges, selectedNode, clearAll } = useStore((s) => ({
    systemStats: s.systemStats,
    nodes: s.nodes,
    edges: s.edges,
    selectedNode: s.selectedNode,
    clearAll: s.clearAll,
  }))

  const selected = nodes.find((n) => n.id === selectedNode)

  return (
    <div className="w-72 flex-shrink-0 bg-slate-900 border-l border-slate-700/60 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-slate-700/60">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            System Overview
          </span>
          <div
            className={`w-2 h-2 rounded-full ${
              systemStats.isValid
                ? 'bg-green-400'
                : nodes.length === 0
                ? 'bg-slate-600'
                : 'bg-yellow-400'
            }`}
            title={systemStats.isValid ? 'System valid' : 'Issues detected'}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <StatCard
            icon="fa-bolt"
            label="Generation"
            value={(systemStats.totalGeneration / 1000).toFixed(1)}
            unit="kW"
            color="#F59E0B"
          />
          <StatCard
            icon="fa-battery-three-quarters"
            label="Storage"
            value={systemStats.totalStorage.toFixed(1)}
            unit="kWh"
            color="#10B981"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            icon="fa-plug"
            label="Load"
            value={(systemStats.totalLoad / 1000).toFixed(1)}
            unit="kW"
            color="#F97316"
          />
          <StatCard
            icon="fa-diagram-project"
            label="Wires"
            value={edges.length}
            unit="conn"
            color="#8B5CF6"
          />
        </div>
      </div>

      {systemStats.validationResults?.length > 0 && (
        <div className="px-3 py-3 border-b border-slate-700/60 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Issues
          </div>
          <div className="space-y-2">
            {systemStats.validationResults.map((issue, index) => (
              <div
                key={index}
                className={`rounded-2xl border p-3 ${
                  issue.severity === 'error'
                    ? 'border-red-500/30 bg-red-500/10'
                    : 'border-yellow-400/30 bg-yellow-400/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
                      issue.severity === 'error'
                        ? 'text-red-300'
                        : 'text-yellow-300'
                    }`}
                  >
                    {issue.severity === 'error'
                      ? '🔴 ERROR'
                      : '🟡 WARNING'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {issue.components.join(', ')}
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-300">
                  {issue.description}
                </div>
                <div className="mt-2 text-[11px] text-slate-400">
                  Fix: {issue.fix}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {systemStats.panelString && (
        <div className="px-3 py-3 border-b border-slate-700/60">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            String Configuration
          </div>
          <div className="rounded-3xl border border-slate-700/50 bg-slate-900 p-3 space-y-2 text-xs text-slate-300">
            <div className="flex justify-between">
              <span>Series count</span>
              <span>{systemStats.panelString.seriesCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Parallel count</span>
              <span>{systemStats.panelString.parallelCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Total voltage</span>
              <span>{systemStats.panelString.totalVoltage.toFixed(1)} V</span>
            </div>
            <div className="flex justify-between">
              <span>Total current</span>
              <span>{systemStats.panelString.totalCurrent.toFixed(1)} A</span>
            </div>
            <div className="flex justify-between">
              <span>MPPT range</span>
              <span>
                {systemStats.panelString.isWithinMppt
                  ? 'Within range'
                  : 'Outside range'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        {selected ? (
          <>
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Component Detail
            </div>
            <div
              className="rounded-lg p-3 mb-3"
              style={{
                background: selected.data.bgColor,
                border: `1px solid ${selected.data.borderColor}`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <i
                  className={`fa-solid ${selected.data.icon}`}
                  style={{ color: selected.data.color, fontSize: 20 }}
                />
                <div>
                  <div className="text-sm font-semibold text-white">
                    {selected.data.label}
                  </div>
                  <div className="text-xs text-slate-400">
                    {selected.data.description}
                  </div>
                </div>
              </div>
              <div
                className="text-xs px-2 py-0.5 rounded-full inline-block"
                style={{
                  background: `${selected.data.color}22`,
                  color: selected.data.color,
                }}
              >
                {selected.data.category}
              </div>
            </div>

            {selected.data.specs && (
              <div className="space-y-1.5">
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">
                  Specifications
                </div>
                {Object.entries(selected.data.specs).map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 capitalize">
                      {k.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className="text-xs font-mono font-medium text-slate-200">
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-8">
            <i className="fa-solid fa-arrow-pointer text-slate-600" style={{ fontSize: 28 }} />
            <span className="text-xs text-slate-500">
              Click a component to see its details
            </span>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-700/60 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {nodes.length} component{nodes.length !== 1 ? 's' : ''}
          </span>
          <span>
            {edges.length} connection{edges.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={clearAll}
          className="w-full py-1.5 rounded-lg text-xs font-medium text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-colors"
        >
          <i className="fa-solid fa-trash mr-1.5" style={{ fontSize: 11 }} />
          Clear Canvas
        </button>
      </div>
    </div>
  )
}

export default InfoPanel
