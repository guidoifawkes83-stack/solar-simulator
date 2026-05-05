export const parseNumber = (value) => {
  if (value === undefined || value === null || value === '') return 0
  if (typeof value === 'number') return value
  const sanitized = String(value).replace(/,/g, '')
  const match = sanitized.match(/-?[\d.]+/)
  return match ? parseFloat(match[0]) : 0
}

export const estimatePeakSunHours = (location) => {
  const normalized = String(location).toLowerCase()
  if (/(desert|sahara|arizona|nevada|egypt|australia|sydney|las vegas)/.test(normalized)) {
    return 6.0
  }
  if (/(spain|greece|mexico|california|florida|texas|philippines)/.test(normalized)) {
    return 5.0
  }
  if (/(india|china|brazil|south africa)/.test(normalized)) {
    return 5.0
  }
  return 4.5
}

export const determineVoltageStandard = (location) => {
  const normalized = String(location).toLowerCase()
  if (/(usa|united states|america|canada|mexico|japan)/.test(normalized)) {
    return '120V AC'
  }
  if (/(china|russia|brazil|india)/.test(normalized)) {
    return '380V AC'
  }
  if (/(philippines)/.test(normalized)) {
    return '230V AC, 60Hz'
  }
  return '240V AC'
}

export const calculateLoadProfile = (wizardData) => {
  const isApplianceMode = wizardData.loadProfileMode === 'appliances'
  if (isApplianceMode && Array.isArray(wizardData.appliances)) {
    const dailyLoadKwh = wizardData.appliances.reduce(
      (sum, item) =>
        sum + (parseNumber(item.watts) * parseNumber(item.hours)) / 1000,
      0
    )
    const peakLoadW = wizardData.appliances.reduce(
      (max, item) => Math.max(max, parseNumber(item.watts)),
      0
    )
    return { dailyLoadKwh, peakLoadW }
  }

  const dailyLoadKwh = parseNumber(wizardData.dailyLoadKwh)
  const peakLoadW = Math.max(
    parseNumber(wizardData.peakLoadW),
    dailyLoadKwh > 0 ? (dailyLoadKwh * 1000) / 5 : 0
  )
  return { dailyLoadKwh, peakLoadW }
}

export const parseMpptRange = (value) => {
  if (!value) return { min: 0, max: 0 }
  const normalized = String(value).replace(/,/g, '')
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/)
  if (match) {
    return { min: parseFloat(match[1]), max: parseFloat(match[2]) }
  }
  const numbers = normalized.match(/[\d.]+/g)
  if (numbers && numbers.length >= 2) {
    return { min: parseFloat(numbers[0]), max: parseFloat(numbers[1]) }
  }
  return { min: 0, max: parseFloat(numbers?.[0] || 0) }
}

export const findPanelStringConfig = (nodes, edges, inverter) => {
  const panelNodes = nodes.filter((node) => node.type === 'solarPanel')
  if (panelNodes.length === 0) return null

  const parseValue = (node, keyNames) => {
    for (const key of keyNames) {
      const value = node.data?.specs?.[key]
      if (value !== undefined && value !== null) {
        return parseNumber(value)
      }
    }
    return 0
  }

  const specs = panelNodes.map((node) => ({
    id: node.id,
    vmp: parseValue(node, ['Vmp', 'vmp', 'Vmp', 'vmp']),
    imp: parseValue(node, ['Imp', 'imp']),
  }))

  const vmpSet = new Set(specs.map((item) => item.vmp))
  const impSet = new Set(specs.map((item) => item.imp))

  const panelIds = panelNodes.map((node) => node.id)
  const panelToPanel = edges.filter(
    (edge) => panelIds.includes(edge.source) && panelIds.includes(edge.target)
  )

  const seriesCount = panelToPanel.length > 0 ? panelNodes.length : 1
  const parallelCount = panelToPanel.length > 0 ? 1 : panelNodes.length

  const vmp = specs[0]?.vmp || 0
  const imp = specs[0]?.imp || 0
  const totalVoltage = seriesCount * vmp
  const totalCurrent = parallelCount * imp

  const mppt =
    inverter?.data?.specs?.mpptVoltageRange || inverter?.data?.specs?.input || ''
  const mpptRange = parseMpptRange(mppt)
  const isWithinMppt =
    totalVoltage >= mpptRange.min && totalVoltage <= mpptRange.max

  return {
    panelCount: panelNodes.length,
    seriesCount,
    parallelCount,
    totalVoltage,
    totalCurrent,
    isWithinMppt,
    panelMismatch: vmpSet.size > 1 || impSet.size > 1,
    vmpMismatch: vmpSet.size > 1,
    impMismatch: impSet.size > 1,
    mpptRange,
  }
}
