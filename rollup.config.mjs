import { defineConfig } from 'rollup'
import resolve from '@rollup/plugin-node-resolve';

export default defineConfig([
    {
        input: [
            'src/main.mjs',
            'src/drupal-cgi-worker.mjs',
            'src/install-worker.mjs',
            'src/trial-manager.mjs',
        ],
        treeshake: false,
        output: {
            dir: 'public',
            format: 'es',
            preserveModules: true,
            preserveModulesRoot: 'src',
            entryFileNames: (chunkInfo) => {
                if (chunkInfo.name.includes('node_modules')) {
                    return chunkInfo.name.replace('node_modules', 'lib') + '.js';
                }

                return '[name].js';
            }
        },
        plugins: [resolve()],
    },
    {

    }
]);
