const path = require("path");
module.exports = {
  context: __dirname,
  entry: "./src/main.ts",
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist"),
    publicPath: "/dist/",
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
        },
      },
      {
        test: /\.wgsl$/,
        use: {
          loader: "ts-shader-loader",
        },
      },
    ],
  },

  resolve: {
    extensions: [".ts"],
  },

  // 開発サーバーの設定
  devServer: {
    static: {
      directory: path.join(__dirname, "./"),
    },
    compress: true,
    port: 8080,
    hot: false, // ホットリロードを無効にしてエラーを回避
    liveReload: true, // ライブリロードを使用
    open: true,
    watchFiles: ["src/**/*.ts", "src/**/*.wgsl", "index.html"],
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },

  // 開発モードの設定
  mode: "development",
  devtool: "eval-source-map",

  // ファイル監視の設定
  watch: true,
  watchOptions: {
    ignored: /node_modules/,
    poll: 1000, // 1秒ごとにポーリング
  },
};
