/**
 * cloudbase-auth.js — 腾讯云 CloudBase 认证封装
 * 保持与 local-auth.js 相同的 API 接口
 * 管理员账号：candymax / 211123（本地校验 + session）
 */

const ADMIN_USERNAME = 'candymax'
const ADMIN_PASSWORD = '211123'
const ADMIN_UID = 'admin-candymax'
const SESSION_KEY = 'survey_admin_session'
const ENV_ID = 'candymaxserver-d2gt2bl4j640d935a'

let _app = null
let _auth = null

function getSdk() {
  return window.cloudbase || window.tcb
}

function getApp() {
  if (!_app) _app = getSdk().init({ env: ENV_ID })
  return _app
}

function getAuth() {
  if (!_auth) _auth = getApp().auth({ persistence: 'local' })
  return _auth
}

// 确保匿名登录（CloudBase 要求有登录态才能访问数据库）
async function ensureAnonymousAuth() {
  try {
    const loginState = await getAuth().getLoginState()
    if (!loginState) await getAuth().anonymousAuthProvider().signIn()
  } catch {
    try { await getAuth().anonymousAuthProvider().signIn() } catch(e) { console.warn('CloudBase anon auth:', e) }
  }
}

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
    await ensureAnonymousAuth()
    const user = { uid: ADMIN_UID, username: ADMIN_USERNAME }
    setSession(user)
    return user
  }
  throw new Error('用户名或密码错误')
}

export async function requireAdmin() {
  const user = getSession()
  if (user && user.uid === ADMIN_UID) {
    await ensureAnonymousAuth()
    return user
  }
  location.href = 'admin.html'
  throw new Error('Not authenticated as admin')
}

export async function signOut() {
  clearSession()
}

export async function signInAsRespondent() {
  await ensureAnonymousAuth()
  const loginState = await getAuth().getLoginState()
  const cloudUid = loginState?.user?.uid || loginState?.uid || ''

  // 用本地 uid 作为稳定标识（CloudBase 匿名 uid 在清除 IndexedDB 后会变）
  let uid = localStorage.getItem('respondent_uid')
  if (!uid) {
    uid = 'r_' + (cloudUid || Date.now().toString(36)) + '_' + Math.random().toString(36).slice(2, 7)
    localStorage.setItem('respondent_uid', uid)
  }
  return { uid }
}

export function getAdminUser() {
  return getSession()
}
