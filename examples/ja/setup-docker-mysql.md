# Docker の MySQL をセットアップするサンプル

## MySQL のコンテナを作成

```bash {cmd: ["bash", "-o", "errexit", "-c"]}
docker run -d --name={{mysql.container_name}} -e MYSQL_ROOT_PASSWORD={{mysql.root_password}} mysql

# MySQLが起動するまで待つ
until docker exec {{mysql.container_name}} mysql -uroot -p{{mysql.root_password}} -e 'select 1'
do
    sleep 5
done
```

## テーブルを作成

:::danger
既に `shop` データベースがある場合は DROP されます。 
:::

```sql {stdin: true, cmd: ["docker", "exec", "-i", "{{mysql.container_name}}", "mysql", "-uroot", "-p{{mysql.root_password}}", "--table"]}
DROP DATABASE IF EXISTS shop;
CREATE DATABASE shop;
USE shop;

CREATE TABLE product (
    id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    product_name VARCHAR(50),
    price INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DESCRIBE product;
```

## データの追加

```sql {stdin: true, cmd: ["docker", "exec", "-i", "{{mysql.container_name}}", "mysql", "-uroot", "-p{{mysql.root_password}}", "--table"]}
USE shop;

INSERT INTO product (product_name, price) VALUES 
    ('今までなかった抹茶', 1200),
    ('プレミアム紅茶', 1130),
    ('フレッシュ牛乳', 1340),
    ('極旨塩', 540),
    ('純正コーヒー牛乳', 1550),
    ('みんなのジャム', 1290),
    ('徳用マーガリン', 740),
    ('デリシャスチーズ', 870),
    ('高級ウーロン茶', 1320),
    ('大自然がくれたチョコレート', 1520),
    ('健やかお茶', 1730),
    ('天然コーヒー', 700),
    ('エクストラ緑茶', 610),
    ('極上バター', 1110),
    ('料理用ミネラルウォーター', 430),
    ('ヘルシーガーリック', 490),
    ('健康豆乳', 830),
    ('奇跡の粉チーズ', 520),
    ('からだにやさしいスライスチーズ', 1720),
    ('からだよろこぶオリーブオイル', 370),
    ('最高級お酢', 1260);

SELECT * FROM product;
```

## MySQL のコンテナを削除

```bash {cmd: ["bash", "-o", "errexit", "-c"]}
docker rm --force --volumes {{mysql.container_name}}
```
