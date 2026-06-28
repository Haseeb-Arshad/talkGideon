import type { Session } from '../types'

export const MOCK_SESSIONS: Session[] = [
  { id: 'sess-1', query: 'Compare Go and Node for realtime voice agents', title: 'Go vs Node for realtime voice agents', createdAt: 'today', mode: 'ready', answerId: 'go-vs-node' },
  { id: 'sess-2', query: 'Compare WebRTC vs WebSockets', title: 'WebRTC vs WebSockets', createdAt: '2d', mode: 'ready', answerId: 'webrtc-vs-ws' },
  { id: 'sess-3', query: 'Plan an architecture for a voice-first assistant', title: 'Architecture for a voice-first assistant', createdAt: '4d', mode: 'ready', answerId: 'plan-an-architecture-for-a-voice-first-assistant' },
]
