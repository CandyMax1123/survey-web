/**
 * test.mjs — 全功能自动化测试
 * 运行: node test.mjs
 */

// ===== 模拟浏览器环境 =====
const store = {}
global.localStorage = {
  getItem: k => store[k] ?? null,
  setItem: (k, v) => { store[k] = String(v) },
  removeItem: k => { delete store[k] },
}
const sstore = {}
global.sessionStorage = {
  getItem: k => sstore[k] ?? null,
  setItem: (k, v) => { sstore[k] = String(v) },
  removeItem: k => { delete sstore[k] },
}
global.location = { href: '' }

// ===== 测试框架 =====
let passed = 0, failed = 0
function ok(name) { console.log(`  ✓ ${name}`); passed++ }
function fail(name, reason) { console.error(`  ✗ ${name}: ${reason}`); failed++ }

async function test(name, fn) {
  try { await fn(); ok(name) }
  catch(e) { fail(name, e.message) }
}

function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed') }
function assertEqual(a, b) { if (a !== b) throw new Error(`expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`) }

// ===== 重置 store =====
function resetStore() {
  for (const k of Object.keys(store)) delete store[k]
  for (const k of Object.keys(sstore)) delete sstore[k]
}

// ===== 动态 import =====
const { loginAdmin, requireAdmin, signOut, signInAsRespondent, getAdminUser } =
  await import('./js/local-auth.js')
const { db, serverTimestamp } = await import('./js/local-db.js')
const { formatDate, generateToken, generateId, getParam } = await import('./js/utils.js')

// ================================================================
console.log('\n【1】local-auth.js 认证测试')
// ================================================================

await test('正确用户名密码登录成功', async () => {
  resetStore()
  const user = await loginAdmin('candymax', '211123')
  assert(user.uid, 'uid 不存在')
  assert(user.username === 'candymax', 'username 错误')
})

await test('错误密码抛出错误', async () => {
  resetStore()
  let threw = false
  try { await loginAdmin('candymax', 'wrong') } catch(e) { threw = true }
  assert(threw, '应该抛出错误')
})

await test('错误用户名抛出错误', async () => {
  resetStore()
  let threw = false
  try { await loginAdmin('hacker', '211123') } catch(e) { threw = true }
  assert(threw, '应该抛出错误')
})

await test('登录后 getAdminUser 返回用户', async () => {
  resetStore()
  await loginAdmin('candymax', '211123')
  const u = getAdminUser()
  assert(u && u.uid, 'getAdminUser 应返回用户')
})

await test('未登录 getAdminUser 返回 null', async () => {
  resetStore()
  const u = getAdminUser()
  assert(u === null, '未登录应返回 null')
})

await test('requireAdmin 已登录返回用户', async () => {
  resetStore()
  await loginAdmin('candymax', '211123')
  global.location.href = ''
  let threw = false
  try { await requireAdmin() } catch(e) { threw = true }
  assert(!threw, 'requireAdmin 不应抛出')
})

await test('requireAdmin 未登录跳转 admin.html', async () => {
  resetStore()
  global.location.href = ''
  try { await requireAdmin() } catch(e) {}
  assertEqual(global.location.href, 'admin.html')
})

await test('signOut 清除 session', async () => {
  resetStore()
  await loginAdmin('candymax', '211123')
  await signOut()
  const u = getAdminUser()
  assert(u === null, 'signOut 后 getAdminUser 应为 null')
})

await test('signInAsRespondent 返回带 uid 的用户', async () => {
  resetStore()
  const u = await signInAsRespondent()
  assert(u && u.uid, 'uid 不存在')
})

await test('signInAsRespondent 同浏览器返回相同 uid', async () => {
  resetStore()
  const u1 = await signInAsRespondent()
  const u2 = await signInAsRespondent()
  assertEqual(u1.uid, u2.uid)
})

// ================================================================
console.log('\n【2】local-db.js 数据库测试')
// ================================================================

await test('add 返回新 id', async () => {
  resetStore()
  const res = await db.add('test', { name: 'hello' })
  assert(res.id, 'id 不存在')
})

await test('get 能获取已添加文档', async () => {
  resetStore()
  const { id } = await db.add('test', { name: 'world', val: 42 })
  const snap = await db.get('test', id)
  assert(snap.exists, 'exists 应为 true')
  assertEqual(snap.data().name, 'world')
  assertEqual(snap.data().val, 42)
})

await test('get 不存在文档 exists=false', async () => {
  resetStore()
  const snap = await db.get('test', 'nonexistent')
  assert(!snap.exists, 'exists 应为 false')
  assert(snap.data() === null, 'data() 应为 null')
})

