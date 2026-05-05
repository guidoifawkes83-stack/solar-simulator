import { create } from 'zustand'
import { addEdge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react'
import { getComponentDef } from '../data/components'
import {
  calculateLoadProfile,
  findPanelStringConfig,
  parseNumber,
} from '../utils/systemHelpers'
import { autoWireSystem } from '../utils/anthropic'

let nodeIdCounter = 1
export const genNodeId = () => `node_${nodeIdCounter++}`

const STORAGE_KEY = 'solar-sim-config'

const loadLocalConfig = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const initialWizardData = {
  installationType: 'Residential',
  location: 'Philippines',
  estimatedPSH: 5.0,
  voltageStandard: '230V AC, 60Hz',
  inverterQuery: '',
  inverter: { brandModel: '', specs: {} },
  panels: { brandModel: '', count: 1, specs: {} },
  battery: { brandModel: '', count: 0, specs: {} },
  chargeController: { brandModel: '', specs: {} },
  loadProfileMode: 'daily',
  dailyLoadKwh: 20,
  peakLoadW: 0,
  appliances: [
    { name: 'Lights', watts: 200, hours: 5 },
    { name: 'Fridge', watts: 150, hours: 24 },
  ],
}

const defaultSystemStats = {
  totalGeneration: 0,
  totalStorage: 0,
  totalLoad: 0,
  estimatedDailyGeneration: 0,
  panelString: null,
  validationResults: [],
  warnings: [],
  isValid: false,
}

const storedConfig = loadLocalConfig()

const getSpecValue = (node, keys) => {
  const specs = node?.data?.specs || {}
  for (const key of keys) {
    if (specs[key] !== undefined && specs[key] !== null) {
      return specs[key]
    }
  }
  return null
}

const computeSystemStats = (nodes, edges, wizardData) => {
  let totalGeneration = 0
  let totalStorage = 0
  let dailyLoadKwh = 0
  let totalPeakLoadW = 0
  const validationResults = []

  const inverterNode = nodes.find((node) => node.type === 'inverter')
  const batteryNode = nodes.find((node) => node.type === 'battery')
  const controllerNode = nodes.find((node) => node.type === 'chargeController')
  const gridNode = nodes.find((node) => node.type === 'grid')
  const loadNodes = nodes.filter(
    (node) => node.type === 'load' || node.type === 'evCharger'
  )

  nodes.forEach((node) => {
    switch (node.type) {
      case 'solarPanel':
        totalGeneration += parseNumber(
          getSpecValue(node, ['wattage', 'watts'])
        )
        break
      case 'battery':
        totalStorage += parseNumber(getSpecValue(node, ['capacity']))
        break
      case 'load':
        dailyLoadKwh += parseNumber(getSpecValue(node, ['daily']))
        totalPeakLoadW += parseNumber(
          getSpecValue(node, ['peak', 'power', 'peakLoadW'])
        )
        break
      case 'evCharger':
        totalPeakLoadW += parseNumber(getSpecValue(node, ['power'])) || 7400
        dailyLoadKwh +=
          (parseNumber(getSpecValue(node, ['power'])) || 7400) / 1000
        break
      default:
        break
    }
  })

  const loadProfile = calculateLoadProfile(wizardData || initialWizardData)
  dailyLoadKwh = Math.max(dailyLoadKwh, loadProfile.dailyLoadKwh)
  totalPeakLoadW = Math.max(totalPeakLoadW, loadProfile.peakLoadW)

  const estimatedDailyGeneration =
    (totalGeneration * parseNumber(wizardData?.estimatedPSH || 4.5)) / 1000

  const panelString = findPanelStringConfig(nodes, edges, inverterNode)

  const inverterMaxInput = parseNumber(
    getSpecValue(inverterNode, ['maxInputVoltage'])
  )
  const inverterMaxCurrent = parseNumber(
    getSpecValue(inverterNode, ['maxInputCurrent'])
  )
  const inverterRatedPower = parseNumber(
    getSpecValue(inverterNode, ['ratedPower'])
  )
  const batteryMaxChargeCurrent = parseNumber(
    getSpecValue(batteryNode, ['maxChargeCurrent'])
  )
  const controllerRatedCurrent = parseNumber(
    getSpecValue(controllerNode, ['ratedCurrent'])
  )

  if (panelString && inverterNode) {
    if (
      panelString.totalVoltage > 0 &&
      inverterMaxInput > 0 &&
      panelString.totalVoltage > inverterMaxInput
    ) {
      validationResults.push({
        severity: 'error',
        title: 'Overvoltage',
        description: `Panel string voltage ${panelString.totalVoltage.toFixed(
          0
        )} V exceeds inverter max input ${inverterMaxInput} V.`,
        components: [inverterNode.data.label, 'Solar panels'],
        fix: 'Reduce series panel count or use a higher-voltage inverter.',
      })
    }

    if (
      panelString.totalCurrent > 0 &&
      inverterMaxCurrent > 0 &&
      panelString.totalCurrent > inverterMaxCurrent
    ) {
      validationResults.push({
        severity: 'error',
        title: 'Overcurrent',
        description: `Panel string current ${panelString.totalCurrent.toFixed(
          1
        )} A exceeds inverter max input current ${inverterMaxCurrent} A.`,
        components: [inverterNode.data.label, 'Solar panels'],
        fix: 'Reduce parallel strings or use a higher-current inverter.',
      })
    }

    if (
      controllerNode &&
      panelString.totalCurrent > 0 &&
      controllerRatedCurrent > 0 &&
      panelString.totalCurrent > controllerRatedCurrent
    ) {
      validationResults.push({
        severity: 'error',
        title: 'Overcurrent',
        description: `Panel current ${panelString.totalCurrent.toFixed(
          1
        )} A exceeds charge controller rating ${controllerRatedCurrent} A.`,
        components: [controllerNode.data.label, 'Solar panels'],
        fix: 'Reduce solar input current or upgrade the controller.',
      })
    }

    if (batteryNode && batteryMaxChargeCurrent > 0) {
      if (panelString.totalCurrent > batteryMaxChargeCurrent) {
        validationResults.push({
          severity: 'warning',
          title: 'Battery overcharge',
          description: `Solar array current ${panelString.totalCurrent.toFixed(
            1
          )} A exceeds battery max charge current ${batteryMaxChargeCurrent} A.`,
          components: [batteryNode.data.label, 'Solar panels'],
          fix: 'Add a charge controller or reduce panel current.',
        })
      }
    }

    if (panelString.panelMismatch) {
      validationResults.push({
        severity: 'warning',
        title: 'String mismatch',
        description:
          'Panels in the same string have inconsistent Vmp/Imp values.',
        components: ['Solar panels'],
        fix: 'Use matching panel models in the same string.',
      })
    }
  }

  if (inverterNode && inverterRatedPower > 0 && totalPeakLoadW > inverterRatedPower) {
    validationResults.push({
      severity: 'error',
      title: 'Inverter overload',
      description: `Total peak load ${totalPeakLoadW.toFixed(
        0
      )} W exceeds inverter rated output ${inverterRatedPower} W.`,
      components: [inverterNode.data.label, 'Loads'],
      fix: 'Reduce load or increase inverter capacity.',
    })
  }

  if (
    estimatedDailyGeneration > 0 &&
    dailyLoadKwh > 0 &&
    estimatedDailyGeneration < dailyLoadKwh
  ) {
    validationResults.push({
      severity: 'warning',
      title: 'Undersize',
      description: `Estimated generation ${estimatedDailyGeneration.toFixed(
        1
      )} kWh/day is less than daily load ${dailyLoadKwh.toFixed(1)} kWh/day.`,
      components: ['Solar panels', 'Load'],
      fix: 'Add more panels or reduce daily consumption.',
    })
  }

  if (loadNodes.length > 0 && !gridNode && !inverterNode) {
    validationResults.push({
      severity: 'error',
      title: 'No ground/neutral',
      description:
        'AC loads are present without a grid or inverter connection.',
      components: ['Load', 'Grid/Inverter'],
      fix: 'Add a grid connection or inverter before AC loads.',
    })
  }

  if (nodes.length > 1 && edges.length === 0) {
    validationResults.push({
      severity: 'warning',
      title: 'No wires',
      description: 'Components are not connected.',
      components: ['System'],
      fix: 'Connect components with wires on the canvas.',
    })
  }

  if (nodes.some((n) => n.type === 'solarPanel') && !inverterNode) {
    validationResults.push({
      severity: 'warning',
      title: 'Missing inverter',
      description: 'Solar panels are present but no inverter is installed.',
      components: ['Solar panels'],
      fix: 'Add an inverter before attempting AC output.',
    })
  }

  const isValid =
    nodes.length > 0 &&
    !validationResults.some((item) => item.severity === 'error')

  const warnings = validationResults
    .filter((item) => item.severity === 'warning')
    .map((item) => item.description)

  return {
    totalGeneration,
    totalStorage,
    totalLoad: totalPeakLoadW,
    estimatedDailyGeneration,
    panelString,
    validationResults,
    warnings,
    isValid,
  }
}

const useStore = create((set, get) => ({
  nodes: storedConfig?.nodes || [],
  edges: storedConfig?.edges || [],
  selectedNode: null,
  systemStats: computeSystemStats(
    storedConfig?.nodes || [],
    storedConfig?.edges || [],
    initialWizardData
  ),
  wizardOpen: !storedConfig,
  wizardStep: 1,
  wizardData: initialWizardData,
  storedConfig: storedConfig || null,
  autoWireLoading: false,
  autoWireExplanation: '',

  loadStoredConfig: () => {
    const config = loadLocalConfig()
    if (config) {
      set({
        nodes: config.nodes || [],
        edges: config.edges || [],
        storedConfig: config,
        wizardOpen: false,
      })
      get().recalcStats()
    }
  },

  saveConfig: (nodes, edges) => {
    if (typeof window === 'undefined') return
    const payload = { nodes, edges, savedAt: new Date().toISOString() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    set({ storedConfig: payload })
  },

  clearStoredConfig: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
    set({
      storedConfig: null,
      wizardOpen: true,
      wizardStep: 1,
      wizardData: initialWizardData,
      nodes: [],
      edges: [],
      selectedNode: null,
      systemStats: defaultSystemStats,
    })
  },

  openWizard: () => set({ wizardOpen: true, wizardStep: 1 }),
  closeWizard: () => set({ wizardOpen: false }),
  goToWizardStep: (step) => set({ wizardStep: step }),
  updateWizardData: (updates) =>
    set({ wizardData: { ...get().wizardData, ...updates } }),
  setAutoWireExplanation: (explanation) => set({ autoWireExplanation: explanation }),

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
        specs: componentDef.specs,
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
      selectedNode:
        get().selectedNode === nodeId ? null : get().selectedNode,
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
      systemStats: defaultSystemStats,
    }),

  applyWizardConfig: () => {
    const wizardData = get().wizardData
    const nodes = []
    const edges = []

    const inverterDef = getComponentDef('inverter')
    const inverterId = genNodeId()
    nodes.push({
      id: inverterId,
      type: 'inverter',
      position: { x: 420, y: 120 },
      data: {
        ...inverterDef,
        instanceId: inverterId,
        label: wizardData.inverter.brandModel || inverterDef.label,
        specs: {
          ...inverterDef.specs,
          ...wizardData.inverter.specs,
        },
      },
    })

    const panelDef = getComponentDef('solarPanel')
    const panelCount = Math.max(1, parseNumber(wizardData.panels.count))
    const panelIds = []
    for (let index = 0; index < panelCount; index += 1) {
      const id = genNodeId()
      panelIds.push(id)
      nodes.push({
        id,
        type: 'solarPanel',
        position: { x: 40 + index * 180, y: 40 },
        data: {
          ...panelDef,
          instanceId: id,
          label: `${panelDef.label} ${index + 1}`,
          specs: {
            ...panelDef.specs,
            ...wizardData.panels.specs,
          },
        },
      })
    }

    const batteryCount = Math.max(0, parseNumber(wizardData.battery.count))
    const batteryId = batteryCount > 0 ? genNodeId() : null
    if (batteryId) {
      const batteryDef = getComponentDef('battery')
      nodes.push({
        id: batteryId,
        type: 'battery',
        position: { x: 420, y: 300 },
        data: {
          ...batteryDef,
          instanceId: batteryId,
          label: batteryDef.label,
          specs: {
            ...batteryDef.specs,
            ...wizardData.battery.specs,
          },
        },
      })
    }

    const controllerId =
      wizardData.installationType === 'Off-grid' ? genNodeId() : null
    if (controllerId) {
      const controllerDef = getComponentDef('chargeController')
      nodes.push({
        id: controllerId,
        type: 'chargeController',
        position: { x: 180, y: 300 },
        data: {
          ...controllerDef,
          instanceId: controllerId,
          label: controllerDef.label,
          specs: {
            ...controllerDef.specs,
            ...wizardData.chargeController.specs,
          },
        },
      })
    }

    const loadDef = getComponentDef('load')
    const loadId = genNodeId()
    nodes.push({
      id: loadId,
      type: 'load',
      position: { x: 760, y: 120 },
      data: {
        ...loadDef,
        instanceId: loadId,
        label: loadDef.label,
        description: `${wizardData.installationType} load`,
        specs: {
          ...loadDef.specs,
          daily: `${wizardData.dailyLoadKwh} kWh/day`,
          peak: `${Math.max(
            parseNumber(wizardData.peakLoadW),
            calculateLoadProfile(wizardData).peakLoadW
          )} W`,
          type: wizardData.installationType,
          voltage: wizardData.voltageStandard,
        },
      },
    })

    const gridId =
      wizardData.installationType !== 'Off-grid' ? genNodeId() : null
    if (gridId) {
      const gridDef = getComponentDef('grid')
      nodes.push({
        id: gridId,
        type: 'grid',
        position: { x: 420, y: -80 },
        data: {
          ...gridDef,
          instanceId: gridId,
          label: gridDef.label,
          specs: {
            ...gridDef.specs,
            voltage: wizardData.voltageStandard,
          },
        },
      })
    }

    const connect = (source, target) => {
      edges.push({
        id: `edge_${source}_${target}`,
        source,
        target,
        animated: true,
        style: { stroke: '#F59E0B', strokeWidth: 2 },
      })
    }

    if (panelIds.length > 0) {
      if (controllerId) {
        panelIds.forEach((panelId) => connect(panelId, controllerId))
      } else {
        panelIds.forEach((panelId) => connect(panelId, inverterId))
      }
    }

    if (controllerId) {
      if (batteryId) {
        connect(controllerId, batteryId)
        connect(batteryId, inverterId)
      } else {
        connect(controllerId, inverterId)
      }
    } else if (batteryId) {
      connect(batteryId, inverterId)
    }

    connect(inverterId, loadId)
    if (gridId) {
      connect(gridId, loadId)
    }

    set({
      nodes,
      edges,
      selectedNode: null,
      wizardOpen: false,
      wizardStep: 1,
    })

    get().saveConfig(nodes, edges)
    get().recalcStats()
  },

  autoWire: async () => {
    const nodes = get().nodes
    if (nodes.length === 0) return

    set({ autoWireLoading: true, autoWireExplanation: '' })

    try {
      const components = nodes.map(node => ({
        id: node.id,
        type: node.type,
        label: node.data.label,
        specs: node.data.specs || {},
      }))

      const result = await autoWireSystem(components)

      if (result.edges && Array.isArray(result.edges)) {
        const stringColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'] // blue, green, yellow, red, purple

        const newEdges = result.edges.map((edge, index) => {
          let style = { stroke: '#F59E0B', strokeWidth: 2 }
          let label = edge.label || ''

          // If strings are provided, color-code and label them
          if (result.strings && Array.isArray(result.strings)) {
            const stringIndex = result.strings.findIndex(str =>
              str.panels && str.panels.includes(edge.source) && str.panels.includes(edge.target)
            )
            if (stringIndex >= 0) {
              const string = result.strings[stringIndex]
              style.stroke = stringColors[stringIndex % stringColors.length]
              if (!label && string.label) {
                label = string.label
              }
            }
          }

          return {
            id: `auto_edge_${Date.now()}_${index}`,
            source: edge.source,
            target: edge.target,
            label,
            animated: true,
            style,
          }
        })

        set({ edges: newEdges, autoWireExplanation: result.explanation || 'Auto-wired successfully' })
      } else {
        set({ autoWireExplanation: 'Failed to parse wiring configuration' })
      }
    } catch (error) {
      console.error('Auto-wire error:', error)
      set({ autoWireExplanation: 'Error during auto-wiring: ' + error.message })
    } finally {
      set({ autoWireLoading: false })
    }
  },

  recalcStats: () => {
    const nodes = get().nodes
    const edges = get().edges
    const wizardData = get().wizardData
    const systemStats = computeSystemStats(nodes, edges, wizardData)
    set({ systemStats })
  },
}))

export default useStore
