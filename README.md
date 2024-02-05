# log

A small (<2KB gzipped minified) JavaScript logging library inspired by charmbracelet/log.

## Usage

```bash
npm i @luckydye/log
```

## Examples

### Log levels

```javascript
import logger from '@luckydye/log';

const log = logger().prefix("Test").trace();

log.info("Log info");
log.error("This is an error!");
```

```bash
02/05/2024, 12:36 AM INFO <log/log.js:121:14> Test: Log info
02/05/2024, 12:36 AM ERROR <log/log.js:122:14> Test: This is an error!
```

### JSON output

```javascript
const logJson = logger().prefix('Json').trace().json();
logJson.info('Hello, world!');
```

```bash
{"ts":"02/05/2024, 12:36 AM","level":"info","prefix":"Json","location":"log/log.js:119:14","msg":"Hello, world!"}
```

### Deno

```javascript
import logger from "npm:@luckydye/log";

const log = logger().prefix("Deno");
log.error("Test error");
```

## Environment variables

### JS_LOG

Set the log level. Default is `error`.

## Configuration

### Prefix

```javascript
const log = logger().prefix("Topic");
```

### Enable stack trace

Disalbe last frame of stack trace in the output.

```javascript
const log = logger().trace();
```

### Set time format

```javascript
const log = logger().time("local" | "kitchen" | "iso" | "utc");

// disable time
const log = logger().time(false);
```

### Enable json output

```javascript
const log = logger().json();
```

### Pipe log messages to arbitrary stream

```javascript
const log = logger().pipeTo(WriteableStream);
```
