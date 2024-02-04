/**
  * Logger builder
  * @param {string} prefix
  */
export function logger(prefix: string, color: string) {
	return {
		info(...message: string[]) {
			const ts = new Date().toTimeString().split(' ').slice(0, 1).join(' ');
			console.log(`${ts} %c[${prefix}]`, `color: ${color}; font-weight: normal`, ...message);
		},
		debug(...message: string[]) {
			const ts = new Date().toTimeString().split(' ').slice(0, 1).join(' ');
			console.warn(`${ts} %c[${prefix}]`, `color: ${color}; font-weight: normal`, ...message);
		},
		error(...message: string[]) {
			const ts = new Date().toTimeString().split(' ').slice(0, 1).join(' ');
			console.error(`${ts} %c[${prefix}]`, `color: ${color}; font-weight: normal`, ...message);
		},
	};
}

// pipe logs to stream
