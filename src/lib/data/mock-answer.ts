import type { Answer, AnswerBlock, SourceRef } from '../types'
import { slugify } from '../utils'

const NOW = '2026-01-01T00:00:00.000Z'

/** Example chips for the empty start screen. */
export const EXAMPLE_PROMPTS: Array<{ label: string; icon: string; query: string }> = [
  { label: 'Research a topic', icon: 'search', query: 'Research the state of on-device speech recognition' },
  { label: 'Compare tools', icon: 'scale', query: 'Compare Go and Node for realtime voice agents' },
  { label: 'Generate a UI concept', icon: 'sparkles', query: 'Generate a calm UI concept for a focus timer' },
  { label: 'Plan an architecture', icon: 'compass', query: 'Plan an architecture for a voice-first assistant' },
  { label: 'Summarize with sources', icon: 'file-text', query: 'Summarize how RAG works, with sources' },
]

const GO_NODE_SOURCES: SourceRef[] = [
  { id: 's1', title: 'Go: Effective concurrency patterns', domain: 'go.dev', kind: 'Docs', url: 'https://go.dev', snippet: 'Goroutines and channels for streaming workloads and backpressure.' },
  { id: 's2', title: 'Node.js performance & the event loop', domain: 'nodejs.org', kind: 'Docs', url: 'https://nodejs.org', snippet: 'Where the single-threaded model shines and where to offload to workers.' },
  { id: 's3', title: 'WebRTC for realtime audio', domain: 'webrtc.org', kind: 'Guide', url: 'https://webrtc.org', snippet: 'Transport choices for sub-200ms voice round-trips.' },
  { id: 's4', title: 'Latency benchmarks: Go vs Node gateways', domain: 'benchmarks.dev', kind: 'Benchmark', url: 'https://benchmarks.dev', snippet: 'p50/p99 under 5k concurrent streams.' },
  { id: 's5', title: 'Designing voice agent architectures', domain: 'latent.space', kind: 'Article', url: 'https://latent.space', snippet: 'Splitting the realtime edge from the reasoning layer.' },
]

