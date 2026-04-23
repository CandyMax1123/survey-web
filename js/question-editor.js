// js/question-editor.js
// 题目编辑 modal（内嵌在 edit.html 中，不跳转页面）

import { generateId } from './utils.js'

let _currentQuestion = null
let _currentIndex = -1
let _onSaveCallback = null

/**
 * 打开题目编辑 modal
 * @param {Object|null} question - 已有题目（编辑）或 null（新增）
 * @param {number} index - 题目在列表中的索引，-1 表示新增
 * @param {Function} onSave - (question, index) => void
 */
export function openModal(question, index, onSave) {
  _currentIndex = index
  _onSaveCallback = onSave

  if (question) {
    _currentQuestion = JSON.parse(JSON.stringify(question)) // 深拷贝
  } else {
    _currentQuestion = {
      id: generateId(),
      type: 'single_choice',
      title: '',
      options: ['', ''],
      rows: ['', ''],
      columns: ['非常好', '好', '一般', '差'],
    }
  }

  populateModal(_currentQuestion)
  document.getElementById('modal-overlay').removeAttribute('hidden')
  document.getElementById('q-title').focus()
}

/**
 * 关闭 modal
 */
export function closeModal() {
  document.getElementById('modal-overlay').setAttribute('hidden', '')
  _currentQuestion = null
  _currentIndex = -1
  _onSaveCallback = null
}

/**
 * 初始化 modal 的所有事件监听（在 edit.html DOMContentLoaded 中调用一次）
 */
export function initModalEvents() {
  const modal = document.getElementById('question-modal')
  const overlay = document.getElementById('modal-overlay')

  // 关闭按钮
  document.getElementById('modal-close').addEventListener('click', closeModal)
  document.getElementById('btn-cancel-question').addEventListener('click', closeModal)
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal() })

  // 题型切换
  document.getElementById('q-type').addEventListener('change', e => {
    if (_currentQuestion) {
      _currentQuestion.type = e.target.value
      syncTypeVisibility(e.target.value)
    }
  })

  // 题目标题输入
  document.getElementById('q-title').addEventListener('input', e => {
    if (_currentQuestion) _currentQuestion.title = e.target.value
  })

  // 单选/多选 添加选项
  document.getElementById('btn-add-option').addEventListener('click', () => {
    if (!_currentQuestion) return
    _currentQuestion.options.push('')
    renderOptions()
  })

  // 矩阵行 添加
  document.getElementById('btn-add-row').addEventListener('click', () => {
    if (!_currentQuestion) return
    _currentQuestion.rows.push('')
    renderRows()
  })

  // 矩阵列 添加
  document.getElementById('btn-add-col').addEventListener('click', () => {
    if (!_currentQuestion) return
    _currentQuestion.columns.push('')
    renderCols()
  })

  // 保存
  document.getElementById('btn-save-question').addEventListener('click', saveQuestion)
}

/* ===== 填充 modal 表单 ===== */
function populateModal(q) {
  document.getElementById('q-type').value = q.type
  document.getElementById('q-title').value = q.title || ''
  syncTypeVisibility(q.type)
  renderOptions()
  renderRows()
  renderCols()

  // 更新 modal 标题
  document.getElementById('modal-heading').textContent = _currentIndex >= 0 ? '编辑题目' : '添加题目'
}

/* ===== 根据题型显示/隐藏对应输入区 ===== */
function syncTypeVisibility(type) {
  document.getElementById('section-options').style.display =
    (type === 'single_choice' || type === 'multiple_choice') ? '' : 'none'
  document.getElementById('section-matrix').style.display =
    type === 'matrix_single' ? '' : 'none'
  document.getElementById('section-fill-hint').style.display =
    type === 'text_fill' ? '' : 'none'
}

