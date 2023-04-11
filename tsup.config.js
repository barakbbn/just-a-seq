const path = require('path')
// If using npx, use its node_module
const nodeModuleTsup = path.join('node_modules', 'tsup');
const findTsupPath = p => p.includes(nodeModuleTsup);
const tsupModuleAbsolutePath = module.paths.find(findTsupPath) ?? module.parent.paths.find(findTsupPath) ?? module.parent.parent.paths.find(findTsupPath) ?? '';
const nodeModulesPath = tsupModuleAbsolutePath.substring(0, tsupModuleAbsolutePath.indexOf(nodeModuleTsup) + 'node_modules'.length);

const {defineConfig} = require(path.join(nodeModulesPath, 'tsup'));
const {umdWrapper} = require(path.join(nodeModulesPath, 'esbuild-plugin-umd-wrapper'));

export default defineConfig({
  entry: ['lib/index.ts'],
  splitting: false,
  sourcemap: true,
  dts: true,
  minify: true,
  clean: true,
  shims: true,
  format: ['umd' /* required by umdWrapper plugin */],
  globalName: 'jaseq',
  target: [
    'es2020'
  ],
  platform: 'neutral',
  esbuildPlugins: [umdWrapper({libraryName: 'jaseq'})]
});

