# GitHub Actions Workflow Management

現在、GitHub Actionsで2つのワークフローが実行されています：

1. **Continuous Integration & Deployment** (ci.yml)
2. **Improved CI/CD Pipeline** (improved-cicd.yml)

推奨される対応：
- improved-cicd.yml が最新で最も包括的なワークフロー
- ci.yml を無効化または削除する

GitHubのWebインターフェースで以下を確認してください：
- https://github.com/dev-mmiy/circles0/actions
- ワークフローファイルの内容を確認
- 不要なワークフローを無効化

または、以下のコマンドでローカルから対応：
- git checkout main
- ワークフローファイルを確認・編集
- 変更をコミット・プッシュ

