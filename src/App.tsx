import { useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Chat from './components/Chat'
import PolicyManager from './components/PolicyManager'
import Settings from './components/Settings'
import { useAppStore } from './stores/app-store'
import { loadPolicies, loadTemplates } from './services/policy-service'

export default function App() {
  const { currentView, setPolicies, setTemplates, aiConfig } = useAppStore()

  useEffect(() => {
    setPolicies(loadPolicies())
    setTemplates(loadTemplates())

    // Load AI config from localStorage
    const savedConfig = localStorage.getItem('contract-review-ai-config')
    if (savedConfig) {
      try {
        useAppStore.setState({ aiConfig: JSON.parse(savedConfig) })
      } catch {}
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('contract-review-ai-config', JSON.stringify(aiConfig))
  }, [aiConfig])

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        {currentView === 'chat' && <Chat />}
        {currentView === 'policy' && <PolicyManager />}
        {currentView === 'settings' && <Settings />}
      </main>
    </div>
  )
}
