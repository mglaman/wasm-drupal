const path = require("path");
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = [
  {
    entry: {
      main: './src/main.mjs',
      'install-worker': './src/install-worker.mjs',
      'trial-manager': './src/trial-manager.mjs',
      'drupal-cgi-worker': './src/drupal-cgi-worker.mjs',
      'service-worker': './src/service-worker.mjs',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].mjs', // Output files with the same name as the entry points
      library: {
        type: 'module'
      }
    },
    experiments: {
      outputModule: true, // Necessary for libraryTarget: 'module'
    },
    module: {
      rules: [
        {
          test: /\.m?js$/, // Handle both .js and .mjs files
          exclude: /node_modules/,
          use: { loader: "babel-loader" }
        },
      ],
    },
    resolve: {
      extensions: ['.js', '.mjs'], // Ensure .mjs is resolved
      mainFields: ['module', 'main'],
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'node_modules/*/*.so'),
            to: path.resolve(__dirname, 'dist/[name][ext]'),
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
    optimization: {
      splitChunks: {
        chunks: 'all',
        name: false, // Ensure files are not renamed during the split
      },
      minimize: false, // Disable minimization for clearer paths
    },
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
      "service-worker": "./src/service-worker.mjs",
    },
    output: {
      path: path.resolve(__dirname, "public"),
      filename: "[name].js"
    },
    target: "webworker"
  }
];
