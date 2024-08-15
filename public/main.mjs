import { registerWorker } from './drupal-cgi-worker.mjs'
import { defineTrialManagerElement } from "./trial-manager.mjs";

defineTrialManagerElement()
registerWorker(`${window.location.origin}/service-worker.mjs`)
