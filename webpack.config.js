const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const LwcWebpackPlugin = require('lwc-webpack-plugin');
const path = require('path');

const config = {
    entry: {
        fallback: './src/client/index.js',
        sfmc2slack: './src/client/sfmc2slack.js'
    },
    mode: 'production',
    output: {
        path: path.resolve('dist'),
        filename: './[name].js'
    },
    plugins: [
        new CleanWebpackPlugin(),
        new LwcWebpackPlugin({
            modules: [
                { dir: 'src/client/modules' },
                { npm: 'lightning-base-components' }
            ]
        }),
        new HtmlWebpackPlugin({
            template: 'src/client/index.html',
            filename: './index.html',
            title: 'fallback',
            chunks: ['fallback']
        }),
        new HtmlWebpackPlugin({
            template: 'src/client/index.html',
            filename: './sfmc2slack/app.html',
            title: 'sfmc2slack',
            chunks: ['sfmc2slack']
        }),
        new CopyPlugin({
            patterns: [
                {
                    from: 'src/client/assets',
                    to: 'assets/'
                },
                {
                    from: 'node_modules/@salesforce-ux/design-system/assets/images',
                    to: 'assets/images'
                },
                {
                    from: 'node_modules/@salesforce-ux/design-system/assets/icons',
                    to: 'assets/icons'
                },
                {
                    from: 'node_modules/@salesforce-ux/design-system/assets/styles/salesforce-lightning-design-system.min.css',
                    to: 'assets/styles/salesforce-lightning-design-system.min.css'
                }
            ]
        })
    ],
    stats: { assets: false }
};

// development only
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
    config.mode = 'development';
    config.devtool = 'source-map';
    config.watchOptions = {
        ignored: /node_modules/,
        aggregateTimeout: 5000
    };
}

module.exports = config;
