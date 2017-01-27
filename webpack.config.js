'use strict';

const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const ClosureCompPlugin = require('webpack-closure-compiler');
const UglifyJsPlugin = require('webpack/lib/optimize/UglifyJsPlugin');
const DedupePlugin = require('webpack/lib/optimize/DedupePlugin');

const config = {
    devtool: 'source-map',
    devServer: {
        inline: true,
        colors: true,
        historyApiFallback: false,
        contentBase: './dev',
        publicPath: '/',
        port: 9000,
        proxy: {
          '/banana/**': 'http://localhost:3000/',
          '/banana': 'http://localhost:3000/',
          '/input': {
              target: 'http://localhost:9090',
              pathRewrite: { '^/input': '/' },
          },
          '/output': {
              target: 'http://localhost:9091',
              pathRewrite: { '^/output': '/' },
          },
        },
    },
    output: {
        path: './dev',
        filename: '[name].js',
        sourceMapFilename: '[name].map.js',
    },
    entry: {
        'polyfills': './src/polyfills.ts',
        'vendor': './src/vendor.ts',
        'main': './src/main.ts',
    },
    resolve: {
        extensions: ['', '.ts', '.js'],
        root: './src',
        modulesDirectories: ['node_modules'],
    },
    module: {
        loaders: [
            { test: /\.eot(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: 'file?name=fonts/[hash].[ext]' },
            { test: /\.otf$/, loader: 'file?name=fonts/[hash].[ext]' },
            { test: /\.woff2(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: 'file?name=fonts/[hash].[ext]' },
            { test: /\.woff(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: 'file?name=fonts/[hash].[ext]' },
            { test: /\.ttf(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: 'file?name=fonts/[hash].[ext]' },
            { test: /\.svg(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: 'file?name=fonts/[hash].[ext]' },
            { test: /\.scss$/, loader: ExtractTextPlugin.extract('style', 'css!sass')},
            { test: /\.css$/,  loader: ExtractTextPlugin.extract('style', 'css')},
            { test: /\b(?!index)\w+\.html$/, loader: 'url' },
            { test: /\.js$/,   loader: 'string-replace', query: { search: '@license', replace: '' }},
            { test: /\.ts$/,   loader: 'awesome-typescript' }
        ],
    },
    plugins: [
        new webpack.optimize.OccurenceOrderPlugin(true),
        new webpack.optimize.CommonsChunkPlugin({
            name: ['vendor', 'polyfills'],
            minChunks: Infinity
        }),
        new HtmlWebpackPlugin({
            template: './src/index.html',
            chunksSortMode: 'dependency',
            inject: false
        }),
        new ExtractTextPlugin('style.css', {allChunks: true}),
    ],
};


if (process.argv.includes('--closure')) {
    config.plugins.push(new ClosureCompPlugin({
        compiler: {
            language_in: 'ECMASCRIPT5',
            language_out: 'ECMASCRIPT5',
            compilation_level: 'ADVANCED',
        },
        concurrency: 4,
    }));
    config.plugins.push(new CopyWebpackPlugin([{
        from: 'node_modules/monaco-editor/min/vs',
        to: 'vs',
    }]));
} else if (process.argv.includes('--uglify')) {
    config.plugins.push(new DedupePlugin());
    config.plugins.push(new UglifyJsPlugin({
        beautify: false,
        mangle: { screw_ie8: true, keep_fnames: true },
        compress: { screw_ie8: true },
        comments: false,
    }));
    config.plugins.push(new CopyWebpackPlugin([{
        from: 'node_modules/monaco-editor/min/vs',
        to: 'vs',
    }]));
} else {
    config.plugins.push(new CopyWebpackPlugin([{
        from: 'node_modules/monaco-editor/dev/vs',
        to: 'vs',
    }]));
}

module.exports = config;
