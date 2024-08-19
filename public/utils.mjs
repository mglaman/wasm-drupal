export function getBroadcastChannel() {
    return new BroadcastChannel('drupal-cgi-worker');
}

export function registerWorker(moduleUrl, bundledUrl) {
    const serviceWorker = navigator.serviceWorker;
    serviceWorker.register(moduleUrl, {
        type: "module"
    })
        .catch(() => {
            console.log('Browser did not support ES modules in service worker, trying bundled service worker')
            serviceWorker.register(bundledUrl)
                .catch(error => {
                    alert("There was an error loading the service worker. Check known compatibility issues and your browser's developer console.")
                    console.error(error)
                });
        });
}
