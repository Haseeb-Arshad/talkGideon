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
  brainTag: document.getElementById('brainTag'),
}

// Short label for the brain currently in use, e.g. "north-mini-code" or
// "claude-opus-4-8". Empty in offline/local mode.
function brainLabel(h) {
  if (!h || h.mode !== 'live' || !h.model) return ''
  return h.model.split('/').pop().replace(/:free$/, '')
}

const captions = new Captions()
const brain = new Brain()
const hologram = new Hologram(els.canvas)
const speaker = new Speaker(hologram)

let listening = false // voice conversation mode
let busy = false // thinking or speaking
let ready = false
let turnId = 0 // bumps every turn so an interrupted reply can't clobber the new one
let speechTurn = 0 // which turn the current speech belongs to

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

// Cut off whatever she's saying right now (barge-in).
function interrupt() {
  brain.abort()
  speaker.stop()
  els.eq.classList.remove('on')
}

// Fully stop the current turn (Esc / tap): cancel, invalidate it, go idle.
function stopTurn() {
  interrupt()
  turnId++ // the in-flight handleUtterance will see myTurn !== turnId and bail
  endTurn(turnId)
}

// --- A single turn ---------------------------------------------------------
async function handleUtterance(text) {
  text = (text || '').trim()
  if (!text) return
  interrupt() // barge-in: a new line silences whatever she's saying (incl. the greeting)

  const myTurn = ++turnId
  speechTurn = myTurn
  busy = true
  recognizer.stop()

  captions.user(text)
  setStatus('think', 'thinking')
  hologram.setMood('think')

  let acc = ''
  let pending = ''
  let spoke = false

  const flush = (final = false) => {
    if (myTurn !== turnId) return
    const parts = pending.split(/(?<=[.!?…])\s+/)
    pending = final ? '' : parts.pop()
    for (const p of parts) { const s = p.trim(); if (s) { speaker.speak(s); spoke = true } }
    if (final && pending.trim()) { speaker.speak(pending.trim()); spoke = true }
  }

  await brain.send(text, {
    onDelta: (d) => {
      if (myTurn !== turnId) return
      acc += d
      pending += d
      captions.ai(acc, { streaming: true })
      if (/[.!?…]\s/.test(pending)) flush(false)
    },
    onError: (m) => console.warn('brain:', m),
  })

  if (myTurn !== turnId) return // superseded by a newer line
  captions.ai(acc || '…')
  flush(true)
  if (!spoke || !speaker.supported) endTurn(myTurn)
}

speaker.onStart = () => {
  if (speechTurn !== turnId) return
  setStatus('speak', 'speaking')
  els.eq.classList.add('on')
}
speaker.onEnd = () => { els.eq.classList.remove('on'); endTurn(speechTurn) }

function endTurn(forTurn) {
  if (forTurn !== undefined && forTurn !== turnId) return // a newer turn owns the floor
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

// --- Pointer: parallax when hovering, drag to spin, tap to interrupt -------
let dragging = false
let dragMoved = 0
let lastX = 0
let lastY = 0

window.addEventListener('pointermove', (e) => {
  if (dragging) {
    const dx = e.clientX - lastX
    const dy = e.clientY - lastY
    lastX = e.clientX; lastY = e.clientY
    dragMoved += Math.abs(dx) + Math.abs(dy)
    hologram.nudgeRotation(dx / window.innerWidth, dy / window.innerHeight)
  } else {
    hologram.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1)
  }
})
els.canvas.addEventListener('pointerdown', (e) => {
  dragging = true
  dragMoved = 0
  lastX = e.clientX; lastY = e.clientY
  els.canvas.setPointerCapture?.(e.pointerId)
})
els.canvas.addEventListener('pointerup', (e) => {
  dragging = false
  els.canvas.releasePointerCapture?.(e.pointerId)
  // A tap (not a drag) on the stage while she's talking cuts her off.
  if (dragMoved < 6 && busy) stopTurn()
})

// Esc interrupts; "/" jumps to the text box.
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && busy) stopTurn()
  else if (e.key === '/' && document.activeElement !== els.input) { e.preventDefault(); els.input.focus() }
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

  const tag = brainLabel(h)
  els.brainTag.textContent = tag
  els.brainTag.classList.toggle('show', !!tag)

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
