/**
 * Returns which required keys are missing from the available keys (case-sensitive).
 * Used to validate that a secret has all keys required for a given use case.
 */
export function getMissingRequiredKeys(requiredKeys: string[], availableKeys: string[]): string[] {
  if (!requiredKeys.length) {
    return [];
  }
  const availableSet = new Set(availableKeys);
  return requiredKeys.filter((requiredKey) => !availableSet.has(requiredKey));
}

/**
 * Formats a user-facing message for missing required keys on a secret.
 */
export function formatMissingKeysMessage(missingKeys: string[]): string {
  if (missingKeys.length === 0) {
    return '';
  }
  const keyList = missingKeys.map((k) => `"${k}"`).join(', ');
  return missingKeys.length === 1
    ? `Required key ${keyList} is not set in this secret`
    : `Required keys ${keyList} are not set in this secret`;
}
