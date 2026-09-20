import { Policy, ReviewIssue } from '../types'

export interface RuleCheckResult {
  issues: ReviewIssue[]
  score: number // 0-100, higher = more compliant
  summary: string
}

// 违规关键词规则库
const VIOLATION_RULES: Array<{
  pattern: RegExp
  severity: 'error' | 'warning' | 'info'
  message: string
  suggestion: string
  category: string
}> = [
  // 虚假宣传
  { pattern: /(?:保证|确保|100%|绝对|永不|永远|最佳|最好|最优|最强|世界第一|全网最低)/gi, severity: 'error', message: '发现绝对化用语', suggestion: '删除绝对化表述，改用客观描述', category: '虚假宣传' },
  { pattern: /(?:零风险|无风险|无任何风险|完全没有风险)/gi, severity: 'error', message: '发现零风险承诺', suggestion: '旅游活动存在客观风险，应如实告知', category: '虚假宣传' },
  { pattern: /(?:免费|0元|不要钱|不花一分钱)(?!.*(?:条件|限制|备注))/gi, severity: 'warning', message: '发现免费承诺', suggestion: '如有附加条件请注明，避免误导消费者', category: '虚假宣传' },

  // 霸王条款
  { pattern: /(?:概不退款|概不负责|不承担任何责任|一切后果自负|自行承担|解释权归.*所有)/gi, severity: 'error', message: '发现霸王条款', suggestion: '该条款可能违反消费者权益保护法，建议修改为公平条款', category: '霸王条款' },
  { pattern: /(?:甲方有权单方面|甲方可随时修改|甲方有权随时终止)(?!.*(?:协商|通知))/gi, severity: 'error', message: '发现单方面权利条款', suggestion: '应增加协商和通知机制，保障双方权益', category: '霸王条款' },
  { pattern: /(?:不得|禁止|不允许)(?:退|取消|变更)(?!.*(?:条件|情况))/gi, severity: 'warning', message: '发现限制退改条款', suggestion: '建议明确退改条件和手续费标准', category: '霸王条款' },

  // 价格问题
  { pattern: /(?:价格.*波动|以.*为准|最终解释权)/gi, severity: 'warning', message: '发现价格模糊表述', suggestion: '建议明确价格包含内容和可能的额外费用', category: '价格条款' },
  { pattern: /(?:另付|自费|自理|不含)(?!.*(?:说明|清单|明细))/gi, severity: 'info', message: '发现额外费用项', suggestion: '建议列出自费项目清单和价格', category: '价格条款' },

  // 保险和责任
  { pattern: /(?:旅游意外险|旅行社责任险)/gi, severity: 'info', message: '涉及保险条款', suggestion: '请确保保险条款清晰，保额明确', category: '保险条款' },
  { pattern: /(?:人身安全|意外伤害|安全事故)/gi, severity: 'info', message: '涉及安全条款', suggestion: '请确保有明确的安全保障措施和应急预案', category: '安全须知' },

  // 行程条款
  { pattern: /(?:行程.*可能.*调整|行程.*会.*变化|天气.*原因.*调整)/gi, severity: 'warning', message: '发现行程变更条款', suggestion: '建议明确变更条件、通知时间和补偿方案', category: '行程安排' },
  { pattern: /(?:自选项目|自愿参加|自愿放弃)/gi, severity: 'info', message: '发现自选项目', suggestion: '建议明确自选项目的费用和安全责任', category: '行程安排' },
]

// 必要条款检查
const REQUIRED_CLAUSES: Array<{
  name: string
  patterns: RegExp[]
  message: string
  severity: 'error' | 'warning'
}> = [
  { name: '合同双方信息', patterns: [/(?:甲方|乙方|旅行社|旅游者|游客).{0,20}(?:名称|姓名|地址|联系方式)/i], message: '缺少合同双方基本信息', severity: 'error' },
  { name: '旅游行程', patterns: [/(?:行程|路线|目的地|景点|出发|返回)/i], message: '缺少旅游行程安排', severity: 'error' },
  { name: '服务标准', patterns: [/(?:住宿|餐饮|交通|导游|服务标准)/i], message: '缺少服务标准说明', severity: 'warning' },
  { name: '价格条款', patterns: [/(?:价格|费用|总价|单价|付款|支付)/i], message: '缺少价格和付款条款', severity: 'error' },
  { name: '退改条款', patterns: [/(?:退款|退费|取消|退订|改期|变更)/i], message: '缺少退改条款', severity: 'error' },
  { name: '违约责任', patterns: [/(?:违约|赔偿|责任|争议|纠纷|仲裁|诉讼)/i], message: '缺少违约责任条款', severity: 'warning' },
  { name: '保险条款', patterns: [/(?:保险|保障|意外险|责任险)/i], message: '缺少保险条款', severity: 'warning' },
  { name: '签约日期', patterns: [/(?:日期|签订|签约|签订日期|生效日期)/i], message: '缺少签约日期', severity: 'warning' },
]

