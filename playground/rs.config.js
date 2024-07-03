const path = require('path');

const compile = async () => {
  return {
    mode: "production",
    entry: './public/worker.mjs',
    output: {
      path: path.join(__dirname, "./public/"),
      filename: 'worker.js',
      publicPath: "./public/",
    },
    resolve: {
      modules: ["node_modules"],
    },
  };
};

module.exports = async () => {
  return await compile();
};
