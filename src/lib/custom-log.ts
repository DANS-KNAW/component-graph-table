type LogColor = "red" | "green" | "yellow" | "white";

interface LogOptions {
  color?: LogColor;
}

/**
 * Logs a message to the console with an optional color flag.
 *
 * @param message - The message to be logged.
 * @param color - The color of the log message. Defaults to "white".
 */
export const customLog = (
  message: string,
  { color = "white" }: LogOptions = {}
): void => {
  const colors = {
    red: "\x1b[31m%s\x1b[0m",
    green: "\x1b[32m%s\x1b[0m",
    yellow: "\x1b[33m%s\x1b[0m",
    white: "\x1b[37m%s\x1b[0m",
  };

  console.log(colors[color as keyof typeof colors], message);
};

/**
 * Throws an error with the specified message and logs it using customLog.
 *
 * Using a traditional function over an arrow function due to TypeScript's inconsistent type narrowing behavior between the two.
 * See https://github.com/microsoft/TypeScript/issues/51075 for more details.
 *
 * P.s. I hate TypeScript.
 *
 * @param message - The error message.
 * @param error - The optional error object. Note: this will only be logged if debug mode is enabled.
 * @returns This function never returns a value.
 * @throws {Error} - The error with the specified message.
 */
export function throwErrorAndLog(message: string, error?: any): never {
  customLog(message, { color: "red" });
  throw new Error(error ?? message);
}
