const isDev = import.meta.env.DEV;

const logger = {
    error: (...args) => {
        if (isDev) {
            console.error(...args);
        }
    },
    warn: (...args) => {
        if (isDev) {
            console.warn(...args);
        }
    },
    info: (...args) => {
        if (isDev) {
            console.info(...args);
        }
    },
    debug: (...args) => {
        if (isDev) {
            console.debug(...args);
        }
    },
    log: (...args) => {
        if (isDev) {
            console.log(...args);
        }
    },
};

export default logger;