export function scanContract(contract: string, policies: Policy[]): RuleCheckResult {
  const issues: ReviewIssue[] = []
  const lines = contract.split('\n')

  // 1. 关键词扫描
  for (const rule of VIOLATION_RULES) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const matches = line.match(rule.pattern)
      if (matches) {
        for (const match of matches) {
          issues.push({
            location: `第 ${i + 1} 行`,
            content: match,
            severity: rule.severity,
            suggestion: rule.suggestion,
          })
        }
      }
    }
  }

  // 2. 政策匹配检查
  for (const policy of policies) {
    const keywords = extractKeywords(policy.content)
    for (const keyword of keywords) {
      if (contract.includes(keyword)) {
        // 找到了关键词，检查上下文是否合规
        const context = extractContext(contract, keyword)
        if (!isCompliantWithPolicy(context, policy)) {
          issues.push({
            location: `"${keyword}" 附近`,
            content: context,
            severity: 'warning',
            suggestion: `建议参照「${policy.title}」进行修改`,
          })
        }
      }
    }
  }

  // 3. 必要条款检查
  for (const clause of REQUIRED_CLAUSES) {
    const found = clause.patterns.some(p => p.test(contract))
    if (!found) {
      issues.push({
        location: '全文',
        content: clause.name,
        severity: clause.severity,
        suggestion: clause.message,
      })
    }
  }

  // 计算合规分数
  const errorCount = issues.filter(i => i.severity === 'error').length
  const warningCount = issues.filter(i => i.severity === 'warning').length
  const infoCount = issues.filter(i => i.severity === 'info').length
  const score = Math.max(0, 100 - errorCount * 15 - warningCount * 8 - infoCount * 2)

  const summary = issues.length === 0
    ? '合同审核通过，未发现明显违规问题。'
    : `发现 ${issues.length} 个问题：${errorCount} 个错误、${warningCount} 个警告、${infoCount} 个提示。`

  return { issues, score, summary }
}

function extractKeywords(content: string): string[] {
  // 从政策内容中提取关键词（取中文词汇）
  const words = content.match(/[一-龥]{2,6}/g) || []
  // 过滤太常见的词
  const stopwords = ['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这']
  return [...new Set(words.filter(w => !stopwords.includes(w) && w.length >= 2))].slice(0, 20)
}

function extractContext(contract: string, keyword: string): string {
  const index = contract.indexOf(keyword)
  if (index === -1) return keyword
  const start = Math.max(0, index - 30)
  const end = Math.min(contract.length, index + keyword.length + 30)
  return contract.slice(start, end)
}

function isCompliantWithPolicy(context: string, policy: Policy): boolean {
  // 简单的合规性判断：如果政策内容中包含否定词，则上下文中不应出现该词
  // 这是一个简化版本，实际可以更复杂
  const negativePatterns = ['不得', '禁止', '不允许', '严禁', '不可', '不能']
  for (const neg of negativePatterns) {
    if (policy.content.includes(neg) && context.includes(neg)) {
      return false
    }
  }
  return true
}

// 文档遗漏检测
export function checkMissingClauses(contract: string): Array<{ clause: string; severity: 'error' | 'warning'; message: string }> {
  const missing: Array<{ clause: string; severity: 'error' | 'warning'; message: string }> = []

  for (const clause of REQUIRED_CLAUSES) {
    const found = clause.patterns.some(p => p.test(contract))
    if (!found) {
      missing.push({
        clause: clause.name,
        severity: clause.severity,
        message: clause.message,
      })
    }
  }

  return missing
}
