// js/auth.js — 管理员身份守卫 + 匿名登录工具

import { auth } from './firebase-config.js'
import {
  onAuthStateChanged,
  signInAnonymously,
  signOut as firebaseSignOut
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js'

/**
 * 要求管理员登录（非匿名）。
 * 若未登录或为匿名用户，跳转到 login.html。
 * 返回 Promise<User>
 */
export function requireAdmin() {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      unsubscribe()
      if (user && !user.isAnonymous) {
        resolve(user)
      } else {
        location.href = 'login.html'
        reject(new Error('Not authenticated as admin'))
      }
    })
  })
}

/**
 * 获取当前登录的管理员（不跳转，用于已挂载后的操作）
 */
export function getCurrentAdmin() {
  const user = auth.currentUser
  if (!user || user.isAnonymous) return null
  return user
}

/**
 * 匿名登录（答题者使用）。
 * 若已登录（匿名或非匿名），直接返回当前用户。
 * 返回 Promise<User>
 */
export function signInAsRespondent() {
  return new Promise((resolve, reject) => {
    const current = auth.currentUser
    if (current) { resolve(current); return }
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) { unsubscribe(); resolve(user); return }
      // 无用户，匿名登录
      signInAnonymously(auth)
        .then(cred => { unsubscribe(); resolve(cred.user) })
        .catch(err => { unsubscribe(); reject(err) })
    })
  })
}

/**
 * 登出
 */
export function signOut() {
  return firebaseSignOut(auth)
}

/**
 * 监听管理员状态变化（用于需要实时监听的场景）
 */
export function onAdminStateChanged(callback) {
  return onAuthStateChanged(auth, user => {
    if (user && !user.isAnonymous) callback(user)
    else callback(null)
  })
}
