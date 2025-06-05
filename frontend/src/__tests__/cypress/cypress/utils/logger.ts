export const LogLevel = {
  INFO: { value: 'info', method: console.log },
  ERROR: { value: 'error', method: console.error },
  TABLE: { value: 'table', method: console.table },
} as const;

type LogLevelType = typeof LogLevel[keyof typeof LogLevel];

/**
 * Helper function to handle logging to console
 * @param level - Log level from LogLevel object
 * @param message - Message to log
 * @returns null
 */
export function logToConsole(
  level: LogLevelType,
  message: string,
): null {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${level.value.toUpperCase()}] ${message}`;
  level.method(formattedMessage);
  return null;
}
