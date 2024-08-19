import { registerWorker } from './utils.mjs'
import { defineTrialManagerElement } from "./trial-manager.mjs";

defineTrialManagerElement()
registerWorker(
  `${window.location.origin}/service-worker.mjs`,
  `${window.location.origin}/service-worker.js`
)