/* ===== 渲染选项列表（单选/多选）===== */
function renderOptions() {
  const container = document.getElementById('options-list')
  container.innerHTML = ''
  ;(_currentQuestion.options || []).forEach((opt, i) => {
    const row = document.createElement('div')
    row.className = 'option-edit-row'
    row.innerHTML = `
      <span style="color:var(--text-muted);font-size:.85rem;width:20px;flex-shrink:0;">${i+1}.</span>
      <input class="form-input" type="text" value="${escHtml(opt)}" placeholder="选项内容" data-index="${i}" />
      <button class="btn-icon" data-index="${i}" title="删除">×</button>
    `
    const input = row.querySelector('input')
    input.addEventListener('input', e => {
      _currentQuestion.options[i] = e.target.value
    })
    row.querySelector('.btn-icon').addEventListener('click', () => {
      if (_currentQuestion.options.length <= 2) {
        alert('至少保留 2 个选项')
        return
      }
      _currentQuestion.options.splice(i, 1)
      renderOptions()
    })
    container.appendChild(row)
  })
}

/* ===== 渲染矩阵行 ===== */
function renderRows() {
  const container = document.getElementById('rows-list')
  container.innerHTML = ''
  ;(_currentQuestion.rows || []).forEach((row, i) => {
    const div = document.createElement('div')
    div.className = 'option-edit-row'
    div.innerHTML = `
      <span style="color:var(--text-muted);font-size:.85rem;width:20px;flex-shrink:0;">${i+1}.</span>
      <input class="form-input" type="text" value="${escHtml(row)}" placeholder="子项名称" />
      <button class="btn-icon" title="删除">×</button>
    `
    const input = div.querySelector('input')
    input.addEventListener('input', e => { _currentQuestion.rows[i] = e.target.value })
    div.querySelector('.btn-icon').addEventListener('click', () => {
      if (_currentQuestion.rows.length <= 1) { alert('至少保留 1 个子项'); return }
      _currentQuestion.rows.splice(i, 1)
      renderRows()
    })
    container.appendChild(div)
  })
}

/* ===== 渲染矩阵列 ===== */
function renderCols() {
  const container = document.getElementById('cols-list')
  container.innerHTML = ''
  ;(_currentQuestion.columns || []).forEach((col, i) => {
    const div = document.createElement('div')
    div.className = 'option-edit-row'
    div.innerHTML = `
      <span style="color:var(--text-muted);font-size:.85rem;width:20px;flex-shrink:0;">${i+1}.</span>
      <input class="form-input" type="text" value="${escHtml(col)}" placeholder="程度名称" />
      <button class="btn-icon" title="删除">×</button>
    `
    const input = div.querySelector('input')
    input.addEventListener('input', e => { _currentQuestion.columns[i] = e.target.value })
    div.querySelector('.btn-icon').addEventListener('click', () => {
      if (_currentQuestion.columns.length <= 2) { alert('至少保留 2 个程度选项'); return }
      _currentQuestion.columns.splice(i, 1)
      renderCols()
    })
    container.appendChild(div)
  })
}

/* ===== 保存题目 ===== */
function saveQuestion() {
  const q = _currentQuestion
  if (!q) return

  // 验证标题
  if (!q.title.trim()) {
    alert('请填写题目标题')
    document.getElementById('q-title').focus()
    return
  }

  // 验证选项
  if (q.type === 'single_choice' || q.type === 'multiple_choice') {
    const valid = q.options.filter(o => o.trim())
    if (valid.length < 2) { alert('至少填写 2 个选项'); return }
    q.options = valid
  }

  // 验证矩阵
  if (q.type === 'matrix_single') {
    const validRows = q.rows.filter(r => r.trim())
    const validCols = q.columns.filter(c => c.trim())
    if (validRows.length < 1) { alert('至少填写 1 个子项'); return }
    if (validCols.length < 2) { alert('至少填写 2 个程度选项'); return }
    q.rows = validRows
    q.columns = validCols
  }

  _onSaveCallback && _onSaveCallback({ ...q }, _currentIndex)
  closeModal()
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
