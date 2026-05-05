import React, { useEffect, useMemo, useState } from 'react'
import useStore from '../hooks/useStore'
import { lookupComponentSpecs } from '../utils/anthropic'
import {
  calculateLoadProfile,
  determineVoltageStandard,
  estimatePeakSunHours,
  parseNumber,
} from '../utils/systemHelpers'

const installationTypes = ['Residential', 'Commercial', 'Off-grid', 'Hybrid']

const StepCard = ({ active, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-2xl px-3 py-2 text-xs font-semibold transition-all ${
      active
        ? 'bg-yellow-400 text-slate-950 shadow-lg'
        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
    }`}
  >
    {label}
  </button>
)

const InfoRow = ({ label, value }) => (
  <div className="flex items-center justify-between text-xs text-slate-300">
    <span>{label}</span>
    <span className="font-mono text-slate-100">{value}</span>
  </div>
)

const SetupWizard = () => {
  const {
    wizardOpen,
    wizardStep,
    wizardData,
    goToWizardStep,
    updateWizardData,
    openWizard,
    closeWizard,
    applyWizardConfig,
  } = useStore((state) => ({
    wizardOpen: state.wizardOpen,
    wizardStep: state.wizardStep,
    wizardData: state.wizardData,
    goToWizardStep: state.goToWizardStep,
    updateWizardData: state.updateWizardData,
    openWizard: state.openWizard,
    closeWizard: state.closeWizard,
    applyWizardConfig: state.applyWizardConfig,
  }))

  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    if (!wizardData.location) return
    const psh = estimatePeakSunHours(wizardData.location)
    const standard = determineVoltageStandard(wizardData.location)
    updateWizardData({ estimatedPSH: psh, voltageStandard: standard })
  }, [wizardData.location])

  const loadProfile = useMemo(
    () => calculateLoadProfile(wizardData),
    [wizardData]
  )

  const panelConfig = useMemo(() => {
    const specs = wizardData.panels.specs || {}
    const panelCount = Math.max(1, parseNumber(wizardData.panels.count))
    const vmp = parseNumber(specs.Vmp || specs.vmp)
    const imp = parseNumber(specs.Imp || specs.imp)
    const totalVoltage = vmp * 1
    const totalCurrent = imp * panelCount
    return { panelCount, vmp, imp, totalVoltage, totalCurrent }
  }, [wizardData.panels])

  const inverterSpecs = wizardData.inverter.specs || {}
  const inverterMaxVoltage = parseNumber(inverterSpecs.maxInputVoltage)
  const inverterMaxCurrent = parseNumber(inverterSpecs.maxInputCurrent)
  const inverterRatedPower = parseNumber(inverterSpecs.ratedPower)

  const estimateGenerationKwh =
    (parseNumber(wizardData.panels.specs?.wattage || wizardData.panels.specs?.watts) *
      panelConfig.panelCount *
      parseNumber(wizardData.estimatedPSH || 4.5)) /
    1000

  const canProceed = () => {
    switch (wizardStep) {
      case 1:
        return Boolean(wizardData.installationType)
      case 2:
        return Boolean(wizardData.location)
      case 3:
        return Boolean(
          wizardData.inverterQuery && inverterSpecs.ratedPower
        )
      case 4:
        return Boolean(
          wizardData.panels.brandModel &&
            panelConfig.panelCount > 0 &&
            wizardData.panels.specs?.wattage
        )
      case 5:
        return (
          wizardData.installationType !== 'Off-grid' &&
          wizardData.installationType !== 'Hybrid'
        )
          ? true
          : Boolean(
              wizardData.battery.brandModel &&
                wizardData.battery.count > 0 &&
                wizardData.battery.specs?.capacity
            )
      case 6:
        return wizardData.installationType === 'Off-grid'
          ? Boolean(
              wizardData.chargeController.brandModel &&
                wizardData.chargeController.specs?.ratedCurrent
            )
          : true
      case 7:
        return loadProfile.dailyLoadKwh > 0
      case 8:
        return true
      default:
        return false
    }
  }

  const fetchSpecs = async (type, queryField, targetKey) => {
    try {
      setApiError('')
      setLoading(true)
      const query = queryField.includes('.')
        ? queryField.split('.').reduce((acc, key) => acc?.[key], wizardData)
        : wizardData[queryField]
      const specs = await lookupComponentSpecs(type, query)
      updateWizardData({
        [targetKey]: {
          ...wizardData[targetKey],
          brandModel: query,
          specs,
        },
      })
    } catch (error) {
      setApiError('Unable to fetch specs. Try a different model string.')
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field, value) => {
    updateWizardData({ [field]: value })
  }

  const updateNestedField = (parent, child, value) => {
    updateWizardData({
      [parent]: {
        ...wizardData[parent],
        [child]: value,
      },
    })
  }

  const stepButtons = [
    'Installation',
    'Location',
    'Inverter',
    'Solar Panels',
    'Battery',
    'Controller',
    'Load Profile',
    'Summary',
  ]

  if (!wizardOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm text-slate-100">
      <div className="mx-auto my-8 flex h-[calc(100%-4rem)] max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900 shadow-2xl">
        <div className="border-b border-slate-700/70 px-6 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-300">
                Solar System Setup
              </div>
              <div className="mt-2 text-xl font-semibold text-white">
                Configure your system before using the canvas
              </div>
            </div>

            <button
              type="button"
              onClick={closeWizard}
              className="rounded-full border border-slate-700/90 bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500"
            >
              Close Wizard
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {stepButtons.map((label, index) => (
              <StepCard
                key={label}
                label={`${index + 1}. ${label}`}
                active={wizardStep === index + 1}
                onClick={() => goToWizardStep(index + 1)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-full overflow-y-auto p-6">
            <div className="rounded-3xl border border-slate-700/70 bg-slate-950/80 p-6 shadow-inner">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <div className="text-sm uppercase tracking-[0.24em] text-slate-400">
                    Step {wizardStep} of 8
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {stepButtons[wizardStep - 1]}
                  </div>
                </div>
                {loading && (
                  <div className="rounded-full bg-slate-800 px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-200">
                    Fetching specs
                  </div>
                )}
              </div>

              {apiError && (
                <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {apiError}
                </div>
              )}

              {wizardStep === 1 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {installationTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => updateField('installationType', type)}
                      className={`rounded-3xl border p-6 text-left transition ${
                        wizardData.installationType === type
                          ? 'border-yellow-400/80 bg-yellow-400/10 text-white'
                          : 'border-slate-700/80 bg-slate-800/80 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div className="text-lg font-semibold">{type}</div>
                      <div className="mt-2 text-sm text-slate-400">
                        {type === 'Residential' &&
                          'Single home, battery optional.'}
                        {type === 'Commercial' &&
                          'Business or facility with higher load.'}
                        {type === 'Off-grid' &&
                          'Standalone system with battery backup.'}
                        {type === 'Hybrid' &&
                          'Grid-tied system with storage support.'}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-200">
                      🇵🇭 City / Country
                    </label>
                    <input
                      type="text"
                      value={wizardData.location}
                      onChange={(event) =>
                        updateField('location', event.target.value)
                      }
                      placeholder="e.g. San Diego, USA"
                      className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-400"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoRow
                      label="Estimated peak sun hours"
                      value={`${wizardData.estimatedPSH?.toFixed(1) || 4.5} h/day`}
                    />
                    <InfoRow
                      label="Voltage standard"
                      value={wizardData.voltageStandard || '240V AC'}
                    />
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-200">
                      Inverter brand + model
                    </label>
                    <input
                      type="text"
                      value={wizardData.inverterQuery}
                      onChange={(event) =>
                        updateField('inverterQuery', event.target.value)
                      }
                      placeholder="e.g. Growatt SPF 5000TL"
                      className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-400"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={!wizardData.inverterQuery || loading}
                    onClick={() =>
                      fetchSpecs('inverter', 'inverterQuery', 'inverter')
                    }
                    className="inline-flex rounded-3xl bg-yellow-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Fetch inverter specs
                  </button>

                  {wizardData.inverter.specs?.ratedPower && (
                    <div className="rounded-3xl border border-slate-700 bg-slate-900 p-5">
                      <div className="mb-4 text-sm font-semibold text-white">
                        Inverter specs
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <InfoRow
                          label="Rated power"
                          value={wizardData.inverter.specs.ratedPower}
                        />
                        <InfoRow
                          label="Max input voltage"
                          value={wizardData.inverter.specs.maxInputVoltage}
                        />
                        <InfoRow
                          label="MPPT voltage range"
                          value={wizardData.inverter.specs.mpptVoltageRange}
                        />
                        <InfoRow
                          label="Max input current"
                          value={wizardData.inverter.specs.maxInputCurrent}
                        />
                        <InfoRow
                          label="AC output voltage"
                          value={wizardData.inverter.specs.acOutputVoltage}
                        />
                        <InfoRow
                          label="Efficiency"
                          value={wizardData.inverter.specs.efficiency}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {wizardStep === 4 && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-200">
                      Solar panel brand + model
                    </label>
                    <input
                      type="text"
                      value={wizardData.panels.brandModel}
                      onChange={(event) =>
                        updateNestedField(
                          'panels',
                          'brandModel',
                          event.target.value
                        )
                      }
                      placeholder="e.g. Jinko JKM400M-54HL4"
                      className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-400"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-200">
                        Number of panels
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={wizardData.panels.count}
                        onChange={(event) =>
                          updateNestedField(
                            'panels',
                            'count',
                            Number(event.target.value)
                          )
                        }
                        className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-200">
                        Estimated string current
                      </label>
                      <div className="rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white">
                        {panelConfig.totalCurrent
                          ? `${panelConfig.totalCurrent.toFixed(1)} A`
                          : 'Awaiting panel specs'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!wizardData.panels.brandModel || loading}
                    onClick={() =>
                      fetchSpecs('solarPanel', 'panels.brandModel', 'panels')
                    }
                    className="inline-flex rounded-3xl bg-yellow-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Fetch panel specs
                  </button>

                  {wizardData.panels.specs?.wattage && (
                    <div className="rounded-3xl border border-slate-700 bg-slate-900 p-5">
                      <div className="mb-4 text-sm font-semibold text-white">
                        Panel specs
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <InfoRow
                          label="Wattage"
                          value={wizardData.panels.specs.wattage}
                        />
                        <InfoRow
                          label="Voc"
                          value={wizardData.panels.specs.Voc || wizardData.panels.specs.voc}
                        />
                        <InfoRow
                          label="Vmp"
                          value={wizardData.panels.specs.Vmp || wizardData.panels.specs.vmp}
                        />
                        <InfoRow
                          label="Isc"
                          value={wizardData.panels.specs.Isc || wizardData.panels.specs.isc}
                        />
                        <InfoRow
                          label="Imp"
                          value={wizardData.panels.specs.Imp || wizardData.panels.specs.imp}
                        />
                        <InfoRow
                          label="Efficiency"
                          value={wizardData.panels.specs.efficiency}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {wizardStep === 5 &&
                (wizardData.installationType === 'Off-grid' ||
                  wizardData.installationType === 'Hybrid') && (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-200">
                        Battery brand + model
                      </label>
                      <input
                        type="text"
                        value={wizardData.battery.brandModel}
                        onChange={(event) =>
                          updateNestedField(
                            'battery',
                            'brandModel',
                            event.target.value
                          )
                        }
                        placeholder="e.g. BYD Battery-Box H11.5"
                        className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-400"
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-200">
                          Number of battery units
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={wizardData.battery.count}
                          onChange={(event) =>
                            updateNestedField(
                              'battery',
                              'count',
                              Number(event.target.value)
                            )
                          }
                          className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-400"
                        />
                      </div>
                      <div className="rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white">
                        {wizardData.battery.count > 0
                          ? `${wizardData.battery.count} unit(s)`
                          : 'Battery optional'}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={
                        !wizardData.battery.brandModel ||
                        wizardData.battery.count < 1 ||
                        loading
                      }
                      onClick={() =>
                        fetchSpecs('battery', 'battery.brandModel', 'battery')
                      }
                      className="inline-flex rounded-3xl bg-yellow-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Fetch battery specs
                    </button>

                    {wizardData.battery.specs?.capacity && (
                      <div className="rounded-3xl border border-slate-700 bg-slate-900 p-5">
                        <div className="mb-4 text-sm font-semibold text-white">
                          Battery specs
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <InfoRow
                            label="Chemistry"
                            value={wizardData.battery.specs.chemistry}
                          />
                          <InfoRow
                            label="Capacity"
                            value={wizardData.battery.specs.capacity}
                          />
                          <InfoRow
                            label="Voltage"
                            value={wizardData.battery.specs.voltage}
                          />
                          <InfoRow
                            label="Max charge current"
                            value={wizardData.battery.specs.maxChargeCurrent}
                          />
                          <InfoRow
                            label="Max discharge current"
                            value={wizardData.battery.specs.maxDischargeCurrent}
                          />
                          <InfoRow
                            label="Cycle life"
                            value={wizardData.battery.specs.cycleLife}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {wizardStep === 6 && wizardData.installationType === 'Off-grid' && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-200">
                      Charge controller brand + model
                    </label>
                    <input
                      type="text"
                      value={wizardData.chargeController.brandModel}
                      onChange={(event) =>
                        updateNestedField(
                          'chargeController',
                          'brandModel',
                          event.target.value
                        )
                      }
                      placeholder="e.g. Victron SmartSolar MPPT 100/50"
                      className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-400"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={
                      !wizardData.chargeController.brandModel || loading
                    }
                    onClick={() =>
                      fetchSpecs(
                        'chargeController',
                        'chargeController.brandModel',
                        'chargeController'
                      )
                    }
                    className="inline-flex rounded-3xl bg-yellow-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Fetch controller specs
                  </button>

                  {wizardData.chargeController.specs?.ratedCurrent && (
                    <div className="rounded-3xl border border-slate-700 bg-slate-900 p-5">
                      <div className="mb-4 text-sm font-semibold text-white">
                        Controller specs
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <InfoRow
                          label="Type"
                          value={wizardData.chargeController.specs.type}
                        />
                        <InfoRow
                          label="Max PV voltage"
                          value={wizardData.chargeController.specs.maxPVVoltage}
                        />
                        <InfoRow
                          label="Rated current"
                          value={wizardData.chargeController.specs.ratedCurrent}
                        />
                        <InfoRow
                          label="Battery voltage"
                          value={wizardData.chargeController.specs.batteryVoltage}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {wizardStep === 7 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        updateField('loadProfileMode', 'daily')
                      }
                      className={`rounded-3xl px-4 py-3 text-sm font-semibold transition ${
                        wizardData.loadProfileMode === 'daily'
                          ? 'bg-yellow-400 text-slate-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Daily energy
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateField('loadProfileMode', 'appliances')
                      }
                      className={`rounded-3xl px-4 py-3 text-sm font-semibold transition ${
                        wizardData.loadProfileMode === 'appliances'
                          ? 'bg-yellow-400 text-slate-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Appliances
                    </button>
                  </div>

                  {wizardData.loadProfileMode === 'daily' ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-200">
                        Daily energy consumption
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={wizardData.dailyLoadKwh}
                          onChange={(event) =>
                            updateField('dailyLoadKwh', Number(event.target.value))
                          }
                          className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-400"
                        />
                        <span className="text-sm text-slate-400">kWh/day</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {wizardData.appliances.map((appliance, index) => (
                        <div
                          key={index}
                          className="grid gap-3 rounded-3xl border border-slate-700 bg-slate-950 p-4 sm:grid-cols-[1.4fr_1fr_1fr_auto]"
                        >
                          <input
                            type="text"
                            value={appliance.name}
                            onChange={(event) => {
                              const next = [...wizardData.appliances]
                              next[index] = {
                                ...next[index],
                                name: event.target.value,
                              }
                              updateField('appliances', next)
                            }}
                            placeholder="Appliance"
                            className="rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-400"
                          />
                          <input
                            type="number"
                            min="0"
                            value={appliance.watts}
                            onChange={(event) => {
                              const next = [...wizardData.appliances]
                              next[index] = {
                                ...next[index],
                                watts: Number(event.target.value),
                              }
                              updateField('appliances', next)
                            }}
                            placeholder="Watts"
                            className="rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-400"
                          />
                          <input
                            type="number"
                            min="0"
                            value={appliance.hours}
                            onChange={(event) => {
                              const next = [...wizardData.appliances]
                              next[index] = {
                                ...next[index],
                                hours: Number(event.target.value),
                              }
                              updateField('appliances', next)
                            }}
                            placeholder="Hours"
                            className="rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-400"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = wizardData.appliances.filter(
                                (_, itemIndex) => itemIndex !== index
                              )
                              updateField('appliances', next)
                            }}
                            className="rounded-3xl bg-red-500 px-3 py-3 text-sm text-white transition hover:bg-red-400"
                          >
                            Remove
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() =>
                          updateField('appliances', [
                            ...wizardData.appliances,
                            { name: '', watts: 0, hours: 0 },
                          ])
                        }
                        className="rounded-3xl bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
                      >
                        Add appliance
                      </button>
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoRow
                      label="Daily load"
                      value={`${loadProfile.dailyLoadKwh.toFixed(1)} kWh`}
                    />
                    <InfoRow
                      label="Peak load"
                      value={`${loadProfile.peakLoadW.toFixed(0)} W`}
                    />
                  </div>
                </div>
              )}

              {wizardStep === 8 && (
                <div className="space-y-6">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-3xl border border-slate-700 bg-slate-950 p-5">
                      <div className="mb-3 text-sm font-semibold text-white">
                        System configuration
                      </div>
                      <InfoRow
                        label="Installation"
                        value={wizardData.installationType}
                      />
                      <InfoRow label="Location" value={wizardData.location} />
                      <InfoRow
                        label="Voltage"
                        value={wizardData.voltageStandard}
                      />
                      <InfoRow
                        label="Peak sun hours"
                        value={`${wizardData.estimatedPSH?.toFixed(1)} h/day`}
                      />
                    </div>

                    <div className="rounded-3xl border border-slate-700 bg-slate-950 p-5">
                      <div className="mb-3 text-sm font-semibold text-white">
                        Generation estimate
                      </div>
                      <InfoRow
                        label="Panel count"
                        value={`${panelConfig.panelCount}`}
                      />
                      <InfoRow
                        label="Panel wattage"
                        value={`${wizardData.panels.specs?.wattage || '—'}`}
                      />
                      <InfoRow
                        label="Estimated daily generation"
                        value={`${estimateGenerationKwh.toFixed(1)} kWh`}
                      />
                      <InfoRow
                        label="Load requirement"
                        value={`${loadProfile.dailyLoadKwh.toFixed(1)} kWh`}
                      />
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-700 bg-slate-900 p-5">
                    <div className="mb-3 text-sm font-semibold text-white">
                      Compatibility check
                    </div>
                    <div className="space-y-3 text-sm text-slate-300">
                      <div>
                        <strong>String voltage:</strong>{' '}
                        {panelConfig.totalVoltage.toFixed(1)} V
                      </div>
                      <div>
                        <strong>String current:</strong>{' '}
                        {panelConfig.totalCurrent.toFixed(1)} A
                      </div>
                      <div>
                        <strong>Inverter max input:</strong>{' '}
                        {inverterMaxVoltage
                          ? `${inverterMaxVoltage} V`
                          : 'Unknown'}
                      </div>
                      <div>
                        <strong>Inverter max current:</strong>{' '}
                        {inverterMaxCurrent
                          ? `${inverterMaxCurrent} A`
                          : 'Unknown'}
                      </div>
                      {inverterMaxVoltage > 0 &&
                        panelConfig.totalVoltage > inverterMaxVoltage && (
                          <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-200">
                            Panel string voltage exceeds inverter input voltage.
                          </div>
                        )}
                      {inverterMaxCurrent > 0 &&
                        panelConfig.totalCurrent > inverterMaxCurrent && (
                          <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-200">
                            Panel current exceeds inverter max current.
                          </div>
                        )}
                      {estimateGenerationKwh < loadProfile.dailyLoadKwh && (
                        <div className="rounded-2xl border border-yellow-400/40 bg-yellow-400/10 p-3 text-sm text-yellow-100">
                          Estimated generation is lower than daily load.
                        </div>
                      )}
                      {inverterRatedPower > 0 &&
                        loadProfile.peakLoadW > inverterRatedPower && (
                          <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-200">
                            Peak load exceeds inverter rated output.
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  disabled={wizardStep === 1}
                  onClick={() => goToWizardStep(wizardStep - 1)}
                  className="rounded-3xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Back
                </button>

                <div className="flex flex-wrap gap-3">
                  {wizardStep < 8 ? (
                    <button
                      type="button"
                      disabled={!canProceed()}
                      onClick={() => goToWizardStep(wizardStep + 1)}
                      className="rounded-3xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={applyWizardConfig}
                      className="rounded-3xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
                    >
                      Confirm and populate canvas
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <aside className="hidden w-96 border-l border-slate-700/70 bg-slate-950/80 p-6 lg:block">
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
              Summary
            </div>
            <div className="mt-4 space-y-4">
              <div className="rounded-3xl border border-slate-700 bg-slate-900 p-5">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                  Inverter
                </div>
                <div className="mt-3 text-sm text-slate-100">
                  {wizardData.inverter.brandModel || 'Not configured'}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-700 bg-slate-900 p-5">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                  Panels
                </div>
                <div className="mt-3 text-sm text-slate-100">
                  {wizardData.panels.brandModel || 'Not configured'}
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  {panelConfig.panelCount} panels
                </div>
              </div>

              {(wizardData.installationType === 'Off-grid' ||
                wizardData.installationType === 'Hybrid') && (
                <>
                  <div className="rounded-3xl border border-slate-700 bg-slate-900 p-5">
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                      Battery
                    </div>
                    <div className="mt-3 text-sm text-slate-100">
                      {wizardData.battery.brandModel || 'Not configured'}
                    </div>
                  </div>
                  {wizardData.installationType === 'Off-grid' && (
                    <div className="rounded-3xl border border-slate-700 bg-slate-900 p-5">
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                        Charge controller
                      </div>
                      <div className="mt-3 text-sm text-slate-100">
                        {wizardData.chargeController.brandModel ||
                          'Not configured'}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="rounded-3xl border border-slate-700 bg-slate-900 p-5">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                  Load
                </div>
                <div className="mt-3 text-sm text-slate-100">
                  {loadProfile.dailyLoadKwh.toFixed(1)} kWh/day
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default SetupWizard
