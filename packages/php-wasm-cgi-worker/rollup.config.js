import { defineConfig } from 'rollup';

import resolve from '@rollup/plugin-node-resolve';

export default defineConfig({
    input: 'src/index.js',
    output: [
        {
            dir: 'dist',
            format: 'esm',
            preserveModules: true,
            preserveModulesRoot: 'src',
            entryFileNames: '[name].mjs',
        }
    ],
    plugins: [resolve()]
});
