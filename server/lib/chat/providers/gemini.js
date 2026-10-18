/**
 * Google Gemini Provider (Free Tier via Google AI Studio)
 * Sử dụng native fetch, không yêu cầu thư viện bên ngoài.
 * Endpoint: Google Generative Language API v1beta
 */

export async function generateGemini({
  apiKey,
  system,
  messages = [],
  maxTokens = 350,
  model = 'gemini-2.0-flash',
}) {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING')
  }

  // Format lịch sử hội thoại cho Gemini API
  const contents = []
  for (const m of messages) {
    const role = m.role === 'assistant' || m.role === 'model' ? 'model' : 'user'
    contents.push({
      role,
      parts: [{ text: m.content || '' }],
    })
  }

  // Đảm bảo tin nhắn cuối cùng là user
  if (contents.length === 0 || contents[contents.length - 1].role !== 'user') {
    contents.push({
      role: 'user',
      parts: [{ text: 'Dạ anh/chị cần em hỗ trợ thêm gì không ạ?' }],
    })
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const payload = {
    system_instruction: {
      parts: [{ text: system || '' }],
    },
    contents,
    generationConfig: {
      temperature: 0.65,
      maxOutputTokens: maxTokens,
    },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(4500),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    const error = new Error(`Gemini API Error ${res.status}: ${errorBody.slice(0, 300)}`)
    error.status = res.status
    error.provider = 'gemini'
    throw error
  }

  const data = await res.json()
  const candidate = data.candidates?.[0]
  const text = candidate?.content?.parts?.[0]?.text || ''

  return {
    text: text.trim(),
    usage: {
      promptTokens: data.usageMetadata?.promptTokenCount || 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: data.usageMetadata?.totalTokenCount || 0,
    },
    provider: 'gemini',
    model,
  }
}
