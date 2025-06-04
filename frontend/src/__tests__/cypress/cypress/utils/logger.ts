/**
 * Helper function to handle logging to both console and stdout
 * @param level - Log level (INFO, ERROR, etc.)
 * @param message - Message to log
 * @param consoleMethod - Console method to use (console.log, console.error, etc.)
 * @param processStream - Process stream to write to (process.stdout, process.stderr)
 * @returns null
 */
export function logToConsoleAndStdout(
  level: string,
  message: string,
  consoleMethod: typeof console.log,
  processStream: NodeJS.WriteStream,
): null {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${level}] ${message}`;
  consoleMethod(formattedMessage);
  processStream.write(`${formattedMessage}\n`);
  return null;
}
