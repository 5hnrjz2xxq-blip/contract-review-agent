import { Policy, Template } from '../types'

const STORAGE_KEY = 'contract-review-policies'
const TEMPLATE_KEY = 'contract-review-templates'

export function loadPolicies(): Policy[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function savePolicies(policies: Policy[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(policies))
}

export function loadTemplates(): Template[] {
  try {
    const data = localStorage.getItem(TEMPLATE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveTemplates(templates: Template[]): void {
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates))
}

export function createPolicy(title: string, content: string, category: string, source: string): Policy {
  return {
    id: Date.now(),
    title,
    content,
    category,
    source,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function createTemplate(name: string, content: string, category: string): Template {
  return {
    id: Date.now(),
    name,
    content,
    category,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function parseTextPolicy(text: string, filename: string): Policy[] {
  const sections = text.split(/\n(?=【|[#＃])/g).filter(s => s.trim())
  if (sections.length === 0) {
    return [createPolicy(filename, text, '其他', '文本导入')]
  }

  return sections.map(section => {
    const lines = section.trim().split('\n')
    const firstLine = lines[0].replace(/^[【#＃\s]+|[】\s]+$/g, '').trim()
    return createPolicy(
      firstLine || filename,
      lines.slice(1).join('\n').trim() || section.trim(),
      detectCategory(firstLine + section),
      '文本导入'
    )
  })
}

function detectCategory(text: string): string {
  const categoryMap: Record<string, string[]> = {
    '退款政策': ['退款', '退费', '取消', '退订'],
    '保险条款': ['保险', '保障', '赔偿'],
    '行程安排': ['行程', '路线', '景点', '住宿'],
    '价格条款': ['价格', '费用', '报价', '优惠'],
    '法律责任': ['责任', '法律', '纠纷', '仲裁'],
    '安全须知': ['安全', '风险', '警示'],
    '服务标准': ['服务', '标准', '品质'],
  }

  for (const [category, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(kw => text.includes(kw))) {
      return category
    }
  }
  return '其他'
}

export async function importFile(file: File): Promise<string> {
  if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
    return file.text()
  }

  if (file.name.endsWith('.docx')) {
    const mammoth = await import('mammoth')
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  }

  if (file.name.endsWith('.pdf')) {
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let text = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      text += content.items.map((item: any) => item.str).join(' ') + '\n'
    }
    return text
  }

  throw new Error(`不支持的文件格式: ${file.name}`)
}
