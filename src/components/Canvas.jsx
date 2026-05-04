import React, { useCallback, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import useStore from '../hooks/useStore'
import SolarNode from './SolarNode'
import { COMPONENT_CATALOG } from '../data/components'

// Register all solar node types
const nodeTypes = Object.fromEntries(
  COMPONENT_CATALOG.map((c) => [c.type, SolarNode])
)

const Canvas = () => {
  const reactFlowWrapper = useRef(null)
  const [reactFlowInstance, setReactFlowInstance] = React.useState(null)

  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, clearSelection } =
    useStore((s) => ({
      nodes: s.nodes,
      edges: s.edges,
      onNodesChange: s.onNodesChange,
      onEdgesChange: s.onEdgesChange,
      onConnect: s.onConnect,
      addNode: s.addNode,
      clearSelection: s.clearSelection,
    }))

  const onDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDrop = useCallback(
    (e) => {
      e.preventDefault()
      const raw = e.dataTransfer.getData('application/solar-component')
      if (!raw || !reactFlowInstance) return

      const component = JSON.parse(raw)
      const bounds = reactFlowWrapper.current.getBoundingClientRect()
      const position = reactFlowInstance.screenToFlowPosition({
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      })

      addNode(component, position)
    },
    [reactFlowInstance, addNode]
  )

  const defaultEdgeOptions = {
    animated: true,
    style: { stroke: '#F59E0B', strokeWidth: 2 },
  }

  return (
    <div
      ref={reactFlowWrapper}
      className="flex-1 relative"
      style={{ background: '#0F172A' }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onPaneClick={clearSelection}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineStyle={{ stroke: '#F59E0B', strokeWidth: 2, strokeDasharray: '6 3' }}
        fitView
        deleteKeyCode="Delete"
        multiSelectionKeyCode="Shift"
        snapToGrid
        snapGrid={[16, 16]}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="#1E293B"
        />
        <Controls
          style={{ bottom: 20, left: 20 }}
          showInteractive={false}
        />
        <MiniMap
          style={{ bottom: 20, right: 20 }}
          nodeColor={(node) => node.data?.color || '#64748B'}
          maskColor="rgba(15,23,42,0.85)"
          nodeStrokeWidth={0}
        />
      </ReactFlow>

      {/* Empty state hint */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-solar-panel text-slate-500" style={{ fontSize: 28 }} />
            </div>
            <p className="text-slate-400 text-sm font-medium">Drag components from the left panel</p>
            <p className="text-slate-600 text-xs mt-1">Connect them to build your solar system</p>
          </div>
        </div>
      )}

      {/* Top toolbar overlay */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-800/90 backdrop-blur border border-slate-700/60 rounded-xl px-4 py-2 shadow-xl">
        <i className="fa-solid fa-circle-info text-slate-400" style={{ fontSize: 12 }} />
        <span className="text-xs text-slate-400">
          Drag to move • Connect handles to wire • <kbd className="text-slate-300 bg-slate-700 px-1 py-0.5 rounded text-xs">Del</kbd> to remove
        </span>
      </div>
    </div>
  )
}

export default Canvas
