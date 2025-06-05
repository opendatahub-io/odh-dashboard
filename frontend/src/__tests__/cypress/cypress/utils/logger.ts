/**
 * Helper function to handle logging to console
 * @param level - Log level (INFO, ERROR, etc.)
 * @param message - Message to log
 * @param consoleMethod - Console method to use (console.log, console.error, etc.)
 * @returns null
 */
export function logToConsole(
  level: string,
  message: string,
  consoleMethod: typeof console.log,
): null {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${level}] ${message}`;
  consoleMethod(formattedMessage);
  return null;
}
