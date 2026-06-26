// Speech-to-text using the browser's Web Speech API (Chrome / Edge).
// Emits interim text as you speak and a final transcript when you pause.

export function createRecognizer({ onInterim, onFinal, onStart, onEnd, onError } = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) {
    return { supported: false, start() {}, stop() {}, abort() {} }
  }

  const rec = new SR()
  rec.lang = 'en-US'
  rec.continuous = true
  rec.interimResults = true
  rec.maxAlternatives = 1

  let running = false
  let manualStop = false

  rec.onstart = () => { running = true; onStart?.() }
  rec.onend = () => {
    running = false
    onEnd?.(manualStop)
    manualStop = false
  }
  rec.onerror = (e) => {
    // "no-speech" / "aborted" are routine; surface the rest.
    if (e.error && !['no-speech', 'aborted'].includes(e.error)) onError?.(e.error)
  }
  rec.onresult = (event) => {
    let interim = ''
    let fin = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const r = event.results[i]
      if (r.isFinal) fin += r[0].transcript
      else interim += r[0].transcript
    }
    if (interim) onInterim?.(interim.trim())
    if (fin) onFinal?.(fin.trim())
  }

  return {
    supported: true,
    get running() { return running },
    start() {
      if (running) return
      manualStop = false
      try { rec.start() } catch { /* already starting */ }
    },
    stop() {
      manualStop = true
      try { rec.stop() } catch {}
    },
    abort() {
      manualStop = true
      try { rec.abort() } catch {}
    },
  }
}
