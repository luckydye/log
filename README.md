# log

A small (<2KB gzipped minified) JavaScript logging library inspired by charmbracelet/log and docs.rs/env_logger.

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
02/06/2024 00:38:05 INFO <log.spec.ts:7:13> Test: Hello, world!!
02/05/2024 13:32:53 ERROR <log.spec.ts:7:41> Test: This is an error!
03/01/2024 22:41:53 ERROR <log.spec.ts:43:25> testing err=Test error
SyntaxError: Test error
    at <parse> (:0)
    at <anonymous> (/Users/tihav/source/log/log.spec.ts:82:1)
```

### Formatted arguments

```javascript
log.warn('An Object', 'obj', { one: 2 });
```

```bash
02/06/2024 00:38:05 WARN <log.spec.ts:17:64> Text here obj=Object{"one":2}
```

### JSON output

```javascript
const logJson = logger().prefix('Json').trace().json();
logJson.info('Hello, world!');
```

```bash
{"ts":"2024-02-05T13:33:05.270Z","level":"info","prefix":"Json","location":"log.spec.ts:9:48","msg":"Hello, world!","args":["Hello, world!"]}
```

### Deno

```javascript
import logger from "npm:@luckydye/log";

const log = logger().prefix("Deno");
log.error("Test error");
```

### InfluxDB

Send logs to a InfluxDB (v2).

```javascript
import logger from "@luckydye/log";
import { InfluxWriteStream } from '@luckydye/log/influx';

const log = logger()
  .prefix('Influx')
  .pipeTo(
    new InfluxWriteStream({
      org: 'organisation',
      bucket: 'bucket_name',
      db: 'database_name',
      url: 'https://influxdb.example.com',
      token: 'ACCESS_TOKEN',
    })
  );

// JS_LOG filtering applies here as well
log.info('Hello, world!');
```

## Environment variables

### JS_LOG

Set the log level. Default is `info`.

#### Set log level for specific prefixes.

```bash
JS_LOG=[prefix][=][level][,...]
```

```bash
JS_LOG = "error,Test=debug"
```

## Configuration

### Prefix

```javascript
const log = logger().prefix("Topic");
```

### Enable stack trace

Display last frame of stack trace in the output.

```javascript
const log = logger().trace();
```

### Set time format

Set the time format. Default is `local`.
Set to `false` to disable time.

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