const GO_VS_NODE: Answer = {
  id: 'go-vs-node',
  query: 'Compare Go and Node for realtime voice agents',
  title: 'Go vs Node for realtime voice agents',
  subtitle:
    'A latency-first read for voice pipelines: where each runtime earns its place, and how to combine them.',
  status: 'ready',
  requiresSearch: true,
  spokenAnswer:
    'For a realtime voice agent, use Go for the low-latency gateway that streams audio, and Node with TypeScript for orchestration and the web layer. A hybrid gives you Go’s tail latency with Node’s velocity.',
  displayAnswer:
    'Go wins the latency-sensitive gateway; Node wins orchestration and ecosystem. The hybrid is the strongest default.',
  latencyMs: 1840,
  createdAt: NOW,
  memoryUsed: ['Prefers Go for low-latency backend services', 'Building Gideon as a voice-first assistant'],
  suggestedFollowUps: [
    'Show latency benchmarks',
    'Design the voice-agent architecture',
    'Compare WebRTC vs WebSockets',
    'Generate the backend stack',
    'Show deployment options',
  ],
  sources: GO_NODE_SOURCES,
  blocks: [
    {
      id: 'b-summary',
      type: 'summary',
      priority: 10,
      createdAt: NOW,
      displayMode: 'full',
      lead:
        'Go is the stronger choice for low-latency, highly concurrent backend gateways — the part of a voice agent that streams audio and brokers events. Node (TypeScript) wins on iteration speed, frontend integration, and an ecosystem rich in AI and media tooling.',
      tags: ['Low-latency gateway → Go', 'Orchestration → Node', 'Hybrid recommended'],
    },
    {
      id: 'b-compare',
      type: 'comparison',
      priority: 20,
      createdAt: NOW,
      displayMode: 'full',
      a: { name: 'Go' },
      b: { name: 'Node' },
      rows: [
        { dimension: 'Performance', a: { value: 'Compiled, predictable', note: 'Tight tail latencies under load', win: true }, b: { value: 'JIT, very good', note: 'Occasional GC pauses at p99' } },
        { dimension: 'Concurrency', a: { value: 'Goroutines + channels', note: 'Thousands of cheap streams', win: true }, b: { value: 'Event loop + async', note: 'Single-threaded; needs workers' } },
        { dimension: 'Memory footprint', a: { value: 'Lean', note: '~10–30MB per service', win: true }, b: { value: 'Heavier', note: 'V8 baseline + heap growth' } },
        { dimension: 'Developer experience', a: { value: 'Simple, strict', note: 'Fast builds, fewer deps' }, b: { value: 'Fluid, expressive', note: 'TS types, huge tooling', win: true } },
        { dimension: 'Ecosystem', a: { value: 'Solid, focused', note: 'Great for infra' }, b: { value: 'Vast', note: 'AI SDKs, media, web', win: true } },
        { dimension: 'Realtime networking', a: { value: 'First-class', note: 'WebSocket/WebRTC, gRPC streams', win: true }, b: { value: 'Capable', note: 'ws / socket.io mature' } },
        { dimension: 'Deployment fit', a: { value: 'Single binary', note: 'Tiny containers, fast cold start', win: true }, b: { value: 'Runtime + node_modules', note: 'Larger images' } },
      ],
    },
    {
      id: 'b-reco',
      type: 'recommendation',
      priority: 30,
      createdAt: NOW,
      displayMode: 'full',
      verdict:
        'Use <b>Go</b> for the realtime gateway and latency-sensitive services. Use <b>TypeScript / Node</b> for the frontend, orchestration, and integrations.',
      lines: [
        { side: 'a', pin: 'Go', text: 'Audio transport, session fan-out, the WebRTC/WebSocket edge, and anything on the hot path.' },
        { side: 'b', pin: 'TS', text: 'Agent orchestration, tool-calling, business logic, and the web client — where the ecosystem pays off.' },
      ],
    },
    {
      id: 'b-bestofboth',
      type: 'note',
      priority: 40,
      createdAt: NOW,
      displayMode: 'compact',
      eyebrow: 'Best of both worlds',
      title: 'A thin Go edge, a Node brain',
      body:
        'A thin Go gateway terminates the realtime connection and streams frames; a Node orchestrator handles reasoning, tools, and memory over gRPC. You get Go’s tail-latency with Node’s velocity — and can replace either side independently.',
    },
    {
      id: 'b-arch',
      type: 'timeline',
      priority: 50,
      createdAt: NOW,
      displayMode: 'compact',
      title: 'Voice-agent flow',
      nodes: [
        { title: 'Client', sub: 'WebRTC mic' },
        { title: 'Go gateway', sub: 'stream + VAD' },
        { title: 'Node brain', sub: 'LLM + tools' },
        { title: 'TTS', sub: 'stream back' },
      ],
    },
    {
      id: 'b-sources',
      type: 'sources',
      priority: 60,
      createdAt: NOW,
      sources: GO_NODE_SOURCES,
    },
    {
      id: 'b-followup',
      type: 'followup',
      priority: 70,
      createdAt: NOW,
      prompts: [
        'Show latency benchmarks',
        'Design the voice-agent architecture',
        'Compare WebRTC vs WebSockets',
        'Generate the backend stack',
        'Show deployment options',
      ],
    },
  ],
}

const WEBRTC_SOURCES: SourceRef[] = [
  { id: 'w1', title: 'WebRTC overview', domain: 'webrtc.org', kind: 'Docs', url: 'https://webrtc.org', snippet: 'Architecture of peer media transport.' },
  { id: 'w2', title: 'The WebSocket Protocol (RFC 6455)', domain: 'ietf.org', kind: 'Spec', url: 'https://ietf.org', snippet: 'Full-duplex over a single TCP connection.' },
  { id: 'w3', title: 'Choosing a realtime transport', domain: 'ably.com', kind: 'Guide', url: 'https://ably.com', snippet: 'Trade-offs for media vs messaging.' },
  { id: 'w4', title: 'TURN servers explained', domain: 'webrtchacks.com', kind: 'Article', url: 'https://webrtchacks.com', snippet: 'When relays are unavoidable.' },
]

