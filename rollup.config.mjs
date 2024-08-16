import { defineConfig } from 'rollup'
import resolve from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy';

export default defineConfig([
    // @todo add target for service-worker.mjs as iife
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
        plugins: [
            resolve(),
            // "http://localhost/lib/php-wasm/php-worker.mjs.wasm"
            copy({
                targets: [
                    {
                        src: 'src/service-worker.mjs',
                        dest: 'public'
                    },
                    {
                        src: [
                            'node_modules/php-*/**/*.mjs*',
                            '!node_modules/php-*/**/*node*',
                            '!node_modules/php-*/**/*Node*',
                            '!node_modules/php-*/**/*webview*',
                            '!node_modules/php-*/**/*Webview*',
                            '!node_modules/php-*/**/php-tags*',
                            '!node_modules/php-*/**/index*',
                        ],
                        dest: 'public'
                    },
                    {
                        src: [
                            'node_modules/*/*.so',
                            '!node_modules/*/php8.0*',
                            '!node_modules/*/php8.1*',
                            '!node_modules/*/php8.2*',
                        ],
                        dest: 'public'
                    }
                ]
            })
        ],
    },
]);
