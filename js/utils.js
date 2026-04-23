// js/utils.js — 通用工具函数

/**
 * 生成题目 ID（客户端用）
 */
export function generateId() {
  return 'q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

/**
 * 生成分享 token（16位随机字符，使用 crypto.getRandomValues）
 */
export function generateToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => chars[b % chars.length]).join('')
}

/**
 * 格式化 Firestore Timestamp 或 Date 为可读字符串
 */
export function formatDate(ts) {
  if (!ts) return ''
  let d
  if (ts.__type === 'timestamp') d = new Date(ts.value)
  else if (ts.toDate) d = ts.toDate()
  else d = new Date(ts)
  if (isNaN(d)) return ''
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Toast 通知（success | error | info）
 */
let _toastContainer = null
function getToastContainer() {
  if (!_toastContainer) {
    _toastContainer = document.getElementById('toast-container')
    if (!_toastContainer) {
      _toastContainer = document.createElement('div')
      _toastContainer.id = 'toast-container'
      document.body.appendChild(_toastContainer)
    }
  }
  return _toastContainer
}

export function showToast(msg, type = 'info', duration = 2500) {
  const el = document.createElement('div')
  el.className = `toast toast-${type}`
  el.textContent = msg
  getToastContainer().appendChild(el)
  setTimeout(() => el.remove(), duration)
}

/**
 * Loading 遮罩
 */
let _loadingEl = null
function getLoadingEl() {
  if (!_loadingEl) {
    _loadingEl = document.getElementById('loading-overlay')
    if (!_loadingEl) {
      _loadingEl = document.createElement('div')
      _loadingEl.id = 'loading-overlay'
      _loadingEl.innerHTML = '<div class="spinner"></div>'
      _loadingEl.classList.add('hidden')
      document.body.appendChild(_loadingEl)
    }
  }
  return _loadingEl
}

export function showLoading() { getLoadingEl().classList.remove('hidden') }
export function hideLoading() { getLoadingEl().classList.add('hidden') }

/**
 * 自定义确认对话框（返回 Promise<boolean>）
 */
export function confirm(message, confirmText = '确定', cancelText = '取消', dangerous = false) {
  return new Promise(resolve => {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay center'
    overlay.innerHTML = `
      <div class="modal-box" style="padding:28px 24px;">
        <div class="modal-title" style="margin-bottom:12px;">提示</div>
        <p style="color:var(--text-muted);font-size:.95rem;line-height:1.6;margin-bottom:24px;">${message}</p>
        <div class="modal-actions">
          <button class="btn btn-plain js-cancel">${cancelText}</button>
          <button class="btn ${dangerous ? 'btn-danger' : 'btn-primary'} js-confirm">${confirmText}</button>
        </div>
      </div>
    `
    document.body.appendChild(overlay)
    overlay.querySelector('.js-cancel').onclick = () => { overlay.remove(); resolve(false) }
    overlay.querySelector('.js-confirm').onclick = () => { overlay.remove(); resolve(true) }
    overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); resolve(false) } })
  })
}

/**
 * 简单输入对话框（返回 Promise<string|null>）
 */
export function prompt(message, defaultValue = '', placeholder = '') {
  return new Promise(resolve => {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay center'
    overlay.innerHTML = `
      <div class="modal-box" style="padding:28px 24px;">
        <div class="modal-title" style="margin-bottom:12px;">${message}</div>
        <input class="form-input js-prompt-input" value="${defaultValue}" placeholder="${placeholder}" style="margin-bottom:20px;" />
        <div class="modal-actions">
          <button class="btn btn-plain js-cancel">取消</button>
          <button class="btn btn-primary js-confirm">确定</button>
        </div>
      </div>
    `
    document.body.appendChild(overlay)
    const input = overlay.querySelector('.js-prompt-input')
    input.focus()
    const done = (val) => { overlay.remove(); resolve(val) }
    overlay.querySelector('.js-cancel').onclick = () => done(null)
    overlay.querySelector('.js-confirm').onclick = () => done(input.value)
    input.addEventListener('keydown', e => { if (e.key === 'Enter') done(input.value) })
    overlay.addEventListener('click', e => { if (e.target === overlay) done(null) })
  })
}

/**
 * 草稿存储（localStorage）
 */
export function saveDraft(shareTokenId, responses) {
  localStorage.setItem('draft_' + shareTokenId, JSON.stringify({ responses, savedAt: Date.now() }))
}

export function loadDraft(shareTokenId) {
  try {
    const raw = localStorage.getItem('draft_' + shareTokenId)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data.savedAt || Date.now() - data.savedAt > 7 * 24 * 3600 * 1000) return null
    return data.responses
  } catch { return null }
}

export function clearDraft(shareTokenId) {
  localStorage.removeItem('draft_' + shareTokenId)
}

/**
 * URL 查询参数
 */
export function getParam(name) {
  return new URLSearchParams(location.search).get(name)
}

/**
 * 题型标签映射
 */
export const TYPE_LABELS = {
  single_choice: '单选',
  multiple_choice: '多选',
  matrix_single: '矩阵单选',
  text_fill: '填空',
}