const WEBRTC_VS_WS: Answer = {
  id: 'webrtc-vs-ws',
  query: 'Compare WebRTC vs WebSockets',
  title: 'WebRTC vs WebSockets',
  subtitle: 'For shipping audio in a voice agent: which transport, and when.',
  status: 'ready',
  requiresSearch: true,
  spokenAnswer:
    'Carry audio over WebRTC for sub-200ms latency, and run signaling, transcripts, and tool events over WebSockets. Use both — each for what it’s best at.',
  displayAnswer: 'Audio → WebRTC. Signaling, transcripts, and events → WebSockets.',
  latencyMs: 1520,
  createdAt: NOW,
  memoryUsed: ['Building Gideon as a voice-first assistant'],
  suggestedFollowUps: ['Generate the backend stack', 'Show deployment options', 'Compare Go and Node for realtime voice agents', 'Plan an architecture'],
  sources: WEBRTC_SOURCES,
  blocks: [
    {
      id: 'b-summary',
      type: 'summary',
      priority: 10,
      createdAt: NOW,
      lead:
        'WebRTC is purpose-built for low-latency media with built-in jitter buffering and echo handling. WebSockets are simpler and great for signaling, text, and events — but you carry the media concerns yourself.',
      tags: ['Media → WebRTC', 'Signaling & events → WebSockets'],
    },
    {
      id: 'b-compare',
      type: 'comparison',
      priority: 20,
      createdAt: NOW,
      a: { name: 'WebRTC' },
      b: { name: 'WebSockets' },
      rows: [
        { dimension: 'Latency', a: { value: 'Sub-200ms', note: 'UDP, congestion control', win: true }, b: { value: 'Low, TCP-bound', note: 'Head-of-line blocking' } },
        { dimension: 'Media handling', a: { value: 'Native', note: 'Codecs, jitter buffer, AEC', win: true }, b: { value: 'DIY', note: 'You frame the audio' } },
        { dimension: 'Setup', a: { value: 'Complex', note: 'ICE/STUN/TURN' }, b: { value: 'Trivial', note: 'One upgrade handshake', win: true } },
        { dimension: 'Events & text', a: { value: 'Data channels', note: 'Works, heavier' }, b: { value: 'Ideal', note: 'Simple message bus', win: true } },
        { dimension: 'NAT traversal', a: { value: 'Built-in', note: 'TURN fallback', win: true }, b: { value: 'N/A', note: 'Server-mediated' } },
      ],
    },
    {
      id: 'b-reco',
      type: 'recommendation',
      priority: 30,
      createdAt: NOW,
      verdict: 'Carry <b>audio over WebRTC</b> and run <b>signaling, transcripts, and tool events over WebSockets</b>.',
      lines: [
        { side: 'a', pin: 'RTC', text: 'Microphone capture and TTS playback streams, where every millisecond counts.' },
        { side: 'b', pin: 'WS', text: 'Session control, partial transcripts, and UI state — cheap and reliable.' },
      ],
    },
    { id: 'b-sources', type: 'sources', priority: 60, createdAt: NOW, sources: WEBRTC_SOURCES },
    { id: 'b-followup', type: 'followup', priority: 70, createdAt: NOW, prompts: ['Generate the backend stack', 'Show deployment options', 'Compare Go and Node for realtime voice agents', 'Plan an architecture'] },
  ],
}

const CANNED: Answer[] = [GO_VS_NODE, WEBRTC_VS_WS]

