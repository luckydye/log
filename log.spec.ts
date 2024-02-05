import logger from './log';
import { InfluxWriteStream } from './influx';
import { it, describe } from 'bun:test';

describe('log', () => {
	it('logging', () => {
		const log = logger().prefix('Test').trace();

		log.info('Hello, world!');
		log.error('This is an error!');
	});

	it('json', () => {
		const logJson = logger().prefix('Json').json().trace();
		logJson.info('Hello, world!');
	});

	it('influx', () => {
		const log = logger()
			.prefix('Influx')
			.time(false)
			.pipeTo(
				new InfluxWriteStream({
					org: 'test',
					bucket: 'test',
					db: 'test',
					url: 'test',
					token: 'test',
				})
			);

		log.info('Hello, world!');
	});
});
