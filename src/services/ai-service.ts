import { AIConfig, Policy } from '../types'

const SYSTEM_PROMPT = `你是一个专业的旅游合同审核助手。你的职责是：
1. 审核旅游合同内容，检查是否有违规用词、不合理条款、法律风险
2. 根据提供的政策和公司规定进行合规性检查
3. 帮助生成合规的旅游合同文档
4. 检测合同中的条款遗漏并提出补充建议

审核时请关注以下方面：
- 是否存在虚假宣传或夸大表述
- 是否有霸王条款或不公平条款
- 退款/取消政策是否合规
- 保险和责任条款是否完整
- 价格表述是否透明
- 行程安排是否清晰
- 是否有法律法规禁止的内容

请用中文回复，结果要专业、准确、有条理。`

function buildReviewPrompt(contract: string, policies: Policy[]): string {
  const policyText = policies.length > 0
    ? policies.map(p => `【${p.category}】${p.title}:\n${p.content}`).join('\n\n')
    : '暂无导入的政策文件。'

  return `请审核以下旅游合同内容，根据提供的政策和公司规定进行合规性检查。

## 合同内容
${contract}

## 相关政策和公司规定
${policyText}

请按以下格式输出审核结果：
1. 总体合规性评价（合规/不合规）
2. 发现的问题列表（位置、内容、严重程度、修改建议）
3. 总结和改进建议`
}

function buildDocumentPrompt(
  template: string,
  userInput: string,
  policies: Policy[]
): string {
  const policyText = policies.length > 0
    ? policies.map(p => `【${p.category}】${p.title}:\n${p.content}`).join('\n\n')
    : '暂无导入的政策文件。'

  return `请根据以下模板和用户输入，生成一份合规的旅游合同文档。

## 模板内容
${template}

## 用户输入
${userInput}

## 相关政策和公司规定
${policyText}

要求：
1. 保持模板的整体结构
2. 根据用户输入填充具体内容
3. 确保符合相关政策规定
4. 如果发现条款遗漏，请列出需要补充的内容
5. 输出完整的合同文档内容`
}

async function callClaude(
  config: AIConfig,
  prompt: string
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`Claude API 错误: ${response.status} - ${error.error?.message || '未知错误'}`)
  }

  const data = await response.json()
  return data.content[0].text
}

async function callOpenAI(
  config: AIConfig,
  prompt: string
): Promise<string> {
  const baseUrl = config.baseUrl || 'https://api.openai.com/v1'
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 4096,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`OpenAI API 错误: ${response.status} - ${error.error?.message || '未知错误'}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

export async function reviewContract(
  config: AIConfig,
  contract: string,
  policies: Policy[]
): Promise<string> {
  const prompt = buildReviewPrompt(contract, policies)
  if (config.provider === 'claude') {
    return callClaude(config, prompt)
  }
  return callOpenAI(config, prompt)
}

export async function generateDocument(
  config: AIConfig,
  template: string,
  userInput: string,
  policies: Policy[]
): Promise<string> {
  const prompt = buildDocumentPrompt(template, userInput, policies)
  if (config.provider === 'claude') {
    return callClaude(config, prompt)
  }
  return callOpenAI(config, prompt)
}

export async function chat(
  config: AIConfig,
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  if (config.provider === 'claude') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          ...history.map(h => ({ role: h.role, content: h.content })),
          { role: 'user', content: message },
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`Claude API 错误: ${response.status} - ${error.error?.message || '未知错误'}`)
    }

    const data = await response.json()
    return data.content[0].text
  }

  // OpenAI
  const baseUrl = config.baseUrl || 'https://api.openai.com/v1'
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: message },
      ],
      max_tokens: 4096,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`OpenAI API 错误: ${response.status} - ${error.error?.message || '未知错误'}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}
