// js/question-renderer.js
// 将问卷题目渲染为 DOM，支持「作答模式」和「只读模式」
// 两端（答题者作答 + 管理员/答题者查看结果）共用此模块

import { TYPE_LABELS } from './utils.js'

/**
 * 渲染整份问卷（所有题目）到 container 元素
 * @param {HTMLElement} container
 * @param {Array} questions - 题目数组
 * @param {Object} responses - { [questionId]: value }
 * @param {boolean} readonly
 * @param {Function} onChange - (questionId, value) => void，只读时忽略
 */
export function renderQuestionnaire(container, questions, responses, readonly, onChange) {
  container.innerHTML = ''
  questions.forEach((q, index) => {
    const block = buildQuestionBlock(q, responses[q.id], readonly, index, questions.length, onChange)
    container.appendChild(block)
  })
}

/**
 * 单题外层卡片
 */
function buildQuestionBlock(q, value, readonly, index, total, onChange) {
  const div = document.createElement('div')
  div.className = 'card question-block'
  div.dataset.questionId = q.id

  const seq = document.createElement('div')
  seq.className = 'q-seq'
  const isOptional = q.required === false
  seq.innerHTML = `第 ${index + 1} 题&nbsp;&nbsp;<span style="color:${isOptional ? 'var(--text-muted)' : 'var(--danger)'};font-weight:${isOptional ? '400' : '500'};">${isOptional ? '选填' : '必填'}</span>`
  div.appendChild(seq)

  let widget
  switch (q.type) {
    case 'single_choice':   widget = buildSingleChoice(q, value, readonly, onChange); break
    case 'multiple_choice': widget = buildMultipleChoice(q, value, readonly, onChange); break
    case 'matrix_single':   widget = buildMatrixSingle(q, value, readonly, onChange); break
    case 'text_fill':       widget = buildTextFill(q, value, readonly, onChange); break
    default: widget = document.createElement('div')
  }
  div.appendChild(widget)
  return div
}

function buildQuestionDesc(q) {
  if (!q.description) return ''
  const desc = document.createElement('div')
  desc.style.cssText = 'font-size:.85rem;color:var(--text-muted);line-height:1.6;margin-top:4px;margin-bottom:6px;'
  desc.textContent = q.description
  return desc
}
  if (readonly || q.required === false) return ''
  return '<span class="required">*</span>'
}

/* ===== 单选题 ===== */
function buildSingleChoice(q, value, readonly, onChange) {
  const wrap = document.createElement('div')

  const title = document.createElement('div')
  title.className = 'question-block-title'
  title.innerHTML = `${requiredMark(q, readonly)}${escHtml(q.title)}`
  wrap.appendChild(title)
  const desc = buildQuestionDesc(q); if (desc) wrap.appendChild(desc)

  ;(q.options || []).forEach(opt => {
    const isSelected = value === opt
    const row = document.createElement('div')
    row.className = `option-row${isSelected ? ' selected' : ''}${readonly ? ' readonly' : ''}`
    row.innerHTML = `
      <div class="radio-circle"></div>
      <span class="option-text">${escHtml(opt)}</span>
    `
    if (!readonly) {
      row.addEventListener('click', () => {
        wrap.querySelectorAll('.option-row').forEach(r => r.classList.remove('selected'))
        row.classList.add('selected')
        onChange && onChange(q.id, opt)
      })
    }
    wrap.appendChild(row)
  })
  return wrap
}

/* ===== 多选题 ===== */
function buildMultipleChoice(q, value, readonly, onChange) {
  const wrap = document.createElement('div')
  let selected = Array.isArray(value) ? [...value] : []

  const title = document.createElement('div')
  title.className = 'question-block-title'
  title.innerHTML = `${requiredMark(q, readonly)}${escHtml(q.title)} <span style="font-size:.8rem;color:var(--text-muted);font-weight:400;">（可多选）</span>`
  wrap.appendChild(title)
  const desc2 = buildQuestionDesc(q); if (desc2) wrap.appendChild(desc2)

  ;(q.options || []).forEach(opt => {
    const isSelected = selected.includes(opt)
    const row = document.createElement('div')
    row.className = `option-row${isSelected ? ' selected' : ''}${readonly ? ' readonly' : ''}`
    row.innerHTML = `
      <div class="checkbox-square">
        <svg viewBox="0 0 12 12"><polyline points="1.5,6 4.5,9 10.5,3"/></svg>
      </div>
      <span class="option-text">${escHtml(opt)}</span>
    `
    if (!readonly) {
      row.addEventListener('click', () => {
        const idx = selected.indexOf(opt)
        if (idx >= 0) { selected.splice(idx, 1); row.classList.remove('selected') }
        else { selected.push(opt); row.classList.add('selected') }
        onChange && onChange(q.id, [...selected])
      })
    }
    wrap.appendChild(row)
  })
  return wrap
}

