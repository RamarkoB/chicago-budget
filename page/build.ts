import * as esbuild from 'npm:esbuild';
import { copyFile } from 'node:fs/promises';
import { denoPlugin } from 'jsr:@deno/esbuild-plugin';
import { copy } from 'jsr:@std/fs/copy';

await esbuild.build({
    entryPoints: ['src/main.ts'],
    outfile: './dist/main.js',
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
await copy('./data/', './dist/data', { overwrite: true });

esbuild.stop();
