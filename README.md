# 问卷系统 · 网页版

纯 HTML + CSS + JS 实现的问卷系统，使用 Firebase（Firestore + Auth）作为后端，无需构建工具，支持移动端。

---

## 功能概览

**管理员端**
- 注册/登录（邮箱+密码）
- 创建、编辑、删除问卷
- 题型：单选、多选、矩阵单选（每行选一个程度）、填空
- 为每位受访者生成独立的分享链接（不可共用）
- 为每个链接设置备注名（仅管理员可见）
- 查看/删除任意一份答卷

**受访者端**
- 无需注册，打开链接即可填写
- 同一浏览器可随时重新打开查看自己的答案（只读）
- 链接不可转让——首次打开即绑定到该浏览器

---

## 目录结构

```
survey-web/
├── index.html          # 管理员问卷列表（首页）
├── login.html          # 管理员登录/注册
├── edit.html           # 问卷编辑
├── share.html          # 分享管理
├── answer-view.html    # 管理员查看单份答卷
├── answer.html         # 受访者作答页
├── result.html         # 受访者查看自己的提交（只读）
├── css/
│   └── style.css
└── js/
    ├── firebase-config.js
    ├── auth.js
    ├── utils.js
    ├── question-renderer.js
    └── question-editor.js
```

---

## Firebase 配置步骤

### 1. 创建 Firebase 项目

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 点击 **"添加项目"**，填写项目名称，完成创建

### 2. 启用 Authentication

1. 左侧菜单 → **Authentication** → **Sign-in method**
2. 启用 **电子邮件地址/密码**（用于管理员登录）
3. 启用 **匿名**（用于受访者无感知登录）

### 3. 创建 Firestore 数据库

1. 左侧菜单 → **Firestore Database** → **创建数据库**
2. 选择 **以生产模式启动**（后续会配置安全规则）
3. 选择距离用户最近的地区

### 4. 获取 Firebase 配置

1. 项目概览 → **项目设置**（齿轮图标）→ **常规**
2. 下滑到 **"您的应用"** → 点击 **`</>`**（Web）图标注册应用
3. 复制 `firebaseConfig` 对象

### 5. 填写配置文件

打开 `js/firebase-config.js`，将 `firebaseConfig` 替换为你的配置：

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
}
```

---

## Firestore 安全规则

前往 **Firestore Database → 规则**，粘贴以下内容并发布：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 问卷：只有创建者可读写
    match /questionnaires/{docId} {
      allow read, write: if request.auth != null
                         && !request.auth.token.firebase.sign_in_provider.matches('anonymous')
                         && (resource == null || resource.data._adminUid == request.auth.uid);
      allow create: if request.auth != null
                    && !request.auth.token.firebase.sign_in_provider.matches('anonymous')
                    && request.resource.data._adminUid == request.auth.uid;
    }

    // 分享 token：管理员可完全管理；受访者可认领（首次绑定自己的UID）和读取自己的
    match /share_tokens/{tokenId} {
      allow read: if request.auth != null && (
        // 管理员读取属于自己问卷的 token（需配合 questionnaires 验证，这里简化为已登录非匿名）
        !request.auth.token.firebase.sign_in_provider.matches('anonymous') ||
        // 受访者读取属于自己的 token
        resource.data.respondentUid == request.auth.uid
      );
      allow write: if request.auth != null &&
        !request.auth.token.firebase.sign_in_provider.matches('anonymous');
      // 受访者认领（只允许写入自己的 UID，且当前 respondentUid 为 null）
      allow update: if request.auth != null
                    && request.auth.token.firebase.sign_in_provider == 'anonymous'
                    && resource.data.respondentUid == null
                    && request.resource.data.respondentUid == request.auth.uid;
      // 受访者更新提交状态（已认领自己的 token）
      allow update: if request.auth != null
                    && request.auth.token.firebase.sign_in_provider == 'anonymous'
                    && resource.data.respondentUid == request.auth.uid;
    }

    // 答案：受访者可提交和读取自己的；管理员可读取和删除
    match /answers/{answerId} {
      allow create: if request.auth != null
                    && request.auth.token.firebase.sign_in_provider == 'anonymous'
                    && request.resource.data.respondentUid == request.auth.uid;
      allow read: if request.auth != null && (
        resource.data.respondentUid == request.auth.uid ||
        !request.auth.token.firebase.sign_in_provider.matches('anonymous')
      );
      allow delete: if request.auth != null
                    && !request.auth.token.firebase.sign_in_provider.matches('anonymous');
    }
  }
}
```

