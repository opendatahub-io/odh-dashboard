export const LogLevel = {
  // eslint-disable-next-line no-console
  INFO: { value: 'info', method: console.log },
  // eslint-disable-next-line no-console
  ERROR: { value: 'error', method: console.error },
  // eslint-disable-next-line no-console
  TABLE: { value: 'table', method: console.table },
} as const;

type LogLevelType = (typeof LogLevel)[keyof typeof LogLevel];

/**
 * Helper function to handle logging to console
 * @param level - Log level from LogLevel object
 * @param message - Message to log
 * @returns null
 */
export function logToConsole(level: LogLevelType, message: string): null {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${level.value.toUpperCase()}] ${message}`;
  level.method(formattedMessage);
  return null;
}
