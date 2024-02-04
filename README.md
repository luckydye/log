# logging

A tiny JavaScript logging library inspired by charmbracelet/log.

## Usage

```bash
npm i @luckydye/log
```

### Log levels

```javascript
import logger from '@luckydye/log';

const log = logger().prefix("Prefix");

log.info("Hello, world!");
```

```bash
02/05/2024, 12:36 AM ERROR <log/log.js:122:14> Test: This is an error!
```

### JSON output

```javascript
const logJson = logger().prefix('Json').json().trace();
logJson.info('Hello, world!');
```

```bash
{"ts":"02/05/2024, 12:36 AM","level":"info","prefix":"Json","location":"log/log.js:119:14","msg":"Hello, world!","args":["Hello, world!"]}
```
