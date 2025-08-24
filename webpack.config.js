const path = require("path");
const isProd = process.env.NODE_ENV === "production";

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
  devServer: !isProd
    ? {
        static: { directory: path.join(__dirname, "./") },
        compress: true,
        port: 8080,
        hot: false,
        liveReload: true,
        open: true,
        watchFiles: ["src/**/*.ts", "src/**/*.wgsl", "index.html"],
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    : undefined,

  // 開発モードの設定
  mode: isProd ? "production" : "development",
  devtool: isProd ? "source-map" : "eval-source-map",

  // ファイル監視の設定
  watch: !isProd && true,
  watchOptions: { ignored: /node_modules/, poll: 1000 },
};
