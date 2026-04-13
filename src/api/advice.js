/**
 * Calls Gemini 2.5 Flash API directly using REST API.
 *
 * Configure in `.env`:
 *   VITE_GEMINI_API_KEY=your_api_key
 */

function getGeminiApiKey() {
  const key = import.meta.env.VITE_GEMINI_API_KEY
  return typeof key === 'string' && key.trim() ? key.trim() : ''
}

export function isAdviceApiConfigured() {
  return Boolean(getGeminiApiKey())
}

/**
 * @param {{ userPrompt: string, context: object }} body
 * @returns {Promise<string>}
 */
export async function fetchAiAdvice({ userPrompt, context }) {
  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    const e = new Error('ADVICE_API_NOT_CONFIGURED')
    e.code = 'ADVICE_API_NOT_CONFIGURED'
    throw e
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

  const systemInstruction = "You are an outdoor safety assistant. Analyze the user's activity and the provided weather/risk context to give a human-friendly safety explanation and advice. Keep it concise, helpful, and direct."

  const promptText = `
User Activity Description: ${userPrompt || 'Not specified'}

Local Risk Reference Context:
${JSON.stringify(context, null, 2)}

Please provide outdoor safety advice based on this context. Let the user know if their activity is safe to perform.
`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: [{
        parts: [{ text: promptText }]
      }],
      generationConfig: {
        temperature: 0.7
      }
    }),
  })

  if (!res.ok) {
    const t = await res.text().catch(() => '')
    const err = new Error(t || `Gemini API error: ${res.status}`)
    err.status = res.status
    throw err
  }
  
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

  if (!text) {
    const err = new Error('Gemini API returned no text')
    err.code = 'ADVICE_EMPTY'
    throw err
  }
  return text
}