await test('update 更新字段', async () => {
  resetStore()
  const { id } = await db.add('test', { a: 1, b: 2 })
  await db.update('test', id, { b: 99 })
  const snap = await db.get('test', id)
  assertEqual(snap.data().a, 1)
  assertEqual(snap.data().b, 99)
})

await test('delete 删除文档', async () => {
  resetStore()
  const { id } = await db.add('test', { x: 1 })
  await db.delete('test', id)
  const snap = await db.get('test', id)
  assert(!snap.exists, '删除后 exists 应为 false')
})

await test('query == 过滤', async () => {
  resetStore()
  await db.add('q', { type: 'A', val: 1 })
  await db.add('q', { type: 'B', val: 2 })
  await db.add('q', { type: 'A', val: 3 })
  const res = await db.query('q', { filters: [{ field: 'type', op: '==', value: 'A' }] })
  assertEqual(res.length, 2)
})

await test('query != 过滤', async () => {
  resetStore()
  await db.add('q2', { type: 'A' })
  await db.add('q2', { type: 'B' })
  const res = await db.query('q2', { filters: [{ field: 'type', op: '!=', value: 'A' }] })
  assertEqual(res.length, 1)
  assertEqual(res[0].data().type, 'B')
})

await test('query orderBy desc', async () => {
  resetStore()
  const ts = () => serverTimestamp()
  await new Promise(r => setTimeout(r, 5))
  const { id: id1 } = await db.add('q3', { createdAt: ts(), name: 'first' })
  await new Promise(r => setTimeout(r, 5))
  const { id: id2 } = await db.add('q3', { createdAt: ts(), name: 'second' })
  const res = await db.query('q3', { orderBy: { field: 'createdAt', desc: true } })
  assertEqual(res[0].data().name, 'second')
  assertEqual(res[1].data().name, 'first')
})

await test('query limit', async () => {
  resetStore()
  for (let i = 0; i < 5; i++) await db.add('qlimit', { i })
  const res = await db.query('qlimit', { limit: 3 })
  assertEqual(res.length, 3)
})

await test('serverTimestamp 返回可被 formatDate 解析的格式', async () => {
  resetStore()
  const ts = serverTimestamp()
  assert(ts.__type === 'timestamp', '__type 错误')
  const d = formatDate(ts)
  assert(d.length > 0, 'formatDate 返回空字符串')
  assert(d.includes('-'), '格式不含日期分隔符')
})

// ================================================================
console.log('\n【3】完整业务流程测试')
// ================================================================

await test('管理员创建问卷', async () => {
  resetStore()
  await loginAdmin('candymax', '211123')
  const user = getAdminUser()
  const { id } = await db.add('questionnaires', {
    _adminUid: user.uid,
    name: '测试问卷',
    description: '描述',
    questions: [
      { id: 'q1', type: 'single_choice', title: '你好吗', required: true, options: ['好', '不好'] },
      { id: 'q2', type: 'text_fill', title: '备注', required: false },
    ],
    createdAt: serverTimestamp(),
  })
  const snap = await db.get('questionnaires', id)
  assertEqual(snap.data().name, '测试问卷')
  assertEqual(snap.data().questions.length, 2)
})

await test('管理员查询自己的问卷', async () => {
  resetStore()
  await loginAdmin('candymax', '211123')
  const user = getAdminUser()
  await db.add('questionnaires', { _adminUid: user.uid, name: 'A', createdAt: serverTimestamp() })
  await db.add('questionnaires', { _adminUid: 'other', name: 'B', createdAt: serverTimestamp() })
  const res = await db.query('questionnaires', { filters: [{ field: '_adminUid', op: '==', value: user.uid }] })
  assertEqual(res.length, 1)
  assertEqual(res[0].data().name, 'A')
})

