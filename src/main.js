import './style.css'
import { Hologram } from './scene/hologram.js'
import { createRecognizer } from './voice/stt.js'
import { Speaker } from './voice/tts.js'
import { Brain } from './ai/brain.js'
import { Captions } from './ui/captions.js'

const els = {
  canvas: document.getElementById('stage'),
  boot: document.getElementById('boot'),
  bootBtn: document.getElementById('bootBtn'),
  bootNote: document.getElementById('bootNote'),
  mic: document.getElementById('micBtn'),
  form: document.getElementById('inputForm'),
  input: document.getElementById('textInput'),
  hint: document.getElementById('hint'),
  eq: document.getElementById('eq'),
  statusDot: document.getElementById('statusDot'),
  statusText: document.getElementById('statusText'),
}

const captions = new Captions()
const brain = new Brain()
const hologram = new Hologram(els.canvas)
const speaker = new Speaker(hologram)

let listening = false // voice conversation mode
let busy = false // thinking or speaking
let ready = false

function setStatus(state, text) {
  els.statusDot.className = 'dot ' + (state || '')
  els.statusText.textContent = text
}
const idleStatus = () =>
  brain.mode === 'live' ? setStatus('live', 'online') : setStatus('', 'local mode')

// --- Speech recognition (optional) -----------------------------------------
const recognizer = createRecognizer({
  onStart: () => { if (!busy) setStatus('listen', 'listening') },
  onInterim: (t) => captions.user(t, { interim: true }),
  onFinal: (t) => handleUtterance(t),
  onEnd: (manual) => {
    if (listening && !busy && !manual) setTimeout(() => { if (listening && !busy) recognizer.start() }, 250)
  },
  onError: (e) => console.warn('STT:', e),
})

// --- A single turn ---------------------------------------------------------
async function handleUtterance(text) {
  text = (text || '').trim()
  if (!text || busy) return
  busy = true
  recognizer.stop()
  speaker.stop()

  captions.user(text)
  setStatus('think', 'thinking')
  hologram.setMood('think')

  let acc = ''
  let pending = ''
  let spoke = false

  const flush = (final = false) => {
    const parts = pending.split(/(?<=[.!?…])\s+/)
    pending = final ? '' : parts.pop()
    for (const p of parts) { const s = p.trim(); if (s) { speaker.speak(s); spoke = true } }
    if (final && pending.trim()) { speaker.speak(pending.trim()); spoke = true }
  }

  await brain.send(text, {
    onDelta: (d) => {
      acc += d
      pending += d
      captions.ai(acc, { streaming: true })
      if (/[.!?…]\s/.test(pending)) flush(false)
    },
    onError: (m) => console.warn('brain:', m),
  })

  captions.ai(acc || '…')
  flush(true)
  if (!spoke || !speaker.supported) endTurn()
}

speaker.onStart = () => { setStatus('speak', 'speaking'); els.eq.classList.add('on') }
speaker.onEnd = () => { els.eq.classList.remove('on'); endTurn() }

function endTurn() {
  busy = false
  if (listening) {
    setStatus('listen', 'listening')
    hologram.setMood('listen')
    recognizer.start()
  } else {
    idleStatus()
    hologram.setMood('idle')
    els.input.focus()
  }
}

// --- Text input (works in every browser) -----------------------------------
els.form.addEventListener('submit', (e) => {
  e.preventDefault()
  if (!ready) return
  const text = els.input.value
  els.input.value = ''
  handleUtterance(text)
})

// --- Microphone (Chromium) -------------------------------------------------
function startListening() {
  listening = true
  els.mic.classList.add('active')
  hologram.setMood('listen')
  setStatus('listen', 'listening')
  recognizer.start()
}
function stopListening() {
  listening = false
  els.mic.classList.remove('active')
  recognizer.stop()
  speaker.stop()
  els.eq.classList.remove('on')
  busy = false
  idleStatus()
  hologram.setMood('idle')
}
els.mic.addEventListener('click', () => {
  if (!ready || !recognizer.supported) return
  listening ? stopListening() : startListening()
})

// --- Pointer parallax ------------------------------------------------------
window.addEventListener('pointermove', (e) => {
  hologram.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1)
})

// --- Boot ------------------------------------------------------------------
async function boot() {
  els.bootBtn.disabled = true
  try {
    await hologram.load()
  } catch (err) {
    console.error(err)
    els.bootNote.textContent = 'Could not start the hologram. Check the console.'
    els.bootBtn.disabled = false
    return
  }
  hologram.start()
  ready = true

  const h = await brain.health()
  idleStatus()

  if (!recognizer.supported || !speaker.supported) {
    els.mic.classList.toggle('disabled', !recognizer.supported)
    els.hint.textContent = recognizer.supported ? 'type or speak' : 'type to talk · voice input not supported here'
  } else {
    els.hint.textContent = 'type, or tap the mic to speak'
  }

  els.boot.classList.add('hide')
  els.input.focus()

  const greeting = h.mode === 'live'
    ? "Hello. I'm Gideon. It's good to finally see you — what's on your mind?"
    : "Hello. I'm Gideon, running in local mode. Add a Claude key when you're ready and I'll truly think with you. For now, talk to me."
  brain.history.push({ role: 'assistant', content: greeting })
  captions.ai(greeting)
  if (speaker.supported) setTimeout(() => speaker.speak(greeting), 350)
}

els.bootBtn.addEventListener('click', boot)

// Begin loading immediately so "Wake her" is instant.
hologram.load().then(() => { els.bootNote.textContent = 'ready' }).catch(() => {})
