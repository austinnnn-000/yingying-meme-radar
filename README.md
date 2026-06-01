# 嘤嘤 Meme Radar

自用链上 meme 币与新闻动态雷达。

## 本地打开

```bash
python3 server.py 4175
```

然后访问：

```text
http://127.0.0.1:4175/index.html
```

同一 Wi-Fi 下手机访问：

```text
http://你的电脑局域网IP:4175/index.html
```

## 部署到 Render

1. 把这个文件夹上传到一个 GitHub 仓库。
2. 打开 Render，创建 `Blueprint` 或 `Web Service`。
3. 选择这个仓库。
4. 如果使用 Web Service：
   - Runtime: Python
   - Build Command: 留空
   - Start Command: `python server.py`
5. 部署完成后，打开 Render 给你的 `onrender.com` 地址。

服务会自动读取云平台提供的 `PORT` 环境变量。

## 手机安装

部署完成后，用手机浏览器打开云端地址：

- iPhone：分享按钮 -> 添加到主屏幕
- Android：浏览器菜单 -> 安装应用 / 添加到主屏幕

添加后就可以像普通 App 一样从主屏幕打开。