/* ===== 矩阵单选题 ===== */
function buildMatrixSingle(q, value, readonly, onChange) {
  const wrap = document.createElement('div')
  const currentValue = (typeof value === 'object' && value !== null) ? { ...value } : {}

  const title = document.createElement('div')
  title.className = 'question-block-title'
  title.innerHTML = `${requiredMark(q, readonly)}${escHtml(q.title)}`
  wrap.appendChild(title)
  const desc3 = buildQuestionDesc(q); if (desc3) wrap.appendChild(desc3)

  const scrollDiv = document.createElement('div')
  scrollDiv.className = 'matrix-scroll'

  const table = document.createElement('table')
  table.className = 'matrix-table'

  // 表头
  const thead = table.createTHead()
  const hRow = thead.insertRow()
  const thEmpty = document.createElement('th')
  thEmpty.className = 'row-label'
  thEmpty.textContent = ''
  hRow.appendChild(thEmpty)
  ;(q.columns || []).forEach(col => {
    const th = document.createElement('th')
    th.textContent = col
    hRow.appendChild(th)
  })

  // 数据行
  const tbody = table.createTBody()
  ;(q.rows || []).forEach(row => {
    const tr = tbody.insertRow()
    const tdLabel = tr.insertCell()
    tdLabel.className = 'row-label'
    tdLabel.textContent = row

    ;(q.columns || []).forEach(col => {
      const td = tr.insertCell()
      const isSelected = currentValue[row] === col
      td.className = `matrix-cell${isSelected ? ' selected' : ''}${readonly ? ' readonly' : ''}`
      td.innerHTML = `<div class="matrix-radio"></div>`
      td.dataset.row = row
      td.dataset.col = col

      if (!readonly) {
        td.addEventListener('click', () => {
          tr.querySelectorAll('.matrix-cell').forEach(c => c.classList.remove('selected'))
          td.classList.add('selected')
          currentValue[row] = col
          onChange && onChange(q.id, { ...currentValue })
        })
      }
    })
  })

  scrollDiv.appendChild(table)
  wrap.appendChild(scrollDiv)
  return wrap
}

/* ===== 填空题 ===== */
function buildTextFill(q, value, readonly, onChange) {
  const wrap = document.createElement('div')

  const title = document.createElement('div')
  title.className = 'question-block-title'
  title.innerHTML = `${requiredMark(q, readonly)}${escHtml(q.title)}`
  wrap.appendChild(title)
  const desc4 = buildQuestionDesc(q); if (desc4) wrap.appendChild(desc4)

  const textarea = document.createElement('textarea')
  textarea.className = 'text-fill-area'
  textarea.placeholder = readonly ? '' : '请输入您的回答'
  textarea.value = value || ''
  textarea.maxLength = 500
  textarea.readOnly = readonly

  if (!readonly) {
    const charCount = document.createElement('div')
    charCount.className = 'char-count'
    charCount.textContent = `${(value || '').length}/500`
    textarea.addEventListener('input', () => {
      charCount.textContent = `${textarea.value.length}/500`
      onChange && onChange(q.id, textarea.value)
    })
    wrap.appendChild(textarea)
    wrap.appendChild(charCount)
  } else {
    if (!value || !value.trim()) {
      textarea.value = '（未填写）'
      textarea.style.color = 'var(--text-light)'
    }
    wrap.appendChild(textarea)
  }

  return wrap
}

/* ===== HTML 转义 ===== */
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
