const webpack = require("webpack");
const path = require("path");
const nodeExternals = require("webpack-node-externals");

const {
  NODE_ENV = "production", // development, production
} = process.env;

module.exports = {
  mode: NODE_ENV,
  entry: "./src/server.ts",
  output: {
    path: path.join(__dirname, "build-webpack"),
    filename: "bundle_wallet.js",
  },
  target: "node",
  context: __dirname,
  node: {
    __filename: true,
    __dirname: true,
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".json"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: ["ts-loader"],
        exclude: /node_modules/,
      },
    ],
  },
  externals: [nodeExternals()],
};
