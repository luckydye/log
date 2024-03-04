import { afterEach, expect, test } from 'bun:test';
import { InfluxWriteStream } from './influx';
import logger, { assert } from './log.js';

afterEach(() => {
	process.env.JS_LOG = 'debug';
	globalThis.JS_LOG = process.env.JS_LOG;
});

test('logging', () => {
	const log = logger().prefix('Test').trace();

	log.info('Hello, world!');
	log.error('This is an error!');
});

test('no prefix', () => {
	const log = logger();

	log.warn('This has no prefix!');
});

test('js objects', () => {
	const log = logger().prefix('Test');

	log.info('event', new Event('test'));
});

test('boolean', () => {
	const log = logger().prefix('Test');

	log.info('bool', true);
	log.info('bool', 'value', false);
});

test('arguments', () => {
	const log = logger().trace();

	log.warn('Text here', 'one', 2, 'hello', 'world');

	log.warn('Text here', 'obj', { one: 2 });
});

test('invalid arguments', () => {
	const log = logger().trace();

	log.warn('Text here', 'and another text here');
	log.warn('Text here', { one: 2 });
});

test('json', () => {
	const logJson = logger().prefix('Test').json().trace();
	logJson.info('Hello, world!');
});

test('influx', () => {
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

test('log format', () => {
	const log = logger().trace().time(false);

	const str = log.sprint('error', 'Hello, world!');

	const expected =
		'\u001B[31mERROR\u001B[0m \u001B[90m<log.spec.ts:47:47>\u001B[0m Hello, world!';

	expect(str).toBe(expected);
});

test('log errors', () => {
	const log = logger().trace();

	log.error('testing', 'err', new SyntaxError('Test error'));
});

test('log level env', () => {
	process.env.JS_LOG = 'error';

	const log = logger().trace();

	// @ts-ignore
	const print = log.checkLevel('info');

	expect(print).toBe(false);
});

test('log level globalThis', () => {
	process.env.JS_LOG = undefined;
	globalThis.JS_LOG = 'error';

	const log = logger().trace();

	// @ts-ignore
	const print = log.checkLevel('info');

	expect(print).toBe(false);
});

test('assertion', () => {
	try {
		assert(false, "This shouldn't be true");
	} catch (err) {
		return;
	}

	throw new Error('Assertion failed to throw');
});
