import {setUpWorker} from "./drupal-cgi-worker.mjs";

setUpWorker(self, '/cgi/', '/persist/www')
