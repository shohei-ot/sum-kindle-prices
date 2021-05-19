sum-kindle-prices
=====================

Amazon.co.jp の電子書籍販売ページの URL を 1 つ以上渡して総額を計算します。  
カートが存在せず、合計金額が画面上に表示されないので作りました。

## ビルド

```sh
npm run build
```

## 使い方

```sh
sum-kindle-prices 'https://www.amazon.co.jp/...,https://www.amazon.co.jp/...,https://www.amazon.co.jp/...'
```

### --help

```
Usage: sum-kindle-prices [options] <urlList>

Kindle ストアページの URL を複数指定して金額を合算します。Amazonポイントは考慮しません。

Arguments:
  urlList                      comma separated url list (e.g. 'https://...,https://...,https://...')

Options:
  -V, --version                output the version number
  -s, --separator <separator>  separator char (default: ",")
  -h, --help                   display help for command
```

### -s, --separator <separator>

```sh
sum-kindle-prices -s '@' 'https://www.amazon.co.jp/...@https://www.amazon.co.jp/...@https://www.amazon.co.jp/...'
```
