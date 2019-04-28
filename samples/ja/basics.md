# 基本的な使い方

## 実行可能なスクリプト

`cmd` に実行可能なプログラムのパスを指定すると Ops View から実行できるスクリプトになります。

引数はプログラムのパスに続いて指定できます。

```bash {cmd: ["/bin/bash", "-o", "errexit", "-c"]}
ping 127.0.0.1
```

## 単なるコードスニペット

`cmd` の指定がない場合は単なるコードスニペットとして表示され実行できません。

```bash
echo 'このコードは実行できません...'
```

## 値の埋め込み

任意の箇所に値を埋め込むことができます。
`opsscript.yml` ファイルをワークスペースのルートに作成し、`variables:` を定義してください。

**例）`opsscript.yml`**
```yaml
variables:
    hosts:
        web-server: 127.0.0.1
```

上記のように定義するとドキュメント中の `{{hosts.web-server}}` が `127.0.0.1` に置換されます。

```bash {cmd: ["/bin/bash", "-o", "errexit", "-c"]}
ping {{hosts.web-server}}
```

設定にデフォルト値を設け、環境ごとに設定を差し替えたい場合は `opsscript.yml` に加え、`opsscript-*.yml` ファイルを作成してください。

`*` の部分には任意の名前をつけることができます。

例えば、ステージング環境用に `opsscript-staging.yml` を作成してみます。

**例）`opsscript-staging.yml`**
```yaml
variables:
    hosts:
        web-server: 192.168.1.1
```

`opsscript-staging.yml` の設定値によって `opsscript.yml` の設定値が上書きされます。

つまり、`opsscript.yml` の設定値をデフォルト値として、ステージング環境特有の設定値を `opsscript-staging.yml` に宣言できます。