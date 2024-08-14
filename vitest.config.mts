import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'happy-dom',
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
