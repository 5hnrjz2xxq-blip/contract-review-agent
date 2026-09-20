export async function generateDocx(content: string, filename: string): Promise<void> {
  const docx = await import('docx')
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx

  const lines = content.split('\n')
  const paragraphs = lines.map(line => {
    const trimmed = line.trim()
    if (!trimmed) return new Paragraph({ text: '' })

    // Check for headings
    if (trimmed.startsWith('# ')) {
      return new Paragraph({
        children: [new TextRun({ text: trimmed.slice(2), bold: true, size: 32 })],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    }
    if (trimmed.startsWith('## ')) {
      return new Paragraph({
        children: [new TextRun({ text: trimmed.slice(3), bold: true, size: 28 })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
      })
    }
    if (trimmed.startsWith('### ')) {
      return new Paragraph({
        children: [new TextRun({ text: trimmed.slice(4), bold: true, size: 24 })],
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
      })
    }

    // Check for numbered list
    const numberedMatch = trimmed.match(/^(\d+)[.、]\s*(.*)/)
    if (numberedMatch) {
      return new Paragraph({
        children: [new TextRun({ text: `${numberedMatch[1]}. ${numberedMatch[2]}` })],
        spacing: { before: 80, after: 80 },
      })
    }

    // Check for bullet list
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('· ')) {
      return new Paragraph({
        children: [new TextRun({ text: `• ${trimmed.slice(2)}` })],
        spacing: { before: 80, after: 80 },
      })
    }

    // Bold text
    const text = trimmed.replace(/\*\*(.*?)\*\*/g, '$1')

    return new Paragraph({
      children: [new TextRun({ text, size: 22 })],
      spacing: { before: 80, after: 80 },
    })
  })

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: paragraphs,
    }],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.docx`
  a.click()
  URL.revokeObjectURL(url)
}

export async function generatePdf(content: string, filename: string): Promise<void> {
  // For PDF generation, we'll use a simple HTML-to-print approach
  const htmlContent = content
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)[.、]\s*(.+)$/gm, '<li>$1. $2</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')

  // Escape filename to prevent XSS
  const safeFilename = filename.replace(/[<>&"']/g, (c) => {
    const map: Record<string, string> = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }
    return map[c]
  })

  const printWindow = window.open('', '_blank')
  if (!printWindow) throw new Error('无法打开打印窗口，请检查浏览器设置')

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${safeFilename}</title>
      <style>
        body { font-family: 'SimSun', serif; padding: 40px; line-height: 1.8; }
        h1 { font-size: 22px; text-align: center; margin-bottom: 30px; }
        h2 { font-size: 18px; margin-top: 20px; }
        h3 { font-size: 16px; margin-top: 15px; }
        li { margin-left: 20px; margin-bottom: 5px; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      ${htmlContent}
      <script>
        setTimeout(() => { window.print(); }, 500);
      </script>
    </body>
    </html>
  `)
  printWindow.document.close()
}
