const esbuild = require('esbuild');
const copyStaticFiles = require('esbuild-copy-static-files');

const buildOptions = {
  entryPoints: ['src/index.js', 'src/exchange.js'],
  bundle: true,
  minify: true,
  outdir: 'dist/',
  plugins: [
    copyStaticFiles({
      src: 'src/index.html',
      dest: 'dist/index.html',
    }),
    copyStaticFiles({
      src: 'src/exchange.html',
      dest: 'dist/exchange.html',
    }),
    copyStaticFiles({
      src: 'src/test.html',
      dest: 'dist/test.html',
    }),
    copyStaticFiles({
      src: 'assets',
      dest: 'dist/assets',
    }),
  ],
};

esbuild.build(buildOptions).catch(() => process.exit(1));
