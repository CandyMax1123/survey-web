/**
 * cloudbase-db.js — 腾讯云 CloudBase 数据库封装
 * 保持与 local-db.js 相同的 API 接口
 * 需要在页面中先通过 <script> 标签加载 cloudbase.full.js
 */

const ENV_ID = 'candymaxserver-d2gt2bl4j640d935a'

let _app = null
let _db  = null
let _auth = null

function getApp() {
  if (!_app) {
    const sdk = window.cloudbase || window.tcb
    _app = sdk.init({ env: ENV_ID })
  }
  return _app
}

function getCdb() {
  if (!_db) _db = getApp().database()
  return _db
}

function getAuth() {
  if (!_auth) _auth = getApp().auth({ persistence: 'local' })
  return _auth
}

async function ensureAuth() {
  try {
    const loginState = await getAuth().getLoginState()
    if (!loginState) await getAuth().anonymousAuthProvider().signIn()
  } catch {
    try { await getAuth().anonymousAuthProvider().signIn() } catch(e) { console.warn('CloudBase auth:', e) }
  }
}

// 将 {__type:'timestamp', value} 递归转换为 Date
function processData(obj) {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(processData)
  if (obj.__type === 'timestamp') return new Date(obj.value)
  const result = {}
  for (const [k, v] of Object.entries(obj)) result[k] = processData(v)
  return result
}

export function serverTimestamp() {
  return { __type: 'timestamp', value: Date.now() }
}

export const db = {
  async add(collection, data) {
    await ensureAuth()
    const result = await getCdb().collection(collection).add(processData(data))
    return { id: result.id }
  },

  async get(collection, id) {
    await ensureAuth()
    try {
      const result = await getCdb().collection(collection).doc(id).get()
      const doc = result.data && result.data[0]
      return {
        exists: !!doc,
        id,
        data() { return doc ? { ...doc } : null }
      }
    } catch {
      return { exists: false, id, data() { return null } }
    }
  },

  async update(collection, id, fields) {
    await ensureAuth()
    const cdb = getCdb()
    const _ = cdb.command
    const processed = processData(fields)
    // 对数组字段使用 _.set() 强制整体替换，避免 CloudBase 部分更新导致嵌套字段丢失
    const updateData = {}
    for (const [k, v] of Object.entries(processed)) {
      updateData[k] = Array.isArray(v) ? _.set(v) : v
    }
    await cdb.collection(collection).doc(id).update(updateData)
  },

  async delete(collection, id) {
    await ensureAuth()
    await getCdb().collection(collection).doc(id).remove()
  },

  async query(collection, { filters = [], orderBy: ob = null, limit = 500 } = {}) {
    await ensureAuth()
    const cdb = getCdb()
    let query = cdb.collection(collection)

    if (filters.length > 0) {
      const cmd = cdb.command
      const where = {}
      for (const { field, op, value } of filters) {
        if (op === '==')  where[field] = value
        else if (op === '!=') where[field] = cmd.neq(value)
        else if (op === '<')  where[field] = cmd.lt(value)
        else if (op === '<=') where[field] = cmd.lte(value)
        else if (op === '>')  where[field] = cmd.gt(value)
        else if (op === '>=') where[field] = cmd.gte(value)
      }
      query = query.where(where)
    }

    if (ob) query = query.orderBy(ob.field, ob.desc ? 'desc' : 'asc')
    query = query.limit(limit)

    const result = await query.get()
    return (result.data || []).map(doc => ({
      id: doc._id,
      data() { return { ...doc } }
    }))
  }
}