await test('创建分享链接', async () => {
  resetStore()
  const { id: qid } = await db.add('questionnaires', { _adminUid: 'admin-candymax', name: 'Q' })
  const token = generateToken()
  assert(token.length === 16, 'token 长度错误')
  const { id } = await db.add('share_tokens', {
    questionnaireId: qid,
    token,
    nickname: '张三',
    respondentUid: null,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
  const snap = await db.get('share_tokens', id)
  assertEqual(snap.data().status, 'pending')
  assertEqual(snap.data().nickname, '张三')
})

await test('答题者认领并提交问卷', async () => {
  resetStore()
  // 创建问卷
  const { id: qid } = await db.add('questionnaires', {
    _adminUid: 'admin-candymax',
    name: '答题测试',
    questions: [{ id: 'q1', type: 'single_choice', title: '选项', required: true, options: ['A', 'B'] }],
  })
  // 创建 token
  const token = generateToken()
  const { id: tokenId } = await db.add('share_tokens', {
    questionnaireId: qid, token, nickname: '李四',
    respondentUid: null, status: 'pending', createdAt: serverTimestamp(),
  })
  // 答题者认领
  const respondent = await signInAsRespondent()
  await db.update('share_tokens', tokenId, {
    respondentUid: respondent.uid, status: 'opened', usedAt: serverTimestamp(),
  })
  // 提交答案
  await db.add('answers', {
    shareTokenId: tokenId,
    questionnaireId: qid,
    respondentUid: respondent.uid,
    submittedAt: serverTimestamp(),
    questionSnapshot: [{ id: 'q1', type: 'single_choice', title: '选项', options: ['A', 'B'] }],
    responses: [{ questionId: 'q1', type: 'single_choice', value: 'A' }],
  })
  await db.update('share_tokens', tokenId, { status: 'submitted', submittedAt: serverTimestamp() })
  // 验证
  const tokenSnap = await db.get('share_tokens', tokenId)
  assertEqual(tokenSnap.data().status, 'submitted')
  const answers = await db.query('answers', { filters: [{ field: 'shareTokenId', op: '==', value: tokenId }] })
  assertEqual(answers.length, 1)
  assertEqual(answers[0].data().responses[0].value, 'A')
})

await test('管理员删除答案并重置状态', async () => {
  resetStore()
  const { id: tokenId } = await db.add('share_tokens', {
    questionnaireId: 'q1', status: 'submitted', respondentUid: 'r1',
  })
  await db.add('answers', { shareTokenId: tokenId, respondentUid: 'r1' })
  // 删除答案
  const answers = await db.query('answers', { filters: [{ field: 'shareTokenId', op: '==', value: tokenId }] })
  for (const a of answers) await db.delete('answers', a.id)
  await db.update('share_tokens', tokenId, { status: 'opened', submittedAt: null, respondentUid: null })
  // 验证
  const tokenSnap = await db.get('share_tokens', tokenId)
  assertEqual(tokenSnap.data().status, 'opened')
  const remaining = await db.query('answers', { filters: [{ field: 'shareTokenId', op: '==', value: tokenId }] })
  assertEqual(remaining.length, 0)
})

await test('管理员删除整个 token 含答案', async () => {
  resetStore()
  const { id: tokenId } = await db.add('share_tokens', { status: 'submitted' })
  await db.add('answers', { shareTokenId: tokenId })
  await db.add('answers', { shareTokenId: tokenId })
  const answers = await db.query('answers', { filters: [{ field: 'shareTokenId', op: '==', value: tokenId }] })
  for (const a of answers) await db.delete('answers', a.id)
  await db.delete('share_tokens', tokenId)
  const tokenSnap = await db.get('share_tokens', tokenId)
  assert(!tokenSnap.exists, 'token 应被删除')
  const remaining = await db.query('answers', { filters: [{ field: 'shareTokenId', op: '==', value: tokenId }] })
  assertEqual(remaining.length, 0)
})

await test('token 不可被他人认领（已绑定其他 uid）', async () => {
  resetStore()
  const { id: tokenId } = await db.add('share_tokens', {
    respondentUid: 'r_owner', status: 'opened',
  })
  const snap = await db.get('share_tokens', tokenId)
  const respondentUid = 'r_other'
  const alreadyTaken = snap.data().respondentUid !== null && snap.data().respondentUid !== respondentUid
  assert(alreadyTaken, '应判断为已被他人认领')
})

await test('generateToken 生成唯一 16 位 token', async () => {
  const tokens = new Set()
  for (let i = 0; i < 100; i++) tokens.add(generateToken())
  assertEqual(tokens.size, 100)
  for (const t of tokens) assertEqual(t.length, 16)
})

await test('generateId 生成唯一 id', async () => {
  const ids = new Set()
  for (let i = 0; i < 100; i++) ids.add(generateId())
  assertEqual(ids.size, 100)
})

// ================================================================
console.log('\n【4】utils 工具函数测试')
// ================================================================

await test('formatDate 正常日期', async () => {
  const ts = { __type: 'timestamp', value: new Date('2024-03-15 09:05:00').getTime() }
  const d = formatDate(ts)
  assert(d.includes('2024'), '年份错误')
  assert(d.includes('03'), '月份错误')
})

await test('formatDate 空值返回空字符串', async () => {
  assertEqual(formatDate(null), '')
  assertEqual(formatDate(undefined), '')
})

// ================================================================
console.log('\n' + '='.repeat(40))
console.log(`测试结果: ${passed} 通过, ${failed} 失败`)
if (failed > 0) {
  console.error('❌ 有测试失败！')
  process.exit(1)
} else {
  console.log('✅ 全部通过！')
}
