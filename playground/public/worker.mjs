import {registerDrupalCgiWorker} from "./drupal-cgi-worker.mjs";

registerDrupalCgiWorker(
    self,
    '/cgi/',
    '/persist/www',
    [
        {
            pathPrefix: '/cgi/drupal',
            directory: '/persist/drupal/web',
            entrypoint: 'index.php',
        },
        {
            pathPrefix: '/cgi/starshot',
            directory: '/persist/starshot/web',
            entrypoint: 'index.php',
        }
    ]
)

// Extras
self.addEventListener('install', () => console.log('Install'));
self.addEventListener('activate', () => console.log('Activate'));
