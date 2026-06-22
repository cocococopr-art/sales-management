# 医療連携体制加算 営業管理システム

## セットアップ手順

### 1. このリポジトリをGitHubにプッシュ

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/あなたのID/sales-management.git
git push -u origin main
```

### 2. GitHub Pages を有効化

Settings → Pages → Source: **GitHub Actions** を選択

### 3. Google Sheets API キーを取得

1. https://console.cloud.google.com/ → プロジェクト作成
2. 「Google Sheets API」を検索して有効化
3. 認証情報 → APIキーを作成
4. スプレッドシートを「リンクを知っている人が閲覧可能」に設定

### 4. GitHub Secrets に登録

Settings → Secrets and variables → Actions → New repository secret

| Name | Value |
|------|-------|
| `VITE_SHEET_ID` | スプレッドシートのURL中のID |
| `VITE_SHEETS_API_KEY` | 取得したAPIキー |
| `VITE_GAS_URL` | GASデプロイURL（書き込み用） |

### 5. Google Apps Script（書き込み用）

`GAS_SCRIPT.js` の内容を https://script.google.com/ に貼り付けてデプロイ。

### 6. スプレッドシートのシート名

| シート名 | 用途 |
|---------|------|
| 児童発達支援 | 施設マスタ（元のExcelから移行） |
| 放課後等デイサービス | 施設マスタ |
| 営業記録 | GASが自動作成・追記 |

---

mainブランチにpushするたびに自動でデプロイされます。
