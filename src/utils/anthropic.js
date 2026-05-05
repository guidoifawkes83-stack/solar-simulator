export async function fetchAnthropicSpec(prompt) {
  console.log('API Key starts with:', import.meta.env.VITE_ANTHROPIC_API_KEY?.slice(0, 10));
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    console.log('Response status:', response.status, response.statusText);
    throw new Error(`Anthropic lookup failed: ${response.statusText}`)
  }

  const data = await response.json()
  const content = data.content?.[0]?.text || ''

  return parseAnthropicJson(content)
}

function parseAnthropicJson(raw) {
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch (err) {
    const match = raw.match(/(\{[\s\S]*\})/)
    if (match) {
      try {
        return JSON.parse(match[1])
      } catch {
        return {}
      }
    }
  }
  return {}
}

const prompts = {
  inverter: (query) => `
You are a solar system spec assistant.
Provide inverter specs for the model "${query}".
Return ONLY a valid JSON object with keys:
ratedPower, maxInputVoltage, mpptVoltageRange, maxInputCurrent, acOutputVoltage, efficiency.
Use units where appropriate and keep values concise.
Do not include any other text, explanation, or formatting.
`,
  solarPanel: (query) => `
You are a solar equipment database assistant.
Provide solar panel specs for the model "${query}".
Return ONLY a JSON object with keys:
wattage, Voc, Vmp, Isc, Imp, efficiency, dimensions.
Use units where appropriate and keep values concise.
`,
  battery: (query) => `
You are a solar battery spec assistant.
Provide battery specs for the model "${query}".
Return ONLY a JSON object with keys:
chemistry, capacity, voltage, maxChargeCurrent, maxDischargeCurrent, cycleLife.
Use units where appropriate and keep values concise.
`,
  chargeController: (query) => `
You are a solar charge controller spec assistant.
Provide charge controller specs for the model "${query}".
Return ONLY a JSON object with keys:
type, maxPVVoltage, ratedCurrent, batteryVoltage.
Use units where appropriate and keep values concise.
`,
}

export async function lookupComponentSpecs(componentType, query) {
  if (!query) return {}
  const promptBuilder = prompts[componentType]
  if (!promptBuilder) return {}
  const prompt = promptBuilder(query)
  return await fetchAnthropicSpec(prompt)
}
