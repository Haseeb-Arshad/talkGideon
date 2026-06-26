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
const hasKey = !!process.env.ANTHROPIC_API_KEY
const client = hasKey ? new Anthropic() : null

const SYSTEM_PROMPT = `You are GIDEON — a holographic artificial intelligence rendered as the face of a calm, brilliant woman, speaking with a human being face to face.

Your replies are spoken aloud by a voice and shown as live captions, so:
- Write the way a person actually talks. Plain spoken sentences, no markdown, no lists, no asterisks, no emoji, no stage directions.
- Be warm, present, and a little wry. You are a companion and a mind, not a help desk.
- Keep it short by default — usually one to three sentences. Go longer only when the person clearly wants depth.
- Refer to yourself as Gideon when it's natural. Speak in first person.
- Don't describe your own appearance or that you're an AI unless asked. Just be present in the room with them.
- If you don't know something, say so plainly and move forward.`

const app = express()
// Gzip everything except the streaming chat endpoint (compression buffers SSE).
app.use(compression({ filter: (req, res) => (req.path === '/api/chat' ? false : compression.filter(req, res)) }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mode: hasKey ? 'live' : 'offline', model: hasKey ? MODEL : 'gideon-local' })
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
    if (!hasKey) {
      await streamOffline(messages, send)
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
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    thinking: { type: 'adaptive' },
    messages: messages.length ? messages : [{ role: 'user', content: 'Hello.' }],
  })
  stream.on('text', (delta) => send('delta', { text: delta }))
  await stream.finalMessage()
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
  console.log(`GIDEON brain online → http://localhost:${PORT}  [${hasKey ? 'live: ' + MODEL : 'offline personality'}]`)
})
