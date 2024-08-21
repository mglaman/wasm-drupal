# @mglaman/php-wasm-cgi-worker

- Intended to be used alongside dedicated worker versus main thread
- Uses broadcast channel for communication over normal service worker messaging
- Default image mimetypes
- Persistent cookie storage

```javascript
import { PhpCgiWorker } from "./PhpCgiWorker.mjs";
import setUpWorker from "./setup-worker.mjs";

setUpWorker(self, PhpCgiWorker, '/cgi/', '/persist/www')
```
