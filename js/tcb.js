/**
 * tcb.js — 腾讯云 CloudBase 初始化
 * 导出 app、auth、db 供各模块使用
 */

const ENV_ID = 'candymaxserver-d2gt2bl4j640d935a'

// 等待 SDK 加载完成（兼容 cloudbase / tcb 两种全局变量名）
function waitForSDK() {
  return new Promise((resolve) => {
    if (window.cloudbase || window.tcb) { resolve(); return }
    const check = setInterval(() => {
      if (window.cloudbase || window.tcb) { clearInterval(check); resolve() }
    }, 50)
  })
}

await waitForSDK()

const sdk = window.cloudbase || window.tcb
export const app = sdk.init({ env: ENV_ID })
export const auth = app.auth({ persistence: 'local' })
export const db  = app.database()
export const _ = db.command