> **注意**：以上规则为简化版。生产环境建议进一步收紧：验证 `_adminUid` 与当前 uid 匹配、限制字段写入内容等。

---

## Firestore 索引

系统使用以下复合查询，需要创建对应索引（首次运行时浏览器控制台会提示缺少索引并给出创建链接，点击链接即可自动创建）：

| 集合 | 字段1 | 字段2 | 排序 |
|------|-------|-------|------|
| `questionnaires` | `_adminUid` ASC | `createdAt` DESC | — |
| `share_tokens` | `questionnaireId` ASC | `createdAt` DESC | — |
| `share_tokens` | `token` ASC | — | — |
| `answers` | `shareTokenId` ASC | — | — |

也可前往 **Firestore Database → 索引 → 复合索引 → 添加索引** 手动创建。

---

## 本地运行

由于使用了 ES Modules，直接双击打开 HTML 文件会因 CORS 报错。需要通过本地 HTTP 服务器访问：

**方式一：VS Code Live Server 插件**
安装 [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)，右键 `index.html` → Open with Live Server

**方式二：Python**
```bash
cd survey-web
python -m http.server 8080
# 浏览器打开 http://localhost:8080/login.html
```

**方式三：Node.js**
```bash
cd survey-web
npx serve .
```

---

## 部署

任何静态文件托管服务均可，推荐：

**Firebase Hosting（与 Firestore 同一项目）**
```bash
npm install -g firebase-tools
firebase login
firebase init hosting    # 选择 survey-web 为 public 目录
firebase deploy
```

**其他静态托管**：Netlify、Vercel、GitHub Pages 均支持直接上传/拖拽部署。

---

## 使用流程

### 管理员

1. 打开 `login.html` → 注册账号（第一次使用）或登录
2. 点击 **新建问卷** → 填写名称、说明、添加题目 → 保存
3. 回到问卷列表 → 点击 **分享管理**
4. 点击 **＋ 新增分享** → 填写备注名（如"张三"）→ 生成链接
5. 复制链接发给对方
6. 对方提交后，状态变为 **已提交**，点击 **查看答案** 即可查看

### 受访者

1. 打开收到的链接
2. 填写所有题目 → 点击 **提交问卷**
3. 提交后跳转到"我的回答"页面，可随时重新打开链接查看（只读）

---

## 常见问题

**Q：链接可以转发给别人填吗？**  
A：不可以。链接首次被打开时，系统会将该浏览器的匿名身份绑定到链接。其他人打开同一链接会看到"链接不属于您"的提示。

**Q：我修改了问卷题目，已提交的答案会受影响吗？**  
A：不会。提交时系统会保存一份问卷快照（`questionSnapshot`），历史答卷始终使用快照渲染，不受后续修改影响。

**Q：受访者需要注册账号吗？**  
A：不需要。系统使用 Firebase 匿名登录，打开链接时自动完成，对用户完全透明。匿名身份存储在浏览器本地，清除浏览器数据后会丢失（但已提交的答案数据保留在服务器）。

**Q：管理员删除答案后，受访者可以重新填写吗？**  
A：可以。删除答案会将链接状态重置为"已打开"，受访者再次打开链接可以重新填写并提交。

---

## 数据结构参考

```
questionnaires/{id}
  _adminUid: string
  name: string
  description: string
  questions: Question[]
  createdAt: Timestamp
  updatedAt: Timestamp

share_tokens/{id}
  questionnaireId: string
  token: string          // URL 中使用的随机字符串
  nickname: string       // 管理员备注名
  respondentUid: string | null
  status: 'pending' | 'opened' | 'submitted'
  createdAt: Timestamp
  usedAt: Timestamp | null
  submittedAt: Timestamp | null

answers/{id}
  shareTokenId: string
  questionnaireId: string
  respondentUid: string
  submittedAt: Timestamp
  questionSnapshot: Question[]   // 提交时的问卷快照
  responses: Response[]

// Question 结构
{
  id: string,
  type: 'single_choice' | 'multiple_choice' | 'matrix_single' | 'text_fill',
  title: string,
  options?: string[],      // 单选/多选
  rows?: string[],         // 矩阵行
  columns?: string[],      // 矩阵列
}

// Response 结构
{
  questionId: string,
  type: string,
  value: string | string[] | Record<string, string> | null
}
```
