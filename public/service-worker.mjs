import { PhpCgiWorker } from "./PhpCgiWorker.mjs";
import setupCgiWorker from "./setup-cgi-worker.mjs";

setupCgiWorker(self, PhpCgiWorker, '/cgi/', '/persist/www')
