import logger, { InfluxWriteStream } from './log';

const log = logger()
	.prefix('Test')
	.trace()
	.pipeTo(
		new InfluxWriteStream({
			org: 'ekko',
			bucket: 'test',
			db: 'test',
			url: 'https://logging.luckydye.de',
			token:
				'agqaDudQ-m9BRzgaWyosOk6QYKXRNhJZPP677HHygtGdbU5Rh8yUMr7yDpftEIQLOd5f7jL0Jjevb5NyCoBlCw==',
		})
	);

log.info('Hello, world!');
log.error('This is an error!');

const logJson = logger().prefix('Json').json().trace();
logJson.info('Hello, world!');
