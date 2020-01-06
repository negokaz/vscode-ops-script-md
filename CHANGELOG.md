# Change Log

OpsScriptMD の注目すべき変更はこのファイルで文書化されます。

このファイルの書き方に関する推奨事項については、[Keep a Changelog](http://keepachangelog.com/) を確認してください。

## [リリース予定]

## [0.4.2] - 2020-01-06

### 機能修正
- スクリプトのボタンを押したときに他のボタンが揺れる問題を修正

## [0.4.1] - 2020-01-03

※ ドキュメントのみ更新

- アイコンを追加

## [0.4.0] - 2020-01-01

### 機能追加
- スクリプトをクリップボードにコピーするボタンを追加
- コンテキストメニューやタブバーから OpsView を起動できるようにした

### 機能変更
- エンコーディング自動検出の精度が良くないため、明示的に指定できるように変更

## [0.3.0] - 2019-06-09

### 機能追加
- OpsView に画像を表示できるように変更
- OpsView に Info/Warning/Danger を表示できるように変更

### 機能修正
- 1行が長いログが出力される際に word-wrap がかかっていたのを無効化し、よりログを読みやすく

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

[リリース予定]: https://github.com/negokaz/vscode-ops-script-md/compare/v0.4.2...HEAD
[0.4.2]: https://github.com/negokaz/vscode-ops-script-md/releases/tag/v0.4.2
[0.4.1]: https://github.com/negokaz/vscode-ops-script-md/releases/tag/v0.4.1
[0.4.0]: https://github.com/negokaz/vscode-ops-script-md/releases/tag/v0.4.0
[0.3.0]: https://github.com/negokaz/vscode-ops-script-md/releases/tag/v0.3.0
[0.2.2]: https://github.com/negokaz/vscode-ops-script-md/releases/tag/v0.2.2
[0.2.1]: https://github.com/negokaz/vscode-ops-script-md/releases/tag/v0.2.1
[0.2.0]: https://github.com/negokaz/vscode-ops-script-md/releases/tag/v0.2.0
[0.1.1]: https://github.com/negokaz/vscode-ops-script-md/releases/tag/v0.1.1
