# Change Log

OpsScriptMD の注目すべき変更はこのファイルで文書化されます。

このファイルの書き方に関する推奨事項については、[Keep a Changelog](http://keepachangelog.com/) を確認してください。

## [リリース予定]

### 機能追加
- OpsView に画像を表示できるように変更
- OpsView に Info/Warning/Danger を表示できるように変更

## [0.2.2] - 2019-05-07

### 機能修正
- `opsscript.md` ファイルがワークスペースにない場合に OpsView が開けない問題を修正

## [0.2.1] - 2019-05-07

ビルドエラーにより OpsView を開けなくなっていたため、再リリース

## [0.2.0] - 2019-05-06

### 機能追加
- 標準入力からのスクリプトの読み込み
- `.md` ファイルがあるディレクトリをワーキングディレクトリとしてスクリプトを実行する
- ドキュメントが更新されたときにユーザーにリロードを提案する

### 機能修正
- スクリプトを再実行した際にファイルに出力されたログの属性が消える問題を修正
- OpsView が非アクティブになっている間のログが出力されない問題を修正

## [0.1.1] - 2019-4-22

- 初回リリース🚀

[リリース予定]: https://github.com/negokaz/vscode-ops-script-md/compare/v0.2.2...HEAD
[0.2.2]: https://github.com/negokaz/vscode-ops-script-md/releases/tag/v0.2.2
[0.2.1]: https://github.com/negokaz/vscode-ops-script-md/releases/tag/v0.2.1
[0.2.0]: https://github.com/negokaz/vscode-ops-script-md/releases/tag/v0.2.0
[0.1.1]: https://github.com/negokaz/vscode-ops-script-md/releases/tag/v0.1.1
