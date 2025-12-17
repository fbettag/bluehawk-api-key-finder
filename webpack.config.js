const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    // Multiple entry points for different extension contexts
    entry: {
      // Main content script - injected into web pages
      content: './src/content/index.js',

      // Background service worker
      background: './src/background/index.js',

      // Popup UI
      popup: './src/popup/index.js',

      // Settings page
      settings: './src/settings/index.js',

      // History page
      history: './src/history/index.js',

      // Web Workers (separate bundles)
      'workers/scanner-worker': './src/workers/scanner-worker.js',
      'workers/ast-worker': './src/workers/ast-worker.js',

      // Main world injection scripts (run in page context)
      'injected/network-hooks': './src/injection/network-hooks.js',
      'injected/react-inspector': './src/injection/react-inspector.js',
      'injected/redux-inspector': './src/injection/redux-inspector.js',

      // Standalone modules that may be dynamically loaded
      validator: './src/validator/index.js',
      'deep-crawler': './src/crawler/deep-crawler.js',
      'bucket-takeover-detector': './src/detector/bucket-takeover-detector.js',
    },

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true,
    },

    // Optimize for browser extension environment
    target: 'web',

    // Source maps for development
    devtool: isProduction ? false : 'cheap-module-source-map',

    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: isProduction,
              drop_debugger: isProduction,
            },
            format: {
              comments: false,
            },
          },
          extractComments: false,
        }),
      ],

      // Code splitting configuration
      splitChunks: {
        chunks: 'async',
        cacheGroups: {
          // Split TensorFlow.js into separate lazy-loaded chunk
          tensorflow: {
            test: /[\\/]node_modules[\\/]@tensorflow/,
            name: 'vendors/tensorflow',
            chunks: 'async',
            priority: 20,
          },

          // Split Babel parser into separate chunk for AST worker
          babel: {
            test: /[\\/]node_modules[\\/]@babel/,
            name: 'vendors/babel',
            chunks: 'async',
            priority: 15,
          },

          // Split WASM parser
          wasm: {
            test: /[\\/]node_modules[\\/]@webassemblyjs/,
            name: 'vendors/wasm-parser',
            chunks: 'async',
            priority: 15,
          },

          // Split source-map library
          sourcemap: {
            test: /[\\/]node_modules[\\/]source-map/,
            name: 'vendors/source-map',
            chunks: 'async',
            priority: 15,
          },

          // Common shared code between entry points
          shared: {
            test: /[\\/]src[\\/]shared[\\/]/,
            name: 'shared',
            chunks: 'all',
            minChunks: 2,
            priority: 10,
          },

          // Analysis modules shared between workers
          analysis: {
            test: /[\\/]src[\\/]analysis[\\/]/,
            name: 'analysis',
            chunks: 'all',
            minChunks: 2,
            priority: 10,
          },
        },
      },
    },

    resolve: {
      extensions: ['.js', '.json'],
      alias: {
        '@shared': path.resolve(__dirname, 'src/shared'),
        '@analysis': path.resolve(__dirname, 'src/analysis'),
        '@core': path.resolve(__dirname, 'src/core'),
        '@workers': path.resolve(__dirname, 'src/workers'),
        '@injection': path.resolve(__dirname, 'src/injection'),
        '@ml': path.resolve(__dirname, 'src/ml'),
      },
    },

    plugins: [
      new CopyPlugin({
        patterns: [
          // Copy manifest.json
          {
            from: 'manifest.json',
            to: 'manifest.json',
            transform(content) {
              // Optionally transform manifest for production
              const manifest = JSON.parse(content);
              if (isProduction) {
                // Remove any development-only permissions
              }
              return JSON.stringify(manifest, null, 2);
            },
          },

          // Copy root background.js (full implementation)
          { from: 'background.js', to: 'background.js', force: true },

          // Copy HTML files
          { from: 'src/popup/popup.html', to: 'popup.html' },
          { from: 'src/settings/settings.html', to: 'settings.html' },
          { from: 'src/history/history.html', to: 'history.html' },

          // Copy CSS files
          { from: 'popup.css', to: 'base.css' }, // Global CSS variables
          { from: 'src/popup/popup.css', to: 'popup.css' },
          { from: 'src/settings/settings.css', to: 'settings.css', noErrorOnMissing: true },
          { from: 'src/history/history.css', to: 'history.css', noErrorOnMissing: true },

          // Copy icons (including red variants for auto mode)
          { from: 'icons/*.png', to: 'icons/[name][ext]' },

          // Copy data files (N-gram models, etc.)
          { from: 'src/data', to: 'data', noErrorOnMissing: true },

          // Copy ML model files (if present)
          { from: 'src/model', to: 'model', noErrorOnMissing: true },
        ],
      }),
    ],

    // Performance hints
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 512000, // 500KB
      maxAssetSize: 512000,
    },

    // Stats output
    stats: {
      colors: true,
      modules: false,
      children: false,
      chunks: false,
      chunkModules: false,
    },
  };
};
