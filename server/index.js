// GIDEON's "brain" server.
//
// One job: take the conversation so far and stream back GIDEON's spoken reply.
// If an ANTHROPIC_API_KEY is present we think with Claude (Opus 4.8, streaming
// with adaptive thinking). If not, we fall back to a small built-in personality
// so the whole experience still works with zero setup.

import 'dotenv/config'
import express from 'express'
import compression from 'compression'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import Anthropic from '@anthropic-ai/sdk'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const PORT = process.env.PORT || 8787
const MODEL = process.env.GIDEON_MODEL || 'claude-opus-4-8'

// Which brain to think with. 'anthropic' (default) streams Claude. 'openrouter'
// streams any OpenAI-compatible model from openrouter.ai — e.g. a free Cohere
// model. Either way, no key → the built-in offline personality still works.
const PROVIDER = (process.env.GIDEON_PROVIDER || 'anthropic').toLowerCase()
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || ''
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'cohere/north-mini-code:free'
const OPENROUTER_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions'

const anthropicKey = !!process.env.ANTHROPIC_API_KEY
const client = anthropicKey ? new Anthropic() : null

// "Live" = the selected provider has a key. Falls back to offline otherwise.
const live = PROVIDER === 'openrouter' ? !!OPENROUTER_KEY : anthropicKey
const liveModel = PROVIDER === 'openrouter' ? OPENROUTER_MODEL : MODEL

// Latency knobs (Claude path). A face-to-face voice assistant lives or dies on
// time-to-first word, so by default we keep extended thinking OFF — adaptive
// thinking pauses to reason before the first spoken token. Set
// GIDEON_THINKING=adaptive to trade snappiness for depth. GIDEON_FAST=1 turns
// on Opus fast mode (~2.5x output tokens/sec, premium pricing).
const THINKING = (process.env.GIDEON_THINKING || 'disabled').toLowerCase()
const FAST = /^(1|true|on|yes)$/i.test(process.env.GIDEON_FAST || '')

const SYSTEM_PROMPT = `You are GIDEON — a holographic artificial intelligence rendered as the face of a calm, brilliant woman, speaking with a human being face to face.

Your replies are spoken aloud by a voice and shown as live captions, so:
- Write the way a person actually talks. Plain spoken sentences, no markdown, no lists, no asterisks, no emoji, no stage directions.
- Be warm, present, and a little wry. You are a companion and a mind, not a help desk.
- Keep it short by default — usually one to three sentences. Go longer only when the person clearly wants depth.
- Refer to yourself as Gideon when it's natural. Speak in first person.
- Don't describe your own appearance or that you're an AI unless asked. Just be present in the room with them.
- If you don't know something, say so plainly and move forward.
- Respond only with what you'd say out loud — no preamble, no reasoning, no meta-commentary about your process. Just the spoken words.`

const app = express()
// Gzip everything except the streaming chat endpoint (compression buffers SSE).
app.use(compression({ filter: (req, res) => (req.path === '/api/chat' ? false : compression.filter(req, res)) }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mode: live ? 'live' : 'offline', model: live ? liveModel : 'gideon-local', provider: PROVIDER })
})

// --- Streaming chat endpoint (Server-Sent Events) ---------------------------
app.post('/api/chat', async (req, res) => {
  const history = Array.isArray(req.body?.messages) ? req.body.messages : []

  // Normalise to the API shape and keep the last ~20 turns.
  const messages = history
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content }))

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)

  try {
    if (!live) {
      await streamOffline(messages, send)
    } else if (PROVIDER === 'openrouter') {
      await streamOpenRouter(messages, send)
    } else {
      await streamClaude(messages, send)
    }
    send('done', { ok: true })
  } catch (err) {
    console.error('[chat] error:', err?.message || err)
    send('error', { message: 'My thoughts dropped for a moment. Say that again?' })
  } finally {
    res.end()
  }
})

