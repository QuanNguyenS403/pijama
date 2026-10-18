/**
 * OpenRouter Provider (Free Tier router)
 */

export async function generateOpenRouter({
  apiKey,
  system,
  messages = [],
  maxTokens = 350,
  model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
}) {
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY_MISSING')
  }

  const formattedMessages = []
  if (system) {
    formattedMessages.push({ role: 'system', content: system })
  }

  for (const m of messages) {
    const role = m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user'
    formattedMessages.push({ role, content: m.content || '' })
  }

  const url = 'https://openrouter.ai/api/v1/chat/completions'

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://quannguyens.com',
      'X-Title': 'QuanNguyenS Assistant',
    },
    body: JSON.stringify({
      model,
      messages: formattedMessages,
      temperature: 0.65,
      max_tokens: maxTokens,
    }),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    const error = new Error(`OpenRouter API Error ${res.status}: ${errorBody.slice(0, 300)}`)
    error.status = res.status
    error.provider = 'openrouter'
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
    provider: 'openrouter',
    model,
  }
}
