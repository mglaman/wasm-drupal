const path = require("path");
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = [
  {
    mode: "production",
    module: {
      rules: [
        {
          test: /\.mjs$/,
          exclude: /node_modules/,
          use: { loader: "babel-loader" }
        },
      ]
    },
    entry: {
      main: './src/main.mjs',
    },
    output: {
      path: path.resolve(__dirname, "public"),
      filename: "[name].js"
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'node_modules/**/*.so'),
            to: path.resolve(__dirname, 'public/[name][ext]'),
            globOptions: {
              ignore: [
                '**/php8.2*',
                '**/php8.1*',
                '**/php8.0*',
              ],
            }
          },
          // Add more files or directories as needed
        ],
      }),
    ],
    target: "web"
  },
  {
    mode: "production",
    module: {
      rules: [
        {
          test: /\.mjs$/,
          exclude: /node_modules/,
          use: { loader: "babel-loader" }
        }
      ]
    },
    entry: {
      'install-worker': './src/install-worker.mjs',
      "service-worker": "./src/service-worker.mjs",
    },
    output: {
      path: path.resolve(__dirname, "public"),
      filename: "[name].js"
    },
    target: "webworker"
  }
];
