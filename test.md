gulpのコマンドを確認するために、gulpfile.jsの内容を確認させていただきます。


Read file: gulpfile.js
gulpfile.jsから、以下のコマンドが利用可能であることがわかります：

1. メインコマンド：

- `gulp preview` - プレビューサイトを生成してサーバーを起動
- `gulp bundle` - UIをクリーン、リント、ビルド、バンドルして公開用に準備
- `gulp build` - UIアセットをビルドしてステージング
- `gulp clean` - ビルドで生成されたファイルとフォルダをクリーン

2. リント関連：

- `gulp lint` - CSSとJavaScriptのソースファイルをリント
- `gulp lint:css` - CSSソースファイルをstylelintでリント
- `gulp lint:js` - JavaScriptソースファイルをeslintでリント

3. フォーマット：

- `gulp format` - JavaScriptソースファイルをprettifyでフォーマット

4. バンドル関連：

- `gulp bundle:build` - バンドル用のUIアセットをビルド
- `gulp bundle:pack` - ステージングされたUIアセットのバンドルを作成

5. プレビュー関連：

- `gulp preview:build` - UIアセットを処理してステージングし、プレビュー用のページを生成
- `gulp preview:build-pages` - プレビュー用のページをビルド

6. 非推奨コマンド：

- `gulp pack` - 非推奨（代わりに`bundle`を使用）

これらのコマンドは、開発やビルドの異なる段階で使用できます。例えば：

- 開発時は `gulp preview` を使用してローカルでプレビュー
- リリース時は `gulp bundle` を使用して本番用のバンドルを作成
- コードの品質チェックには `gulp lint` を使用
