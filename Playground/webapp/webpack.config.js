var webpack = require('webpack');
var path = require('path');
var LiveReloadPlugin = require('webpack-livereload-plugin');
var TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin')
var prod = process.env.NODE_ENV === 'production';
console.log(path.resolve(__dirname, 'node_modules'));
var config = {
    entry: {
        webapp: './src/index.tsx'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js'
    },
    mode: prod ? "production" : "development",
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/,
                exclude: /node_modules/,
                use: 'awesome-typescript-loader'
            },
            {
                test:/\.css$/,
                use:['style-loader','css-loader']
            }
        ]
    },
    devtool: prod ? false : "source-map",
    resolve: {
        modules: [path.resolve(__dirname, 'node_modules')],
        plugins: [
            new TsconfigPathsPlugin({ configFile: "./tsconfig.json", logLevel: 'info' })],
        extensions: ['.ts', '.tsx', '.js', '.json'],
        alias: {
            'src': path.resolve(__dirname, 'src')
        }
    },
    plugins: [
        new LiveReloadPlugin({appendScriptTag: !prod}),
        new HtmlWebpackPlugin()
    ]
};
module.exports = config;
