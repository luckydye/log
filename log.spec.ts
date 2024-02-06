import logger from './log.js';
import { InfluxWriteStream } from './influx';
import { it, describe } from 'bun:test';

describe('log', () => {
	it('logging', () => {
		const log = logger().prefix('Test').trace();

		log.info('Hello, world!');
		log.error('This is an error!');
	});

	it('no prefix', () => {
		const log = logger().trace();

		log.warn('This has no prefix!');
	});

	it('js objects', () => {
		const log = logger().prefix('Test');

		log.info('event', new Event('test'));
	});

	it('arguments', () => {
		const log = logger().trace();

		log.warn('Text here', 'one', 2, 'hello', 'world');

		log.warn('Text here', 'obj', { one: 2 });
	});

	it('invalid arguments', () => {
		const log = logger().trace();

		log.warn('Text here', 'and another text here');
		log.warn('Text here', { one: 2 });
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
					url: 'https://test',
					token: 'test',
				})
			);

		log.info('Hello, world!');
	});
});
