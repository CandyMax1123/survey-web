/**
 * local-db.js — 纯 localStorage 数据库
 * 集合存储为 localStorage['db_{collection}'] = JSON 数组
 */

// 清除旧版 CloudBase 遗留数据（非数组格式）
;['questionnaires', 'share_tokens', 'answers'].forEach(col => {
  try {
    const raw = localStorage.getItem('db_' + col)
    if (raw) {
      const data = JSON.parse(raw)
      if (!Array.isArray(data)) localStorage.removeItem('db_' + col)
    }
  } catch { localStorage.removeItem('db_' + col) }
})

function loadCollection(collection) {
  try {
    const data = JSON.parse(localStorage.getItem('db_' + collection) || '[]')
    return Array.isArray(data) ? data : []
  } catch { return [] }
}

function saveCollection(collection, docs) {
  localStorage.setItem('db_' + collection, JSON.stringify(docs))
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

export function serverTimestamp() {
  return { __type: 'timestamp', value: Date.now() }
}

export function parseTimestamp(ts) {
  if (!ts) return null
  if (ts.__type === 'timestamp') return new Date(ts.value)
  if (ts instanceof Date) return ts
  if (typeof ts === 'number') return new Date(ts)
  return null
}

export const db = {
  add(collection, data) {
    const docs = loadCollection(collection)
    const id = genId()
    const doc = { ...data, _id: id }
    docs.push(doc)
    saveCollection(collection, docs)
    return Promise.resolve({ id })
  },

  get(collection, id) {
    const docs = loadCollection(collection)
    const doc = docs.find(d => d._id === id)
    return Promise.resolve({
      exists: !!doc,
      id: id,
      data() { return doc ? { ...doc } : null }
    })
  },

  update(collection, id, fields) {
    const docs = loadCollection(collection)
    const idx = docs.findIndex(d => d._id === id)
    if (idx >= 0) {
      docs[idx] = { ...docs[idx], ...fields }
      saveCollection(collection, docs)
    }
    return Promise.resolve()
  },

  delete(collection, id) {
    const docs = loadCollection(collection)
    saveCollection(collection, docs.filter(d => d._id !== id))
    return Promise.resolve()
  },

  query(collection, { filters = [], orderBy: ob = null, limit = 500 } = {}) {
    let docs = loadCollection(collection)

    for (const { field, op, value } of filters) {
      docs = docs.filter(d => {
        const v = d[field]
        if (op === '==') return v === value
        if (op === '!=') return v !== value
        if (op === '<')  return v < value
        if (op === '<=') return v <= value
        if (op === '>')  return v > value
        if (op === '>=') return v >= value
        return true
      })
    }

    if (ob) {
      docs.sort((a, b) => {
        const av = tsVal(a[ob.field]), bv = tsVal(b[ob.field])
        return ob.desc ? bv - av : av - bv
      })
    }

    docs = docs.slice(0, limit)

    return Promise.resolve(docs.map(doc => ({
      id: doc._id,
      data() { return { ...doc } }
    })))
  }
}

function tsVal(v) {
  if (!v) return 0
  if (v.__type === 'timestamp') return v.value
  if (typeof v === 'number') return v
  return 0
}
