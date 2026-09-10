import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import {
  EnvironmentVariablesField,
  environmentVariablesFieldSchema,
  isValidEnvironmentVariables,
  hasInvalidEnvironmentVariableNames,
  type EnvironmentVariablesFieldData,
} from '../EnvironmentVariablesField';
import { EnvironmentVariableType } from '../../../../shared/environmentVariablesUtils';

const StatefulEnvironmentVariablesField: React.FC<{
  initialData: EnvironmentVariablesFieldData;
}> = ({ initialData }) => {
  const [data, setData] = React.useState(initialData);

  return <EnvironmentVariablesField data={data} onChange={setData} />;
};

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

  it('should accept enabled state with valid value variables', () => {
    const data = {
      enabled: true,
      variables: [{ type: EnvironmentVariableType.Value, name: 'MY_VAR', value: 'hello' }],
    };
    const result = environmentVariablesFieldSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should accept enabled state with valid secret variables', () => {
    const data = {
      enabled: true,
      variables: [
        {
          type: EnvironmentVariableType.Secret,
          name: 'HF_TOKEN',
          secretName: 'hf-secret',
          secretKey: 'HF_TOKEN',
        },
      ],
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
      variables: [{ type: EnvironmentVariableType.Value, name: '1INVALID', value: 'val' }],
    };
    const result = environmentVariablesFieldSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject enabled state with empty variable names', () => {
    const data = {
      enabled: true,
      variables: [{ type: EnvironmentVariableType.Value, name: '', value: '' }],
    };
    const result = environmentVariablesFieldSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject enabled state with empty secret fields', () => {
    const data = {
      enabled: true,
      variables: [
        {
          type: EnvironmentVariableType.Secret,
          name: 'HF_TOKEN',
          secretName: '',
          secretKey: '',
        },
      ],
    };
    const result = environmentVariablesFieldSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

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
      variables: [{ type: EnvironmentVariableType.Value, name: 'MY_VAR', value: 'hello' }],
    };
    expect(hasInvalidEnvironmentVariableNames(data)).toBe(false);
  });

  it('should return false when enabled with valid secret variables', () => {
    const data: EnvironmentVariablesFieldData = {
      enabled: true,
      variables: [
        {
          type: EnvironmentVariableType.Secret,
          name: 'HF_TOKEN',
          secretName: 'hf-secret',
          secretKey: 'HF_TOKEN',
        },
      ],
    };
    expect(hasInvalidEnvironmentVariableNames(data)).toBe(false);
  });

  it('should return true when enabled with empty variable name', () => {
    const data: EnvironmentVariablesFieldData = {
      enabled: true,
      variables: [{ type: EnvironmentVariableType.Value, name: '', value: '' }],
    };
    expect(hasInvalidEnvironmentVariableNames(data)).toBe(true);
  });

  it('should return true when enabled with invalid variable name', () => {
    const data: EnvironmentVariablesFieldData = {
      enabled: true,
      variables: [{ type: EnvironmentVariableType.Value, name: '1BAD', value: 'val' }],
    };
    expect(hasInvalidEnvironmentVariableNames(data)).toBe(true);
  });

  it('should return true when enabled with incomplete secret variable', () => {
    const data: EnvironmentVariablesFieldData = {
      enabled: true,
      variables: [
        {
          type: EnvironmentVariableType.Secret,
          name: 'HF_TOKEN',
          secretName: '',
          secretKey: 'HF_TOKEN',
        },
      ],
    };
    expect(hasInvalidEnvironmentVariableNames(data)).toBe(true);
  });

  it('should return true if any variable is invalid when enabled', () => {
    const data: EnvironmentVariablesFieldData = {
      enabled: true,
      variables: [
        { type: EnvironmentVariableType.Value, name: 'GOOD', value: 'ok' },
        { type: EnvironmentVariableType.Value, name: '', value: '' },
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

describe('EnvironmentVariablesField', () => {
  it('should render value inputs by default when adding a variable', async () => {
    const user = userEvent.setup();

    render(<StatefulEnvironmentVariablesField initialData={{ enabled: true, variables: [] }} />);

    await user.click(screen.getByTestId('add-environment-variable'));

    expect(screen.getByTestId('env-var-type-0')).toBeInTheDocument();
    expect(screen.getByTestId('env-var-value-0')).toBeInTheDocument();
    expect(screen.queryByTestId('env-var-secret-name-0')).not.toBeInTheDocument();
  });

  it('should show secret fields for an existing secret env var', () => {
    render(
      <EnvironmentVariablesField
        data={{
          enabled: true,
          variables: [
            {
              type: EnvironmentVariableType.Secret,
              name: 'HF_TOKEN',
              secretName: 'hf-secret',
              secretKey: 'HF_TOKEN',
            },
          ],
        }}
      />,
    );

    expect(screen.getByTestId('env-var-secret-name-0')).toHaveValue('hf-secret');
    expect(screen.getByTestId('env-var-secret-key-0')).toHaveValue('HF_TOKEN');
  });
});
