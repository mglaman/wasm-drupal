import { PhpCgiWorker } from "./lib/PhpCgiWorker.mjs";
import setUpWorker from "./lib/setup-worker.mjs";

setUpWorker(self, PhpCgiWorker, '/cgi/', '/persist/www')
