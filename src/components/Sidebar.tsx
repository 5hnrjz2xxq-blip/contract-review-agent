import { useAppStore } from '../stores/app-store'
import { MessageSquare, FileText, Settings, Bot, Sparkles } from 'lucide-react'

const navItems = [
  { id: 'chat' as const, label: '合同审核', icon: MessageSquare },
  { id: 'policy' as const, label: '政策管理', icon: FileText },
  { id: 'settings' as const, label: '设置', icon: Settings },
]

export default function Sidebar() {
  const { currentView, setCurrentView } = useAppStore()

  return (
    <aside className="w-56 bg-white border-r border-slate-200 flex flex-col shadow-sm">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-800">合同审核</h1>
            <p className="text-xs text-slate-400">Agent</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = currentView === item.id
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="p-3 border-t border-slate-100">
        <div className="px-3 py-2 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Sparkles size={12} />
            <span>AI-Powered</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
