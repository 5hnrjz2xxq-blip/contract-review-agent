import { useState, useEffect } from 'react'
import { useAppStore } from '../stores/app-store'
import { AIConfig } from '../types'
import { Settings as SettingsIcon, Key, Cpu, Save, Eye, EyeOff, TestTube, Check, X, AlertCircle } from 'lucide-react'

export default function Settings() {
  const { aiConfig, setAIConfig } = useAppStore()
  const [localConfig, setLocalConfig] = useState<AIConfig>(aiConfig)
  const [showApiKey, setShowApiKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    setLocalConfig(aiConfig)
  }, [aiConfig])

  const handleSave = () => {
    setAIConfig(localConfig)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTestConnection = async () => {
    if (!localConfig.apiKey) {
      setTestResult({ success: false, message: '请先填写 API Key' })
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      if (localConfig.provider === 'claude') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': localConfig.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: localConfig.model,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hi' }],
          }),
        })

        if (response.ok) {
          setTestResult({ success: true, message: '连接成功！Claude API 正常工作' })
        } else {
          const error = await response.json().catch(() => ({}))
          setTestResult({ success: false, message: `连接失败: ${error.error?.message || response.statusText}` })
        }
      } else {
        const baseUrl = localConfig.baseUrl || 'https://api.openai.com/v1'
        const response = await fetch(`${baseUrl}/models`, {
          headers: {
            'Authorization': `Bearer ${localConfig.apiKey}`,
          },
        })

        if (response.ok) {
          setTestResult({ success: true, message: '连接成功！OpenAI API 正常工作' })
        } else {
          const error = await response.json().catch(() => ({}))
          setTestResult({ success: false, message: `连接失败: ${error.error?.message || response.statusText}` })
        }
      }
    } catch (error: any) {
      setTestResult({ success: false, message: `网络错误: ${error.message}` })
    } finally {
      setTesting(false)
    }
  }

  const claudeModels = [
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (推荐)' },
    { value: 'claude-opus-4-20250514', label: 'Claude Opus 4 (最强)' },
    { value: 'claude-haiku-4-20250514', label: 'Claude Haiku 4 (最快)' },
  ]

  const openaiModels = [
    { value: 'gpt-4o', label: 'GPT-4o (推荐)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (快速)' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  ]

  const models = localConfig.provider === 'claude' ? claudeModels : openaiModels

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <SettingsIcon size={20} className="text-slate-600" />
          <div>
            <h2 className="text-lg font-semibold text-slate-800">设置</h2>
            <p className="text-xs text-slate-400 mt-0.5">配置 AI 模型、API Key 和其他选项</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-xl space-y-6">

          {/* AI Provider */}
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Cpu size={16} className="text-blue-500" />
              <h3 className="text-sm font-semibold text-slate-800">AI 模型</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-2">选择模型提供商</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setLocalConfig({ ...localConfig, provider: 'claude', model: 'claude-sonnet-4-20250514', apiKey: '', baseUrl: undefined })}
                    className={`px-4 py-3 rounded-lg border text-sm transition-all ${
                      localConfig.provider === 'claude'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-orange-500 rounded flex items-center justify-center text-white text-xs font-bold">A</div>
                      Claude (Anthropic)
                    </div>
                  </button>
                  <button
                    onClick={() => setLocalConfig({ ...localConfig, provider: 'openai', model: 'gpt-4o', apiKey: '', baseUrl: undefined })}
                    className={`px-4 py-3 rounded-lg border text-sm transition-all ${
                      localConfig.provider === 'openai'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center text-white text-xs font-bold">O</div>
                      OpenAI (GPT)
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-2">选择模型</label>
                <select
                  value={localConfig.model}
                  onChange={(e) => setLocalConfig({ ...localConfig, model: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {models.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* API Key */}
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Key size={16} className="text-amber-500" />
              <h3 className="text-sm font-semibold text-slate-800">API Key</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-2">
                  {localConfig.provider === 'claude' ? 'Anthropic API Key' : 'OpenAI API Key'}
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={localConfig.apiKey}
                    onChange={(e) => setLocalConfig({ ...localConfig, apiKey: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={localConfig.provider === 'claude' ? 'sk-ant-...' : 'sk-...'}
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  {localConfig.provider === 'claude'
                    ? '在 console.anthropic.com 获取 API Key'
                    : '在 platform.openai.com/api-keys 获取 API Key'}
                </p>
              </div>

              {localConfig.provider === 'openai' && (
                <div>
                  <label className="block text-sm text-slate-600 mb-2">自定义 Base URL（可选）</label>
                  <input
                    type="text"
                    value={localConfig.baseUrl || ''}
                    onChange={(e) => setLocalConfig({ ...localConfig, baseUrl: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://api.openai.com/v1"
                  />
                  <p className="text-xs text-slate-400 mt-1.5">如使用代理服务，可修改此地址</p>
                </div>
              )}

              {/* Test connection */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestConnection}
                  disabled={!localConfig.apiKey || testing}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50"
                >
                  <TestTube size={14} />
                  {testing ? '测试中...' : '测试连接'}
                </button>
                {testResult && (
                  <div className={`flex items-center gap-1.5 text-xs ${testResult.success ? 'text-green-600' : 'text-red-500'}`}>
                    {testResult.success ? <Check size={14} /> : <AlertCircle size={14} />}
                    {testResult.message}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Save button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                saved
                  ? 'bg-green-500 text-white'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {saved ? (
                <>
                  <Check size={16} />
                  已保存
                </>
              ) : (
                <>
                  <Save size={16} />
                  保存设置
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
