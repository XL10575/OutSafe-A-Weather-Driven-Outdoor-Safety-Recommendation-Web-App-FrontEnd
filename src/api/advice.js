/**
 * Optional backend that forwards `userPrompt` + `context` to an LLM.
 *
 * Configure in `.env`:
 *   VITE_ADVICE_API_URL=https://your-server.com/api/outdoor-advice
 *   VITE_ADVICE_API_KEY=...   (optional; sent as Authorization: Bearer …)
 *
 * Expected request: POST JSON `{ userPrompt: string, context: object }`
 * Expected response JSON (any one): `{ advice }` | `{ message }` | `{ content }` | `{ text }`
 */

function adviceApiUrl() {
  const u = import.meta.env.VITE_ADVICE_API_URL
  return typeof u === 'string' && u.trim() ? u.trim() : ''
}

export function isAdviceApiConfigured() {
  return Boolean(adviceApiUrl())
}

/**
 * @param {{ userPrompt: string, context: object }} body
 * @returns {Promise<string>}
 */
export async function fetchAiAdvice({ userPrompt, context }) {
  const url = adviceApiUrl()
  if (!url) {
    const e = new Error('ADVICE_API_NOT_CONFIGURED')
    e.code = 'ADVICE_API_NOT_CONFIGURED'
    throw e
  }
  const headers = { 'Content-Type': 'application/json' }
  const key = import.meta.env.VITE_ADVICE_API_KEY
  if (key) headers.Authorization = `Bearer ${key}`

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      userPrompt: userPrompt || '',
      context,
    }),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    const err = new Error(t || `Advice API error: ${res.status}`)
    err.status = res.status
    throw err
  }
  const data = await res.json().catch(async () => {
    const t = await res.text()
    return typeof t === 'string' && t.trim() ? { advice: t.trim() } : {}
  })
  const text =
    (typeof data?.advice === 'string' && data.advice) ||
    (typeof data?.message === 'string' && data.message) ||
    (typeof data?.content === 'string' && data.content) ||
    (typeof data?.text === 'string' && data.text) ||
    ''
  if (!text) {
    const err = new Error('Advice API returned no text field (advice/message/content/text)')
    err.code = 'ADVICE_EMPTY'
    throw err
  }
  return text
}
