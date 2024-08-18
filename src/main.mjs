import { defineTrialManagerElement } from "./trial-manager.mjs";

defineTrialManagerElement();

const serviceWorker = navigator.serviceWorker;
serviceWorker
  .register(`${window.location.origin}/service-worker.js`)
  .catch((error) => {
    alert(
      "There was an error loading the service worker. Check known compatibility issues and your browser's developer console."
    );
    console.error(error);
  });