/** Build a coherent, structured answer for any free-form query. */
function genericAnswer(query: string): Answer {
  const q = query.trim()
  const wantsSearch = /\b(research|find|latest|sources?|compare|benchmark|news|who|what|when|best)\b/i.test(q)
  const title = q.charAt(0).toUpperCase() + q.slice(1)
  const id = slugify(q)
  const sources: SourceRef[] = [
    { id: `${id}-1`, title: `Primer: ${title}`, domain: 'wikipedia.org', kind: 'Reference', snippet: 'Background and key definitions.' },
    { id: `${id}-2`, title: 'A practical guide', domain: 'smashingmagazine.com', kind: 'Guide', snippet: 'Hands-on patterns and pitfalls.' },
    { id: `${id}-3`, title: 'Field notes & trade-offs', domain: 'martinfowler.com', kind: 'Article', snippet: 'When each approach pays off.' },
    { id: `${id}-4`, title: 'Community discussion', domain: 'news.ycombinator.com', kind: 'Discussion', snippet: 'Real-world experience reports.' },
  ]
  return {
    id,
    query: title,
    title,
    subtitle: 'Gideon assembled a structured view from what it knows and the sources it scanned.',
    status: 'ready',
    requiresSearch: wantsSearch,
    spokenAnswer: `Here’s a structured take on ${q}. I distilled the essentials, weighed the trade-offs, and pulled a few sources to dig deeper.`,
    displayAnswer: `A clear, structured take on “${q}” — summarized, sourced, and actionable.`,
    latencyMs: 1320,
    createdAt: NOW,
    memoryUsed: ['Prefers warm, minimal UI over neon dashboards'],
    suggestedFollowUps: ['Go deeper on the trade-offs', 'Show me the sources', 'Plan an architecture', 'Summarize in 3 bullets'],
    sources,
    blocks: [
      {
        id: 'b-summary', type: 'summary', priority: 10, createdAt: NOW,
        lead: `Here’s a clear, structured take on “${q}”. Gideon distilled the essentials, weighed the trade-offs, and surfaced where to dig deeper — so you can decide quickly and act with confidence.`,
        tags: ['Summarized', 'Sourced', 'Actionable'],
      },
      {
        id: 'b-compare', type: 'comparison', priority: 20, createdAt: NOW,
        a: { name: 'Option A' }, b: { name: 'Option B' },
        rows: [
          { dimension: 'Speed to value', a: { value: 'Fast', note: 'Lower setup cost', win: true }, b: { value: 'Moderate', note: 'More upfront work' } },
          { dimension: 'Flexibility', a: { value: 'Focused', note: 'Opinionated' }, b: { value: 'Broad', note: 'Adapts to edge cases', win: true } },
          { dimension: 'Long-term cost', a: { value: 'Predictable', note: 'Few moving parts', win: true }, b: { value: 'Variable', note: 'Scales with complexity' } },
          { dimension: 'Ecosystem', a: { value: 'Solid', note: 'Well supported' }, b: { value: 'Rich', note: 'More integrations', win: true } },
        ],
      },
      {
        id: 'b-reco', type: 'recommendation', priority: 30, createdAt: NOW,
        verdict: 'Start with the <b>simplest path that fits today’s constraints</b>, and keep the boundary clean so you can evolve later.',
        lines: [
          { side: 'a', pin: 'Now', text: 'Pick the lower-friction option to learn fast and reduce risk early.' },
          { side: 'b', pin: 'Later', text: 'Reach for the broader option once requirements are concrete.' },
        ],
      },
      { id: 'b-sources', type: 'sources', priority: 60, createdAt: NOW, sources },
      { id: 'b-followup', type: 'followup', priority: 70, createdAt: NOW, prompts: ['Go deeper on the trade-offs', 'Show me the sources', 'Plan an architecture', 'Summarize in 3 bullets'] },
    ],
  }
}

/** Pick the best matching canned answer, else synthesize one. */
export function resolveAnswer(query: string): Answer {
  const q = (query || '').toLowerCase()
  if (/(\bgo\b|golang).*(node|js|javascript)|node.*(\bgo\b|golang)/.test(q) || /voice agent/.test(q)) {
    return GO_VS_NODE
  }
  if (/webrtc|websocket/.test(q)) return WEBRTC_VS_WS
  return genericAnswer(query)
}

/** Resolve a previously-generated answer by its id (canned or synthesized). */
export function resolveAnswerById(id: string, query?: string): Answer {
  const canned = CANNED.find((a) => a.id === id)
  if (canned) return canned
  return { ...genericAnswer(query || id.replace(/-/g, ' ')), id }
}

/** Helper to pull the source list out of an answer's source block. */
export function sourcesOf(answer: Answer): SourceRef[] {
  const block = answer.blocks.find((b): b is Extract<AnswerBlock, { type: 'sources' }> => b.type === 'sources')
  return block?.sources ?? answer.sources
}
