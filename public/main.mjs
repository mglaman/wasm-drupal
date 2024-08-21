import { defineTrialManagerElement } from "./trial-manager.mjs";

defineTrialManagerElement()

const moduleUrl = `${window.location.origin}/service-worker.mjs`
const bundledUrl = `${window.location.origin}/service-worker.js`

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
