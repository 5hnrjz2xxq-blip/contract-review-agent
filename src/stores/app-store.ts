import { create } from 'zustand'
import { ChatMessage, ViewType, AIConfig, Policy, Template } from '../types'

interface AppState {
  currentView: ViewType
  setCurrentView: (view: ViewType) => void

  messages: ChatMessage[]
  addMessage: (msg: ChatMessage) => void
  clearMessages: () => void

  policies: Policy[]
  setPolicies: (policies: Policy[]) => void
  addPolicy: (policy: Policy) => void
  updatePolicy: (policy: Policy) => void
  deletePolicy: (id: number) => void

  templates: Template[]
  setTemplates: (templates: Template[]) => void
  addTemplate: (template: Template) => void
  updateTemplate: (template: Template) => void
  deleteTemplate: (id: number) => void

  aiConfig: AIConfig
  setAIConfig: (config: AIConfig) => void

  isGenerating: boolean
  setIsGenerating: (v: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'chat',
  setCurrentView: (view) => set({ currentView: view }),

  messages: [],
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  clearMessages: () => set({ messages: [] }),

  policies: [],
  setPolicies: (policies) => set({ policies }),
  addPolicy: (policy) => set((state) => ({ policies: [...state.policies, policy] })),
  updatePolicy: (policy) => set((state) => ({
    policies: state.policies.map(p => p.id === policy.id ? policy : p)
  })),
  deletePolicy: (id) => set((state) => ({
    policies: state.policies.filter(p => p.id !== id)
  })),

  templates: [],
  setTemplates: (templates) => set({ templates }),
  addTemplate: (template) => set((state) => ({ templates: [...state.templates, template] })),
  updateTemplate: (template) => set((state) => ({
    templates: state.templates.map(t => t.id === template.id ? template : t)
  })),
  deleteTemplate: (id) => set((state) => ({
    templates: state.templates.filter(t => t.id !== id)
  })),

  aiConfig: {
    provider: 'claude',
    apiKey: '',
    model: 'claude-sonnet-4-20250514',
  },
  setAIConfig: (config) => set({ aiConfig: config }),

  isGenerating: false,
  setIsGenerating: (v) => set({ isGenerating: v }),
}))
