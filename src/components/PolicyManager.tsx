import { useState, useRef } from 'react'
import { useAppStore } from '../stores/app-store'
import { createPolicy, createTemplate, savePolicies, saveTemplates, parseTextPolicy, importFile } from '../services/policy-service'
import { Policy, Template } from '../types'
import { Plus, Trash2, Edit3, Upload, FileText, Tag, Search, X, Save, FolderOpen } from 'lucide-react'

type Tab = 'policies' | 'templates'

export default function PolicyManager() {
  const { policies, setPolicies, addPolicy, updatePolicy, deletePolicy, templates, setTemplates, addTemplate, updateTemplate, deleteTemplate } = useAppStore()
  const [tab, setTab] = useState<Tab>('policies')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<Policy | Template | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formCategory, setFormCategory] = useState('其他')
  const [formSource, setFormSource] = useState('手动添加')

  const categories = [...new Set(policies.map(p => p.category))]

  const filteredPolicies = policies.filter(p => {
    const matchSearch = p.title.includes(searchTerm) || p.content.includes(searchTerm)
    const matchCategory = filterCategory === 'all' || p.category === filterCategory
    return matchSearch && matchCategory
  })

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    for (const file of Array.from(files)) {
      try {
        const text = await importFile(file)
        const newPolicies = parseTextPolicy(text, file.name)
        const updated = [...policies, ...newPolicies]
        setPolicies(updated)
        savePolicies(updated)
      } catch (error: any) {
        alert(`导入失败: ${error.message}`)
      }
    }
    e.target.value = ''
  }

  const handleSubmit = () => {
    if (!formTitle.trim() || !formContent.trim()) return

    if (tab === 'policies') {
      if (editingItem && 'source' in editingItem) {
        const updated = createPolicy(formTitle, formContent, formCategory, formSource)
        updated.id = editingItem.id
        updated.createdAt = editingItem.createdAt
        updatePolicy(updated)
        savePolicies(policies.map(p => p.id === editingItem.id ? updated : p))
      } else {
        const newPolicy = createPolicy(formTitle, formContent, formCategory, formSource)
        addPolicy(newPolicy)
        savePolicies([...policies, newPolicy])
      }
    } else {
      if (editingItem && !('source' in editingItem)) {
        const updated = createTemplate(formTitle, formContent, formCategory)
        updated.id = editingItem.id
        updated.createdAt = editingItem.createdAt
        updateTemplate(updated)
        saveTemplates(templates.map(t => t.id === editingItem.id ? updated : t))
      } else {
        const newTemplate = createTemplate(formTitle, formContent, formCategory)
        addTemplate(newTemplate)
        saveTemplates([...templates, newTemplate])
      }
    }

    resetForm()
  }

  const handleEdit = (item: Policy | Template) => {
    setEditingItem(item)
    setFormTitle('title' in item ? item.title : item.name)
    setFormContent(item.content)
    setFormCategory(item.category)
    if ('source' in item) setFormSource(item.source)
    setShowForm(true)
  }

  const handleDelete = (id: number) => {
    if (!confirm('确定要删除这条记录吗？')) return
    if (tab === 'policies') {
      deletePolicy(id)
      savePolicies(policies.filter(p => p.id !== id))
    } else {
      deleteTemplate(id)
      saveTemplates(templates.filter(t => t.id !== id))
    }
  }

  const resetForm = () => {
    setFormTitle('')
    setFormContent('')
    setFormCategory('其他')
    setFormSource('手动添加')
    setEditingItem(null)
    setShowForm(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">政策管理</h2>
            <p className="text-xs text-slate-400 mt-0.5">管理审核政策、公司规定和合同模板</p>
          </div>
          <div className="flex gap-2">
            {tab === 'policies' && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.docx,.pdf"
                  multiple
                  onChange={handleFileImport}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <Upload size={14} />
                  导入文件
                </button>
              </>
            )}
            <button
              onClick={() => { resetForm(); setShowForm(true) }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus size={14} />
              添加
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setTab('policies')}
            className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-all ${
              tab === 'policies' ? 'bg-white text-slate-800 shadow-sm font-medium' : 'text-slate-500'
            }`}
          >
            <FileText size={14} className="inline mr-1.5" />
            政策法规 ({policies.length})
          </button>
          <button
            onClick={() => setTab('templates')}
            className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-all ${
              tab === 'templates' ? 'bg-white text-slate-800 shadow-sm font-medium' : 'text-slate-500'
            }`}
          >
            <FolderOpen size={14} className="inline mr-1.5" />
            合同模板 ({templates.length})
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="px-6 py-3 border-b border-slate-100 bg-white">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {tab === 'policies' && categories.length > 0 && (
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">全部分类</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-3">
        {tab === 'policies' ? (
          filteredPolicies.length === 0 ? (
            <EmptyState
              icon={<FileText size={40} />}
              title="暂无政策"
              description="点击「添加」手动创建，或导入文件批量添加"
            />
          ) : (
            <div className="space-y-2">
              {filteredPolicies.map(policy => (
                <PolicyCard
                  key={policy.id}
                  policy={policy}
                  onEdit={() => handleEdit(policy)}
                  onDelete={() => handleDelete(policy.id)}
                />
              ))}
            </div>
          )
        ) : (
          templates.length === 0 ? (
            <EmptyState
              icon={<FolderOpen size={40} />}
              title="暂无模板"
              description="添加合同模板，用于文档生成功能"
            />
          ) : (
            <div className="space-y-2">
              {templates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={() => handleEdit(template)}
                  onDelete={() => handleDelete(template.id)}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-[560px] max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">
                {editingItem ? '编辑' : '添加'}{tab === 'policies' ? '政策' : '模板'}
              </h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {tab === 'policies' ? '政策标题' : '模板名称'}
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder={tab === 'policies' ? '例如：退款政策' : '例如：标准旅游合同'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">分类</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  {['退款政策', '保险条款', '行程安排', '价格条款', '法律责任', '安全须知', '服务标准', '其他'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              {tab === 'policies' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">来源</label>
                  <input
                    type="text"
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="例如：国家旅游局规定"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">内容</label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[160px] resize-y"
                  placeholder="政策具体内容或模板正文..."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formTitle.trim() || !formContent.trim()}
                className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                <Save size={14} className="inline mr-1" />
                {editingItem ? '保存修改' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PolicyCard({ policy, onEdit, onDelete }: { policy: Policy; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-slate-800 truncate">{policy.title}</h4>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-slate-100 text-slate-500 rounded-full">
              <Tag size={10} />
              {policy.category}
            </span>
          </div>
          <p className="text-xs text-slate-400 line-clamp-2">{policy.content}</p>
          <p className="text-xs text-slate-300 mt-1">{policy.source} · {new Date(policy.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-1 ml-2">
          <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50">
            <Edit3 size={14} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function TemplateCard({ template, onEdit, onDelete }: { template: Template; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-slate-800 truncate">{template.name}</h4>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-slate-100 text-slate-500 rounded-full">
              <Tag size={10} />
              {template.category}
            </span>
          </div>
          <p className="text-xs text-slate-400 line-clamp-2">{template.content}</p>
          <p className="text-xs text-slate-300 mt-1">{new Date(template.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-1 ml-2">
          <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50">
            <Edit3 size={14} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-slate-300 mb-3">{icon}</div>
      <h4 className="text-sm font-medium text-slate-500 mb-1">{title}</h4>
      <p className="text-xs text-slate-400">{description}</p>
    </div>
  )
}
