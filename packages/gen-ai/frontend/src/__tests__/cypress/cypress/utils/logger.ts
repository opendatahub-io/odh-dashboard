export enum LogLevel {
  INFO = 'info',
  ERROR = 'error',
  TABLE = 'table',
  WARN = 'warn',
  DEBUG = 'debug',
}

export const logToConsole = (level: LogLevel, message: unknown): null => {
  switch (level) {
    case LogLevel.INFO:
      // eslint-disable-next-line no-console
      console.log(message);
      break;
    case LogLevel.ERROR:
      // eslint-disable-next-line no-console
      console.error(message);
      break;
    case LogLevel.TABLE:
      // eslint-disable-next-line no-console
      console.table(message);
      break;
    case LogLevel.WARN:
      // eslint-disable-next-line no-console
      console.warn(message);
      break;
    case LogLevel.DEBUG:
      // eslint-disable-next-line no-console
      console.debug(message);
      break;
    default:
      // eslint-disable-next-line no-console
      console.log(message);
  }
  return null;
};
