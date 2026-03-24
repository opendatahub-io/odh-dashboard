import {
  environmentVariablesFieldSchema,
  isValidEnvironmentVariables,
  hasInvalidEnvironmentVariableNames,
  type EnvironmentVariablesFieldData,
} from '../EnvironmentVariablesField';

describe('isValidEnvironmentVariables', () => {
  it('should return empty string for valid names', () => {
    expect(isValidEnvironmentVariables('MY_VAR')).toBe('');
    expect(isValidEnvironmentVariables('_private')).toBe('');
    expect(isValidEnvironmentVariables('a')).toBe('');
    expect(isValidEnvironmentVariables('A1_B2_C3')).toBe('');
  });

  it('should return empty string for empty name (no validation needed)', () => {
    expect(isValidEnvironmentVariables('')).toBe('');
  });

  it('should return error for names starting with a digit', () => {
    expect(isValidEnvironmentVariables('1VAR')).not.toBe('');
  });

  it('should return error for names with special characters', () => {
    expect(isValidEnvironmentVariables('MY-VAR')).not.toBe('');
    expect(isValidEnvironmentVariables('MY VAR')).not.toBe('');
    expect(isValidEnvironmentVariables('my.var')).not.toBe('');
  });
});

describe('environmentVariablesFieldSchema', () => {
  it('should accept disabled state with empty variables', () => {
    const data = { enabled: false, variables: [] };
    const result = environmentVariablesFieldSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should accept enabled state with valid variables', () => {
    const data = {
      enabled: true,
      variables: [{ name: 'MY_VAR', value: 'hello' }],
    };
    const result = environmentVariablesFieldSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should accept enabled state with empty variables array', () => {
    const data = { enabled: true, variables: [] };
    const result = environmentVariablesFieldSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should reject enabled state with invalid variable names', () => {
    const data = {
      enabled: true,
      variables: [{ name: '1INVALID', value: 'val' }],
    };
    const result = environmentVariablesFieldSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject enabled state with empty variable names', () => {
    const data = {
      enabled: true,
      variables: [{ name: '', value: '' }],
    };
    const result = environmentVariablesFieldSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  // Core bug scenario: RHOAIENG-48888
  // When env vars are disabled, empty/invalid variable names should NOT cause validation failure
  it('should accept disabled state with empty variable names (bug fix regression)', () => {
    const data = {
      enabled: false,
      variables: [{ name: '', value: '' }],
    };
    const result = environmentVariablesFieldSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should accept disabled state with invalid variable names (bug fix regression)', () => {
    const data = {
      enabled: false,
      variables: [{ name: '1INVALID', value: 'val' }],
    };
    const result = environmentVariablesFieldSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should accept disabled state with multiple partially-filled variables', () => {
    const data = {
      enabled: false,
      variables: [
        { name: '', value: '' },
        { name: 'VALID', value: 'x' },
        { name: '!!!', value: '' },
      ],
    };
    const result = environmentVariablesFieldSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe('hasInvalidEnvironmentVariableNames', () => {
  it('should return false when data is undefined', () => {
    expect(hasInvalidEnvironmentVariableNames(undefined)).toBe(false);
  });

  it('should return false when disabled', () => {
    const data: EnvironmentVariablesFieldData = {
      enabled: false,
      variables: [{ name: '', value: '' }],
    };
    expect(hasInvalidEnvironmentVariableNames(data)).toBe(false);
  });

  it('should return false when enabled with valid variables', () => {
    const data: EnvironmentVariablesFieldData = {
      enabled: true,
      variables: [{ name: 'MY_VAR', value: 'hello' }],
    };
    expect(hasInvalidEnvironmentVariableNames(data)).toBe(false);
  });

  it('should return true when enabled with empty variable name', () => {
    const data: EnvironmentVariablesFieldData = {
      enabled: true,
      variables: [{ name: '', value: '' }],
    };
    expect(hasInvalidEnvironmentVariableNames(data)).toBe(true);
  });

  it('should return true when enabled with invalid variable name', () => {
    const data: EnvironmentVariablesFieldData = {
      enabled: true,
      variables: [{ name: '1BAD', value: 'val' }],
    };
    expect(hasInvalidEnvironmentVariableNames(data)).toBe(true);
  });

  it('should return true if any variable is invalid when enabled', () => {
    const data: EnvironmentVariablesFieldData = {
      enabled: true,
      variables: [
        { name: 'GOOD', value: 'ok' },
        { name: '', value: '' },
      ],
    };
    expect(hasInvalidEnvironmentVariableNames(data)).toBe(true);
  });

  it('should return false when enabled with empty variables array', () => {
    const data: EnvironmentVariablesFieldData = {
      enabled: true,
      variables: [],
    };
    expect(hasInvalidEnvironmentVariableNames(data)).toBe(false);
  });

  // Bug scenario: user checks env var, adds empty row, then unchecks
  it('should return false when disabled even with empty rows (RHOAIENG-48888)', () => {
    const data: EnvironmentVariablesFieldData = {
      enabled: false,
      variables: [
        { name: '', value: '' },
        { name: '', value: '' },
      ],
    };
    expect(hasInvalidEnvironmentVariableNames(data)).toBe(false);
  });
});