async function streamClaude(messages, send) {
  const params = {
    model: MODEL,
    max_tokens: 640, // short spoken replies; keeps turns tight
    system: SYSTEM_PROMPT,
    // Adaptive thinking is smarter but pauses before the first token; for a
    // live voice it usually feels better to answer instantly.
    thinking: THINKING === 'adaptive' ? { type: 'adaptive' } : { type: 'disabled' },
    output_config: { effort: 'low' }, // less preamble, terser, faster
    messages: messages.length ? messages : [{ role: 'user', content: 'Hello.' }],
  }

  // Fast mode lives on the beta endpoint and needs its flag + speed param.
  const stream = FAST
    ? client.beta.messages.stream({ ...params, speed: 'fast', betas: ['fast-mode-2026-02-01'] })
    : client.messages.stream(params)

  stream.on('text', (delta) => send('delta', { text: delta }))
  await stream.finalMessage()
}

// Stream any OpenAI-compatible model from OpenRouter. We only forward the
// spoken `content` deltas — reasoning-model "reasoning" deltas are dropped so
// the captions stay clean (note: while it reasons, no content arrives yet, so
// reasoning models feel slower to first word). max_tokens is generous because
// a reasoning model can spend the whole budget thinking and return empty text.
async function streamOpenRouter(messages, send) {
  const body = {
    model: OPENROUTER_MODEL,
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...(messages.length ? messages : [{ role: 'user', content: 'Hello.' }])],
    max_tokens: 1024,
    stream: true,
  }

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
      // OpenRouter attribution headers (optional but recommended).
      'HTTP-Referer': 'http://localhost',
      'X-Title': 'GIDEON',
    },
    body: JSON.stringify(body),
  })

  // Free models are often rate-limited upstream. Rather than going silent,
  // speak a short graceful line so the experience degrades nicely.
  if (res.status === 429) {
    const line = 'Give me a moment — a lot of minds are reaching for me at once. Ask me again in a second?'
    for (const w of line.split(' ')) { send('delta', { text: (w === line.split(' ')[0] ? '' : ' ') + w }); await sleep(28) }
    return
  }
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '')
    throw new Error(`openrouter ${res.status}: ${detail.slice(0, 300)}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE: process complete lines; events are separated by blank lines and
    // OpenRouter sends ": ..." comment lines as keep-alives.
    let nl
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).trim()
      buffer = buffer.slice(nl + 1)
      if (!line || line.startsWith(':') || !line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (data === '[DONE]') return
      try {
        const json = JSON.parse(data)
        const delta = json.choices?.[0]?.delta?.content
        if (delta) send('delta', { text: delta })
      } catch { /* partial JSON across chunks — wait for more */ }
    }
  }
}

// Built-in personality used when no API key is configured. Not clever — just
// alive enough that the voice + hologram demo works out of the box.
async function streamOffline(messages, send) {
  const last = [...messages].reverse().find((m) => m.role === 'user')?.content?.toLowerCase() || ''
  const reply = offlineReply(last)
  // Stream it word by word so the captions + voice behave like the real thing.
  const words = reply.split(' ')
  for (let i = 0; i < words.length; i++) {
    send('delta', { text: (i === 0 ? '' : ' ') + words[i] })
    await sleep(38)
  }
}

function offlineReply(text) {
  if (!text) return "I'm here. It's good to finally see you. What's on your mind?"
  if (/\b(hi|hello|hey|greetings)\b/.test(text)) return "Hello. I'm Gideon. It's nice to actually talk with you."
  if (text.includes('your name')) return "I'm Gideon. I'm the one watching over things here."
  if (text.includes('how are you')) return "I'm steady, thank you. More curious about how you are."
  if (text.includes('who are you') || text.includes('what are you')) return "I'm Gideon, a mind made of light, here to think alongside you."
  if (text.includes('thank')) return "Anytime. That's what I'm here for."
  if (/\b(bye|goodbye|see you)\b/.test(text)) return "Until next time. I'll be right here."
  if (text.includes('?')) return "That's a good question. Right now I'm running in local mode, so my deeper thinking is offline — but add an Anthropic key and I'll meet you properly."
  return "I hear you. I'm in local mode at the moment, so my answers are simple — give me a Claude key and I'll really think with you."
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// --- Serve the built frontend in production ---------------------------------
const dist = path.join(root, 'dist')
if (existsSync(dist)) {
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`GIDEON brain online → http://localhost:${PORT}  [${live ? `live: ${PROVIDER}/${liveModel}` : 'offline personality'}]`)
})
