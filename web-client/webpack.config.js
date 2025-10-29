const path = require('path');
module.exports = {
    // Entry point: The starting file for bundling
    entry: './index.js',
    // Output: Where the bundled file will be saved
    output: {
        filename: 'main.js', // Name of the output file
        path: path.resolve(__dirname, 'dist'), // Directory for the output
    },
    // Mode: Defines the build environment
    mode: 'production', // Options: 'development', 'production', or 'none'
};