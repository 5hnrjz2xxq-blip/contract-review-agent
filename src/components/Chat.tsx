import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../stores/app-store'
import { reviewContract, generateDocument, chat } from '../services/ai-service'
import { scanContract, checkMissingClauses } from '../services/rule-engine'
import { generateDocx, generatePdf } from '../services/document-service'
import { ChatMessage } from '../types'
import { Send, FileText, Search, AlertCircle, CheckCircle, Download, Loader2, Copy, Check, Zap, Bot, AlertTriangle, Info, MessageSquare } from 'lucide-react'

type Mode = 'chat' | 'review' | 'document'

export default function Chat() {
  const { messages, addMessage, policies, templates, aiConfig, isGenerating, setIsGenerating } = useAppStore()
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<Mode>('chat')
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isGenerating) return

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      type: mode === 'review' ? 'review' : mode === 'document' ? 'document' : 'general',
    }
    addMessage(userMsg)
    setInput('')
    setIsGenerating(true)

    try {
      let response = ''

      if (mode === 'review') {
        // 混合模式：先用规则引擎扫描，再用 AI 深度分析（如果配置了）
        const ruleResult = scanContract(text, policies)
        const missingClauses = checkMissingClauses(text)

        // 构建规则引擎报告
        let report = buildRuleReport(ruleResult, missingClauses)

        // 如果配置了 AI，追加深度分析
        if (aiConfig.apiKey) {
          try {
            const aiAnalysis = await reviewContract(aiConfig, text, policies)
            report += '\n\n---\n\n## AI 深度分析\n\n' + aiAnalysis
          } catch (e: any) {
            report += `\n\n> AI 分析暂时不可用: ${e.message}`
          }
        } else {
          report += '\n\n> 提示：配置 API Key 启用 AI 深度分析，获得更全面的审核意见。'
        }

        response = report
      } else if (mode === 'document') {
        if (aiConfig.apiKey) {
          const template = templates.find(t => t.id === selectedTemplate)
          response = await generateDocument(
            aiConfig,
            template?.content || '（无模板，请根据用户输入生成旅游合同）',
            text,
            policies
          )
        } else {
          // 无 AI 模式：基于模板填充
          const template = templates.find(t => t.id === selectedTemplate)
          if (template) {
            response = generateFromTemplate(template.content, text)
          } else {
            response = generateBasicContract(text)
          }
          // 检查遗漏
          const missing = checkMissingClauses(response)
          if (missing.length > 0) {
            response += '\n\n---\n\n## ⚠️ 条款完整性检查\n\n'
            response += missing.map(m =>
              `- ${m.severity === 'error' ? '❌' : '⚠️'} ${m.message}`
            ).join('\n')
            response += '\n\n请补充上述缺失条款后，合同将更加完整合规。'
          }
        }
      } else {
        // 通用对话
        if (aiConfig.apiKey) {
          const history = messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content,
          }))
          response = await chat(aiConfig, text, history)
        } else {
          response = '你好！我是合同审核助手。\n\n**可用功能：**\n- 🔍 **合同审核** — 粘贴合同内容，自动检查违规用词和合规问题（无需 API Key）\n- 📄 **文档生成** — 选择模板或描述需求，生成旅游合同\n- 💬 **通用对话** — 需要配置 API Key\n\n请在「设置」页面配置 API Key 以启用全部功能。'
        }
      }

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        type: userMsg.type,
      }
      addMessage(assistantMsg)
    } catch (error: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `错误：${error.message || '请求失败'}`,
        timestamp: Date.now(),
        type: 'general',
      }
      addMessage(errorMsg)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExport = async (msg: ChatMessage, format: 'docx' | 'pdf') => {
    try {
      if (format === 'docx') {
        await generateDocx(msg.content, `合同文档_${new Date().toLocaleDateString()}`)
      } else {
        await generatePdf(msg.content, `合同文档_${new Date().toLocaleDateString()}`)
      }
    } catch (error: any) {
      alert(`导出失败: ${error.message}`)
    }
  }

  const handleCopy = async (msg: ChatMessage) => {
    await navigator.clipboard.writeText(msg.content)
    setCopiedId(msg.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">合同审核</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {mode === 'chat' && '通用对话模式'}
              {mode === 'review' && '合同内容审核 — 规则引擎 + AI 深度分析'}
              {mode === 'document' && '文档生成 — 根据模板生成合规合同'}
            </p>
          </div>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setMode('chat')}
              className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                mode === 'chat' ? 'bg-white text-slate-800 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <MessageIcon /> 对话
            </button>
            <button
              onClick={() => setMode('review')}
              className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                mode === 'review' ? 'bg-white text-slate-800 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Search size={14} className="inline mr-1" />
              审核
            </button>
            <button
              onClick={() => setMode('document')}
              className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                mode === 'document' ? 'bg-white text-slate-800 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText size={14} className="inline mr-1" />
              生成
            </button>
          </div>
        </div>

        {/* Template selector for document mode */}
        {mode === 'document' && templates.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-slate-500">选择模板：</span>
            <select
              value={selectedTemplate || ''}
              onChange={(e) => setSelectedTemplate(Number(e.target.value) || null)}
              className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">无模板（自由生成）</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Status bar */}
        <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
          {policies.length > 0 && (
            <span className="flex items-center gap-1">
              <CheckCircle size={12} className="text-green-500" />
              {policies.length} 条政策
            </span>
          )}
          {aiConfig.apiKey ? (
            <span className="flex items-center gap-1">
              <Bot size={12} className="text-blue-500" />
              AI 已连接
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Zap size={12} className="text-amber-500" />
              纯规则模式
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <Search size={32} className="text-blue-500" />
            </div>
            <h3 className="text-lg font-medium text-slate-700 mb-2">合同审核助手</h3>
            <p className="text-sm text-slate-400 max-w-sm">
              粘贴合同内容进行审核，自动检测违规用词、霸王条款和遗漏条款
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setMode('review')}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                开始审核
              </button>
              <button
                onClick={() => setMode('document')}
                className="px-4 py-2 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              >
                生成文档
              </button>
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-slate-200 text-slate-800'
              }`}
            >
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
              <div className={`flex items-center gap-2 mt-2 ${
                msg.role === 'user' ? 'justify-end' : 'justify-between'
              }`}>
                <span className={`text-xs ${
                  msg.role === 'user' ? 'text-blue-100' : 'text-slate-400'
                }`}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
                {msg.role === 'assistant' && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleCopy(msg)}
                      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                      title="复制"
                    >
                      {copiedId === msg.id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                    <button
                      onClick={() => handleExport(msg, 'docx')}
                      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                      title="导出 Word"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isGenerating && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-slate-500">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">正在分析...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-slate-200 bg-white">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={
              mode === 'review' ? '粘贴合同内容进行审核...' :
              mode === 'document' ? '描述你需要的合同内容...' :
              '输入消息...'
            }
            className="flex-1 resize-none border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[48px] max-h-[120px]"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isGenerating}
            className="px-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

function MessageIcon() {
  return <MessageSquare size={14} className="inline mr-1" />
}

// 规则引擎报告构建
function buildRuleReport(
  result: { issues: Array<{ location: string; content: string; severity: 'error' | 'warning' | 'info'; suggestion: string }>; score: number; summary: string },
  missingClauses: Array<{ clause: string; severity: 'error' | 'warning'; message: string }>
): string {
  let report = `## 合同审核报告\n\n`
  report += `**合规评分：${result.score}/100**\n\n`
  report += `${result.summary}\n\n`

  if (result.issues.length > 0) {
    report += `### 发现的问题\n\n`
    for (const issue of result.issues) {
      const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️'
      report += `${icon} **${issue.location}** — ${issue.content}\n`
      report += `   建议：${issue.suggestion}\n\n`
    }
  }

  if (missingClauses.length > 0) {
    report += `### 条款完整性检查\n\n`
    for (const missing of missingClauses) {
      const icon = missing.severity === 'error' ? '❌' : '⚠️'
      report += `${icon} ${missing.message}\n`
    }
    report += '\n'
  }

  if (result.issues.length === 0 && missingClauses.length === 0) {
    report += '✅ 未发现明显违规问题，合同基本合规。\n\n'
    report += '> 注意：规则引擎仅检查常见问题，建议配置 AI 进行深度语义分析。'
  }

  return report
}

// 基于模板生成文档（无 AI）
function generateFromTemplate(template: string, userInput: string): string {
  let result = template

  // 简单的占位符替换
  const placeholders: Record<string, string> = {
    '{{用户输入}}': userInput,
    '{{内容}}': userInput,
    '{{日期}}': new Date().toLocaleDateString('zh-CN'),
    '{{今天}}': new Date().toLocaleDateString('zh-CN'),
  }

  for (const [key, value] of Object.entries(placeholders)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value)
  }

  // 如果模板中没有占位符，在末尾追加用户内容
  if (result === template) {
    result += '\n\n---\n\n' + userInput
  }

  return result
}

// 生成基础合同（无模板无 AI）
function generateBasicContract(userInput: string): string {
  return `# 旅游合同

## 一、合同双方

甲方（旅行社）：________________
乙方（旅游者）：${userInput.split('\n')[0] || '________________'}

## 二、旅游行程

${userInput}

## 三、服务标准

（请补充具体服务标准）

## 四、价格及付款

总价：________元
付款方式：________

## 五、退改条款

（请补充退改政策）

## 六、违约责任

（请补充违约责任条款）

## 七、保险

（请补充保险信息）

## 八、签约日期

签订日期：${new Date().toLocaleDateString('zh-CN')}

---
> 此合同为模板生成，请根据实际情况补充完善各项条款。`
}
