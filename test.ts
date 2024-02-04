import logger, { InfluxLogStream } from './lib';

const log = logger().prefix('Test').trace();

log.info('Hello, world!');

log.pipeTo(
	new InfluxLogStream({
		bucket: 'test',
		url: 'test',
		token: 'test',
	})
);
