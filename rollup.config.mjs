import { defineConfig } from 'rollup'
import resolve from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy';

export default defineConfig([
    {
        input: [
            'src/main.mjs',
            'src/drupal-cgi-worker.mjs',
            'src/install-worker.mjs',
            'src/trial-manager.mjs',
            'src/service-worker.mjs'
        ],
        treeshake: false,
        output: {
            dir: 'public',
            format: 'es',
            preserveModules: true,
            preserveModulesRoot: 'src',
            entryFileNames: (chunkInfo) => {
                if (chunkInfo.name.includes('node_modules')) {
                    return chunkInfo.namhe.replace('node_modules', 'lib') + '.js';
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
                        src: [
                            'node_modules/**/*.so',
                            '!node_modules/**/php8.0*',
                            '!node_modules/**/php8.1*',
                            '!node_modules/**/php8.2*',
                        ],
                        dest: [
                            'public/lib/php-cgi-wasm',
                            'public/lib/php-wasm',
                        ],
                    },
                    {
                        src: [
                            'node_modules/php-wasm/php-worker.mjs',
                            'node_modules/php-wasm/php-worker.mjs.wasm',
                            'node_modules/php-wasm/libxml2.so',
                            'node_modules/php-cgi-wasm/php-cgi-worker.mjs',
                            'node_modules/php-cgi-wasm/php-cgi-worker.mjs.wasm',
                            'node_modules/php-cgi-wasm/libxml2.so',
                        ],
                        dest: 'public',
                        rename: (name, extension, fullPath) => {
                            return fullPath.replace('node_modules', 'lib')
                        }
                    }
                ]
            })
        ],
    },
]);
