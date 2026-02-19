/**
 * Logger utility that disables console logging in production
 */

const isDevelopment = import.meta.env.DEV;

// Disable all console methods in production
const noop = () => {};

export const logger = {
  log: isDevelopment ? console.log.bind(console) : noop,
  warn: isDevelopment ? console.warn.bind(console) : noop,
  error: isDevelopment ? console.error.bind(console) : noop,
  info: isDevelopment ? console.info.bind(console) : noop,
  debug: isDevelopment ? console.debug.bind(console) : noop,
  trace: isDevelopment ? console.trace.bind(console) : noop,
  group: isDevelopment ? console.group.bind(console) : noop,
  groupEnd: isDevelopment ? console.groupEnd.bind(console) : noop,
  groupCollapsed: isDevelopment ? console.groupCollapsed.bind(console) : noop,
  table: isDevelopment ? console.table.bind(console) : noop,
  time: isDevelopment ? console.time.bind(console) : noop,
  timeEnd: isDevelopment ? console.timeEnd.bind(console) : noop,
  count: isDevelopment ? console.count.bind(console) : noop,
  countReset: isDevelopment ? console.countReset.bind(console) : noop,
  clear: isDevelopment ? console.clear.bind(console) : noop,
  dir: isDevelopment ? console.dir.bind(console) : noop,
  dirxml: isDevelopment ? console.dirxml.bind(console) : noop,
  assert: isDevelopment ? console.assert.bind(console) : noop,
};

// Override global console in production
if (!isDevelopment) {
  // @ts-ignore
  window.console = {
    log: noop,
    warn: noop,
    error: noop,
    info: noop,
    debug: noop,
    trace: noop,
    group: noop,
    groupEnd: noop,
    groupCollapsed: noop,
    table: noop,
    time: noop,
    timeEnd: noop,
    count: noop,
    countReset: noop,
    clear: noop,
    dir: noop,
    dirxml: noop,
    assert: noop,
  };
}

export default logger;
