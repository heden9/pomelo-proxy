const path = require("path");
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const { CheckerPlugin } = require('awesome-typescript-loader');

module.exports = {
  mode: "production",
  entry: ["./src/start-local.ts"],
  output: {
    path: path.resolve(__dirname, "static"),
    filename: "start-local.js"
  },
  target: "node",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'awesome-typescript-loader'
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  plugins: [
    new CheckerPlugin(),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static'
    })
  ],
};
