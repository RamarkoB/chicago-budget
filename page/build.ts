import * as esbuild from 'npm:esbuild';
import { copyFile } from 'node:fs/promises';
import { denoPlugin } from 'jsr:@deno/esbuild-plugin';

await esbuild.build({
    entryPoints: ['src/main.ts'],
    outfile: './dist/main.js',
    // external: ['npm:d3'],
    bundle: true,
    format: 'iife',
    sourcemap: true,
    target: 'es2022',
    platform: 'browser',
    loader: { '.ts': 'ts' },
    plugins: [denoPlugin()],
});

// Copy index.html to dist directory
await copyFile('./static/index.html', './dist/index.html');
// await copyFile('./static/styles.css', './dist/styles.css');
await copyFile('./static/ordinance.csv', './dist/ordinance.csv');

esbuild.stop();
