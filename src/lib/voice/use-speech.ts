import { useEffect, useRef } from 'react'

/**
 * Browser speech-to-text (Web Speech API — Chrome / Edge / Safari).
 *
 * Ported from the original vanilla `voice/stt.js` into a React hook so the
 * one TanStack app owns voice end-to-end. While `active` is true it streams a
 * live transcript (finalized text + the current interim guess); when the
 * browser ends the session it calls `onEnd` so the caller can drop out of the
 * listening state.
 */

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onresult: ((event: SpeechResultEvent) => void) | null
}

interface SpeechResultEvent {
  resultIndex: number
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** Whether the current browser exposes the Web Speech API. */
export const speechSupported = getRecognitionCtor() !== null

interface UseSpeechOptions {
  /** Start recognition while true; stop (without firing `onEnd`) when it flips false. */
  active: boolean
  lang?: string
  /** Live transcript (finalized text + current interim) as the user speaks. */
  onTranscript?: (text: string) => void
  /** Recognition ended on its own — error, silence timeout, or browser stop. */
  onEnd?: () => void
}

export function useSpeech({ active, lang = 'en-US', onTranscript, onEnd }: UseSpeechOptions) {
  // Keep the latest callbacks without re-creating the recognizer each render.
  const cbRef = useRef({ onTranscript, onEnd })
  cbRef.current = { onTranscript, onEnd }

  useEffect(() => {
    if (!active) return
    const Ctor = getRecognitionCtor()
    if (!Ctor) {
      cbRef.current.onEnd?.()
      return
    }

    const rec = new Ctor()
    rec.lang = lang
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1

    let finalText = ''

    rec.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) finalText += result[0].transcript
        else interim += result[0].transcript
      }
      const text = (finalText + interim).trim()
      if (text) cbRef.current.onTranscript?.(text)
    }
    rec.onend = () => cbRef.current.onEnd?.()

    try {
      rec.start()
    } catch {
      /* already starting — ignore */
    }

    return () => {
      // Manual stop (active → false / unmount): suppress onEnd so we don't
      // bounce the caller's listening state back off a second time.
      rec.onend = null
      rec.onresult = null
      try {
        rec.abort()
      } catch {
        /* ignore */
      }
    }
  }, [active, lang])

  return { supported: speechSupported }
}
