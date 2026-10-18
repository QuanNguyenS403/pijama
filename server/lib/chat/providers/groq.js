/**
 * Groq Cloud Provider (Free Tier LPU Inference)
 * Sử dụng native fetch với OpenAI-compatible endpoint.
 */

export async function generateGroq({
  apiKey,
  system,
  messages = [],
  maxTokens = 350,
  model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
}) {
  if (!apiKey) {
    throw new Error('GROQ_API_KEY_MISSING')
  }

  const formattedMessages = []
  if (system) {
    formattedMessages.push({ role: 'system', content: system })
  }

  for (const m of messages) {
    const role = m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user'
    formattedMessages.push({ role, content: m.content || '' })
  }

  const url = 'https://api.groq.com/openai/v1/chat/completions'

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: formattedMessages,
      temperature: 0.65,
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(4000),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    const error = new Error(`Groq API Error ${res.status}: ${errorBody.slice(0, 300)}`)
    error.status = res.status
    error.provider = 'groq'
    throw error
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content || ''

  return {
    text: text.trim(),
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
    provider: 'groq',
    model,
  }
}
