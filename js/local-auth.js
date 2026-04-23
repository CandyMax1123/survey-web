/**
 * local-auth.js — 纯本地认证，无需任何云服务
 * 管理员账号硬编码：candymax / 211123
 * session 存储在 sessionStorage（关闭浏览器自动退出）
 */

const ADMIN_USERNAME = 'candymax'
const ADMIN_PASSWORD = '211123'
const ADMIN_UID = 'admin-candymax'
const SESSION_KEY = 'survey_admin_session'

function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') } catch { return null }
}

function setSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export async function loginAdmin(username, password) {
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const user = { uid: ADMIN_UID, username: ADMIN_USERNAME }
    setSession(user)
    return user
  }
  throw new Error('用户名或密码错误')
}

export async function requireAdmin() {
  const user = getSession()
  if (user && user.uid === ADMIN_UID) return user
  location.href = 'admin.html'
  throw new Error('Not authenticated as admin')
}

export async function signOut() {
  clearSession()
}

export async function signInAsRespondent() {
  // 答题者用 localStorage 存匿名 uid
  let uid = localStorage.getItem('respondent_uid')
  if (!uid) {
    uid = 'r_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
    localStorage.setItem('respondent_uid', uid)
  }
  return { uid }
}

export function getAdminUser() {
  return getSession()
}
