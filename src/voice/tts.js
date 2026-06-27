// Text-to-speech using the browser's speech synthesis.
// Sentences are queued so GIDEON can start speaking the first line while the
// rest of the reply is still streaming in. While she speaks, the hologram's
// mouth moves; each spoken word nudges it with a "pulse".

export class Speaker {
  constructor(hologram) {
    this.holo = hologram
    this.synth = window.speechSynthesis
    this.voice = null
    this.queue = []
    this.speaking = false
    this.onStart = null
    this.onEnd = null
    this._pickVoice()
    if (this.synth) this.synth.onvoiceschanged = () => this._pickVoice()
  }

  get supported() { return !!this.synth }

  _pickVoice() {
    if (!this.synth) return
    const voices = this.synth.getVoices()
    if (!voices.length) return
    const en = voices.filter((v) => /^en/i.test(v.lang))
    const pool = en.length ? en : voices
    // Prefer a natural-sounding female English voice when one exists.
    const prefer = [
      'Google UK English Female',
      'Microsoft Aria',
      'Microsoft Jenny',
      'Microsoft Sonia',
      'Samantha',
      'Google US English',
    ]
    for (const name of prefer) {
      const m = pool.find((v) => v.name.includes(name))
      if (m) { this.voice = m; return }
    }
    const female = pool.find((v) => /female|aria|jenny|sonia|samantha|zira|eva|hazel/i.test(v.name))
    this.voice = female || pool[0]
  }

  // Queue a chunk of text (one or more sentences).
  speak(text) {
    if (!this.synth || !text.trim()) return
    this.queue.push(text.trim())
    if (!this.speaking) this._next()
  }

  _next() {
    if (!this.queue.length) {
      this.speaking = false
      this.holo?.setSpeaking(false)
      this.onEnd?.()
      return
    }
    if (!this.speaking) {
      this.speaking = true
      this.holo?.setSpeaking(true)
      this.onStart?.()
    }
    const text = this.queue.shift()
    const u = new SpeechSynthesisUtterance(text)
    if (this.voice) u.voice = this.voice
    u.rate = 1.0
    u.pitch = 1.05
    u.volume = 1.0
    // Drive the mouth from the actual word being spoken: open wide on vowels,
    // softer on consonants, so the jaw tracks speech instead of guessing.
    u.onboundary = (e) => {
      if (e.name === 'sentence') return
      const word = wordAt(text, e.charIndex ?? 0)
      this.holo?.setTalkTarget(openness(word))
    }
    u.onend = () => this._next()
    u.onerror = () => this._next()
    this.synth.speak(u)
  }

  stop() {
    this.queue.length = 0
    if (this.synth) this.synth.cancel()
    this.speaking = false
    this.holo?.setSpeaking(false)
  }
}

// The word straddling charIndex within the full utterance text.
function wordAt(text, i) {
  const left = text.slice(0, i).search(/\S+$/)
  const start = left === -1 ? i : left
  const m = text.slice(start).match(/^\S+/)
  return m ? m[0] : ''
}

// Rough viseme amplitude for a word: vowels open the mouth, length adds weight.
function openness(word) {
  if (!word) return 0.4
  const w = word.toLowerCase()
  let v = 0
  for (const ch of w) {
    if ('aeiouy'.includes(ch)) v += 'ao'.includes(ch) ? 1 : 0.6
  }
  const base = 0.35 + Math.min(0.55, v * 0.22)
  return Math.min(1, base + (w.length > 6 ? 0.1 : 0))
}
