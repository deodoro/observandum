const esbuild = require('esbuild');
const liveServer = require('live-server');
const chokidar = require('chokidar');
const copyStaticFiles = require('esbuild-copy-static-files');

const buildOptions = {
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'dist/bundle.js',
  sourcemap: true,
  plugins: [
    copyStaticFiles({
      src: 'src/index.html',
      dest: 'dist/index.html',
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

async function startBuild() {
  const context = await esbuild.context(buildOptions);

  await context.watch();

  liveServer.start({
    root: 'dist',
    open: true,
    file: 'index.html',
    wait: 500,
  });

  chokidar.watch('src/index.html').on('change', () => {
    esbuild.build(buildOptions).then(() => {
      console.log('Rebuilt due to index.html change');
    }).catch(() => process.exit(1));
  });
  chokidar.watch('src/test.html').on('change', () => {
    esbuild.build(buildOptions).then(() => {
      console.log('Rebuilt due to test.html change');
    }).catch(() => process.exit(1));
  });
}

startBuild().catch(() => process.exit(1));
