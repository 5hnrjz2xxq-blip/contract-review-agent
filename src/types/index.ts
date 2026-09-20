export interface Policy {
  id: number
  title: string
  content: string
  category: string
  source: string
  createdAt: string
  updatedAt: string
}

export interface Template {
  id: number
  name: string
  content: string
  category: string
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  type?: 'review' | 'document' | 'general'
}

export interface ReviewResult {
  compliant: boolean
  issues: ReviewIssue[]
  summary: string
}

export interface ReviewIssue {
  location: string
  content: string
  severity: 'error' | 'warning' | 'info'
  suggestion: string
}

export interface AIConfig {
  provider: 'claude' | 'openai'
  apiKey: string
  model: string
  baseUrl?: string
}

export interface AppConfig {
  ai: AIConfig
  defaultOutputFormat: 'ask' | 'docx' | 'pdf'
}

export type ViewType = 'chat' | 'policy' | 'settings'
