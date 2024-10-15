const path = require('path');

module.exports = {
    entry: './src/logger.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'logease.bundle.js',
        library: 'LogEase',
        libraryTarget: 'umd',
        libraryExport: 'default'
    },
    mode: 'production',
};
