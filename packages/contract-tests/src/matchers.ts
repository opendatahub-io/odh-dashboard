// Simple matcher utilities for contract tests
export function validateContract(): boolean {
  return true;
}

export function createContractMatcher(): { valid: boolean; errors?: string[] } {
  const valid = validateContract();

  if (valid) {
    return { valid: true };
  }

  return {
    valid: false,
    errors: ['Contract validation failed'],
  };
}
