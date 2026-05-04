import { create } from 'zustand'
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react'

let nodeIdCounter = 1
export const genNodeId = () => `node_${nodeIdCounter++}`

const useStore = create((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  systemStats: {
    totalGeneration: 0,
    totalStorage: 0,
    totalLoad: 0,
    isValid: false,
    warnings: [],
  },

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) })
    get().recalcStats()
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) })
    get().recalcStats()
  },

  onConnect: (connection) => {
    const edge = {
      ...connection,
      id: `edge_${Date.now()}`,
      animated: true,
      style: { stroke: '#F59E0B', strokeWidth: 2 },
    }
    set({ edges: addEdge(edge, get().edges) })
    get().recalcStats()
  },

  addNode: (componentDef, position) => {
    const id = genNodeId()
    const newNode = {
      id,
      type: componentDef.type,
      position,
      data: {
        ...componentDef,
        instanceId: id,
        label: componentDef.label,
      },
    }
    set({ nodes: [...get().nodes, newNode] })
    get().recalcStats()
    return id
  },

  removeNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      ),
      selectedNode: get().selectedNode === nodeId ? null : get().selectedNode,
    })
    get().recalcStats()
  },

  selectNode: (nodeId) => set({ selectedNode: nodeId }),
  clearSelection: () => set({ selectedNode: null }),

  clearAll: () =>
    set({
      nodes: [],
      edges: [],
      selectedNode: null,
      systemStats: {
        totalGeneration: 0,
        totalStorage: 0,
        totalLoad: 0,
        isValid: false,
        warnings: [],
      },
    }),

  recalcStats: () => {
    const { nodes, edges } = get()
    let totalGeneration = 0
    let totalStorage = 0
    let totalLoad = 0
    const warnings = []

    const hasPanels = nodes.some((n) => n.type === 'solarPanel')
    const hasInverter = nodes.some((n) => n.type === 'inverter')
    const hasBattery = nodes.some((n) => n.type === 'battery')
    const hasLoad = nodes.some((n) => n.type === 'load' || n.type === 'evCharger')

    nodes.forEach((node) => {
      switch (node.type) {
        case 'solarPanel':
          totalGeneration += node.data.specs?.watts || 0
          break
        case 'battery':
          totalStorage += 10 // kWh
          break
        case 'load':
          totalLoad += 5000 // W peak
          break
        case 'evCharger':
          totalLoad += 7400
          break
      }
    })

    if (hasPanels && !hasInverter) {
      warnings.push('Solar panels need an inverter to produce AC power')
    }
    if (hasBattery && !hasInverter && nodes.length > 1) {
      warnings.push('Battery requires an inverter for AC loads')
    }
    if (hasLoad && !hasPanels && !nodes.some((n) => n.type === 'grid')) {
      warnings.push('No power source connected to load')
    }
    if (edges.length === 0 && nodes.length > 1) {
      warnings.push('Components are not connected — add wires')
    }

    const isValid = nodes.length > 0 && warnings.length === 0

    set({
      systemStats: {
        totalGeneration,
        totalStorage,
        totalLoad,
        isValid,
        warnings,
      },
    })
  },
}))

export default useStore
