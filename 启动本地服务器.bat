@echo off
echo 正在启动本地服务器...
echo 启动后请用浏览器打开: http://localhost:8080/admin.html
echo 关闭此窗口即可停止服务器
echo.
python -m http.server 8080 2>nul || python3 -m http.server 8080 2>nul || (
  echo Python 未找到，尝试 Node.js...
  npx serve . -p 8080 -s 2>nul || (
    echo.
    echo 请安装 Python 或 Node.js 后重试。
    echo 或者直接用 VS Code 的 Live Server 插件打开 admin.html
    pause
  )
)
