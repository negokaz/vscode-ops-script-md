<style>
    img.intext {
        height: 1.3rem;
        vertical-align: text-bottom;
    }
    small {
        opacity: 0.6
    }
</style>

# 基本的な使用方法

チュートリアル形式で OpsScriptMD の基本的な使用方法を解説します。

## 手順書の記法

手順書は Markdown 記法で記述します。

利用できる記法の詳細については [こちら](markdown-syntax.md) を参照してください。

## スクリプトを実行可能にする <small>1/7</small>

Markdown のコードブロックで下記のように**スクリプトオプション**を指定すると、スクリプトを実行できるようになります。

```
{cmd: ["bash", "-c"]}
```

`cmd` にはスクリプトを解釈し、実行できる**インタプリタ**を指定します。スクリプトは `cmd` で指定されたインタプリタの最後の引数として扱われます。

例えば、下記のように記述した場合、`bash -c 'echo "Hello, World!"'` と実質同じものが実行されます。

<pre>
```bash {cmd: ["bash", "-c"]}
echo "Hello, world!"
```
</pre>

### 実際に試してみよう

本項のスクリプトにはスクリプトオプションが設定されており、OpsView で実行できるようになっています。

実際に OpsView を開いて実行してみましょう。OpsView の開き方は [こちら](../../README.md) を参照してください。

<img class="intext" src="../images/trigger-exec.png"> を押下するとスクリプトが実行されます。

```bash {cmd: ["bash", "-c"]}
echo "Hello, world!"
```

スクリプトを実行すると、スクリプトの下部に実行結果が表示されます。<img class="intext" src="../images/exit-code-success.png"> はスクリプトが終了ステータス `0` で成功したことを示します。

下記は失敗するスクリプトの例です。
<img class="intext" src="../images/trigger-exec.png"> を押下して実行してみましょう。

```bash {cmd: ["bash", "-c"]}
ls 存在しないファイル.txt
```

<img class="intext" src="../images/exit-code-failure.png"> は終了ステータス `1` でスクリプトが失敗したことを示します。

一般的に CUI では終了ステータスが `0` の場合は成功、それ以外の数値の場合は失敗を表すことから OpsView ではこのように結果が表現されます。

## スクリプトをコピーする <small>2/7</small>

OpsView ではスクリプトの右上部にある <img class="intext" src="../images/trigger-copy.png"> をクリックすると、スクリプト全体をクリップボードにコピーできます。

下記のようにスクリプトオプションが設定されておらず、OpsView から実行できないスクリプトであってもコピーはできます。

```bash
echo 'このコードは実行できませんが、コピーはできます'
```

## 標準入力からスクリプトを渡す <small>3/7</small>

プログラムによっては標準入力からスクリプトを渡すことでスクリプトを実行できます。

例えば、`bash` や `perl`、MySQL のコマンドラインクライアント `mysql` など、多くのプログラムが標準入力からのスクリプトの入力をサポートしています。

スクリプトオプションに `stdin: true` を設定すると、スクリプトは標準入力から `cmd` で指定されたプログラムへ渡されます。

例えば、下記のように記述した場合、`echo 'echo "Hello, world!"' | bash` と実質同じものが実行されます。

<pre>
```bash {cmd: ["bash"], stdin: true}
echo "Hello, world!"
```
</pre>

### 実際に試してみよう

`stdin: true` を指定すると、スクリプトが標準入力から `bash` へ入力されるため、他の例では必ず指定されていた、引数からスクリプトを渡すための `-c` オプションが不要になります。

以下のスクリプトを実行すると `bash` の `-c` オプションを指定していない状態で、スクリプトの実行が成功することがわかります。

```bash {cmd: ["bash"], stdin: true}
# このスクリプトは標準入力から bash に渡されます
# echo ばかりだとつまらないので、少し動きのあるスクリプトを…
seq 1 10 | while read i
do
    echo ${i}
    sleep 1
done
```

## 文字エンコーディングを指定する <small>4/7</small>

`cmd` で指定されたインタプリタへ入出力されるデータはデフォルトで **UTF-8** にエンコーディングされます。
文字化けする場合など、必要に応じて下記のようにスクリプトオプションに `encoding: <charset>` を指定すると、入出力の文字コードを変更できます。

<pre>
```bash {cmd: ["bash", "-c"], encoding: shift-jis }
cat ../resources/sjis.txt
```
</pre>

### 実際に試してみよう

[../resources/sjis.txt](../resources/sjis.txt) は SHIFT_JIS で保存されたテキストファイルです。

