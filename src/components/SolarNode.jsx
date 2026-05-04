import React, { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import clsx from 'clsx'
import useStore from '../hooks/useStore'

const SolarNode = memo(({ data, selected, id }) => {
  const removeNode = useStore((s) => s.removeNode)
  const selectNode = useStore((s) => s.selectNode)

  const hasInput = data.inputs?.length > 0
  const hasOutput = data.outputs?.length > 0

  return (
    <div
      onClick={() => selectNode(id)}
      style={{
        background: data.bgColor,
        borderColor: selected ? data.color : data.borderColor,
        borderWidth: selected ? 2 : 1,
        borderStyle: 'solid',
        boxShadow: selected
          ? `0 0 0 3px ${data.color}33, 0 8px 32px rgba(0,0,0,0.5)`
          : '0 4px 24px rgba(0,0,0,0.4)',
        minWidth: data.width || 150,
      }}
      className="rounded-xl px-4 py-3 relative group cursor-pointer transition-all duration-150"
    >
      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); removeNode(id) }}
        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs items-center justify-center hidden group-hover:flex z-10 hover:bg-red-400 transition-colors"
        style={{ lineHeight: 1 }}
      >
        <i className="fa fa-times" style={{ fontSize: 9 }} />
      </button>

      {/* Input handle (left) */}
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          style={{
            background: data.color,
            width: 12,
            height: 12,
            border: '2px solid #0F172A',
          }}
        />
      )}

      {/* Content */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${data.color}22`, border: `1px solid ${data.color}44` }}
        >
          <i
            className={`fa-solid ${data.icon}`}
            style={{ color: data.color, fontSize: 18 }}
          />
        </div>
        <div className="min-w-0">
          <div className="text-white text-sm font-semibold leading-tight truncate">
            {data.label}
          </div>
          <div className="text-slate-400 text-xs leading-tight mt-0.5 truncate">
            {data.description}
          </div>
        </div>
      </div>

      {/* Specs row */}
      {data.specs && (
        <div className="mt-2 pt-2 border-t flex flex-wrap gap-1" style={{ borderColor: `${data.color}22` }}>
          {Object.entries(data.specs).slice(0, 2).map(([k, v]) => (
            <span
              key={k}
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: `${data.color}18`, color: data.color }}
            >
              {v}
            </span>
          ))}
        </div>
      )}

      {/* Output handle (right) */}
      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          style={{
            background: data.color,
            width: 12,
            height: 12,
            border: '2px solid #0F172A',
          }}
        />
      )}
    </div>
  )
})

SolarNode.displayName = 'SolarNode'
export default SolarNode
