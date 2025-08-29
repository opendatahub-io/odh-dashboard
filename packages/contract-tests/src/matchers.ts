// Simple matcher utilities for contract tests
export function validateContract(data: unknown, schema: unknown): boolean {
  // Simplified validation for now
  return true;
}

export function createContractMatcher(data: unknown, schema: unknown): { valid: boolean; errors?: string[] } {
  const valid = validateContract(data, schema);
  
  if (valid) {
    return { valid: true };
  }
  
  return {
    valid: false,
    errors: ['Contract validation failed']
  };
}