下記のスクリプトはそれぞれ、スクリプトオプションに `encoding` を指定していないものと、`encoding: shift-jis` を指定したものです。

無指定のスクリプトの出力は文字コードが不一致なため文字化けします。一方で `encoding` が指定されたスクリプトの出力は文字コードが一致するため文字化けしないことが確認できます。

**`encoding` 無指定（UTF-8）**

```bash {cmd: ["bash", "-c"] }
cat ../resources/sjis.txt
```

**`encoding: shift-jis`**

```bash {cmd: ["bash", "-c"], encoding: shift-jis }
cat ../resources/sjis.txt
```

## 変数の埋め込み <small>5/7</small>

変数を使うと手順書の一部を設定ファイルから変更できるようになります。

環境ごとに異なる部分を差し替えられるようにしたり、具体的な値を抽象化しておき、環境の構成変更に簡単に対応できるようにしておきたい場合に便利です。

`opsscript.yml` という名前のファイルを、手順書と同じディレクトリか、より上位のディレクトリに作成し、下記のように `variables` を定義します。

**例）`opsscript.yml`**
```yaml
variables:
    hosts:
        db_server: 192.168.0.1
        ap_server: 192.168.0.2
```

上記のように定義すると、手順書で `{{hosts.db_server}}` と記述された部分に `192.168.0.1` が埋め込まれます。

### 実際に試してみよう

下記のスクリプトに記述された `ping` コマンドの引数には変数 `hosts.my_host` が指定されています。OpsView で表示すると変数部分には [opsscript.yml] で定義された値が埋め込まれます。

```bash {cmd: ["bash", "-c"]}
ping {{hosts.my_host}}
```

## 環境変数の設定 <small>6/7</small>

OpsView で実行されるスクリプトに任意の環境変数を設定できます。

手順書で独自のコマンドを使うために `PATH` を設定したりするのに便利です。

環境変数を設定するには `opsscript.yml` ファイルで下記のように `environment` を定義します。

**例）`opsscript.yml`**

```yaml
environment:
    PATH: /bin:/usr/bin
    LANG: C
```

### 実際に試してみよう

下記は環境変数 `MY_ENV` を表示するスクリプトです。

スクリプトを実行すると [opsscript.yml] で設定された `MY_ENV` の内容が表示されることを確認できます。

```bash {cmd: ["bash", "-c"] }
echo "MY_ENV: ${MY_ENV}"
```

## 設定の部分差し替え <small>7/7</small>

複数の環境で同じ手順書を使い回す場合は、変数などを部分的に差し替えたくなることがあります。

`opsscript.yml` の設定を継承し、一部を差し替えたい場合は `opsscript.yml` と同じディレクトリに `opsscript-*.yml` という形式で名前をつけたファイルを作成してください。

`*` の部分には任意の名前をつけることができます。

例えば、下記のような 2 つの設定ファイルがあるとします。

**例）`opsscript.yml`**
```yaml
variables:
    hosts:
        db_server: 192.168.0.1
        ap_server: 192.168.0.2
```

**例）`opsscript-example.yml`**
```yaml
variables:
    hosts:
        ap_server: 192.168.1.1
```

`{{hosts.db_server}}` の部分には `opsscript.yml` で定義された `192.168.0.1` が埋め込まれ、`{{hosts.ap_server}}` の部分には `opsscript-example.yml` で宣言された `192.168.1.1` が埋め込まれます。

配置できる `opsscript-*.yml` ファイルは1つだけです。複数ある場合は追加の設定ファイルが読み込まれず `opsscript.yml` の設定のみが有効になります。

### 実際に試してみよう

`opsscript-example.yml` など、適当な名前をつけたファイルを [opsscript.yml] と同じディレクトリに作成してください。

OpsView を既に開いている場合は `opsscript-example.yml` を読み込むため、一旦閉じて開き直してください。

`opsscript-example.yml` に何も記述していない場合、下記のスクリプトは `127.0.0.1` に向けた `ping` になっているはずです。

`echo` の引数には [opsscript.yml] で定義された `message` という変数を指定しています。

```bash {cmd: ["bash", "-c"]}
echo '{{message}}'
ping {{hosts.my_host}}
```

`opsscript-example.yml` へ下記のように記述すると、上記のスクリプトは `127.100.100.100` に向けた `ping` へと変更されるはずです。

```yaml
variables:
    hosts:
        my_host: 127.100.100.100
```

一方で、`echo` の引数は変更されません。
依然として [opsscript.yml] の設定も有効であり、`opsscript-example.yml` では `message` 変数は定義されていないからです。


[opsscript.yml]: ../opsscript.yml
