import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'happy-dom',
        include: [
            'tests/**'
        ],
        exclude: [
            ...configDefaults.exclude,
            'tests/fixtures/**',
            'tests/utils.js'
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text'],
            include: [
                'public/drupal-cgi-worker.mjs',
                'public/install-worker.mjs',
                'public/service-worker.mjs',
                'public/trial-manager.mjs'
            ],
        }
    },
})
