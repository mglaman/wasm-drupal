import { PhpCgiWorker } from "./PhpCgiWorker.mjs";
import {setUpWorker} from "./drupal-cgi-worker.mjs";

setUpWorker(self, PhpCgiWorker, '/cgi/', '/persist/www')
