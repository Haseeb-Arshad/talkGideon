// Talks to the GIDEON brain server. Keeps the conversation history and streams
// the reply back token-by-token via Server-Sent Events.

export class Brain {
  constructor() {
    this.history = []
    this.mode = 'offline'
  }

  async health() {
    try {
      const r = await fetch('/api/health')
      const j = await r.json()
      this.mode = j.mode
      return j
    } catch {
      this.mode = 'unknown'
      return { ok: false, mode: 'unknown' }
    }
  }

  // Send the user's line; calls onDelta(text) as the reply streams, returns the
  // full reply string when complete.
  async send(userText, { onDelta, onError } = {}) {
    this.history.push({ role: 'user', content: userText })

    let full = ''
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: this.history }),
      })
      if (!res.ok || !res.body) throw new Error('bad response')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // Parse complete SSE events (separated by a blank line).
        let sep
        while ((sep = buffer.indexOf('\n\n')) !== -1) {
          const raw = buffer.slice(0, sep)
          buffer = buffer.slice(sep + 2)
          const evt = parseEvent(raw)
          if (!evt) continue
          if (evt.event === 'delta' && evt.data?.text) {
            full += evt.data.text
            onDelta?.(evt.data.text)
          } else if (evt.event === 'error') {
            onError?.(evt.data?.message || 'error')
          }
        }
      }
    } catch (err) {
      onError?.('connection lost')
      if (!full) full = "I lost the thread there for a second. Try me again?"
    }

    full = full.trim()
    if (full) this.history.push({ role: 'assistant', content: full })
    return full
  }
}

function parseEvent(raw) {
  let event = 'message'
  let dataLines = []
  for (const line of raw.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
  }
  if (!dataLines.length) return null
  try {
    return { event, data: JSON.parse(dataLines.join('\n')) }
  } catch {
    return { event, data: null }
  }
}
