import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'happy-dom',
        testTimeout: 999999,
        include: [
            'tests/**'
        ],
        exclude: [
            ...configDefaults.exclude,
            'tests/fixtures/**'
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
