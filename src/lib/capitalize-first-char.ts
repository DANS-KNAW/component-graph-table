/**
 * Capitalizes the first character of a string.
 *
 * @param str - The input string.
 * @returns The input string with the first character capitalized.
 */
function capitalizeFirstChar(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default capitalizeFirstChar;