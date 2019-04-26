/* webpack.main.additions.js */
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const isProd = process.env.NODE_ENV === 'production';
module.exports = {
  plugins: []
}

if (isProd) {
  module.exports.plugins.push(
    new BundleAnalyzerPlugin({
      analyzerMode: 'static'
    })
  )
}
