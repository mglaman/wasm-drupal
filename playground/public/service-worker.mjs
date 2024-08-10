import {getBroadcastChannel, setUpWorker} from "./drupal-cgi-worker.mjs";

const php = setUpWorker(
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

const channel = getBroadcastChannel()
channel.addEventListener('message', ({ data }) => {
    const { action } = data;
    if (action === 'refresh') {
        console.log('Refreshing CGI')
        php.refresh();
    }
})

// Extras
self.addEventListener('install', () => console.log('Install'));
self.addEventListener('activate', () => {
    channel.postMessage({
        action: 'service_worker_activated'
    })
});
