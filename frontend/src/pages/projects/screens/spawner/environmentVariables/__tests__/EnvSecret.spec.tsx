import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SecretCategory } from '#~/pages/projects/types';
import EnvSecret from '#~/pages/projects/screens/spawner/environmentVariables/EnvSecret';

jest.mock('#~/components/SimpleSelect', () => ({
  __esModule: true,
  default: ({
    options,
    value,
    onChange,
  }: {
    options: { key: string; label: string }[];
    value: string;
    onChange: (key: string) => void;
  }) => (
    <select
      data-testid="env-data-type-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select one</option>
      {options.map((o) => (
        <option key={o.key} value={o.key}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

jest.mock(
  '#~/pages/projects/screens/spawner/environmentVariables/GenericKeyValuePairField',
  () => ({
    __esModule: true,
    default: () => <div data-testid="generic-key-value-pair-field" />,
  }),
);

jest.mock('#~/pages/projects/screens/spawner/environmentVariables/EnvUploadField', () => ({
  __esModule: true,
  default: () => <div data-testid="env-upload-field" />,
}));

jest.mock('#~/pages/projects/screens/spawner/environmentVariables/EnvExistingSecret', () => ({
  __esModule: true,
  default: () => <div data-testid="env-existing-secret" />,
}));

describe('EnvSecret', () => {
  const defaultProps = {
    namespace: 'test-ns',
    onUpdate: jest.fn(),
    onExistingSecretRefsUpdate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render three options: Key / value, Upload, Existing secret', () => {
    render(<EnvSecret {...defaultProps} />);

    const select = screen.getByTestId('env-data-type-select');
    const options = select.querySelectorAll('option');

    // Placeholder + 3 real options
    const labels = Array.from(options).map((o) => o.textContent);
    expect(labels).toContain('Key / value');
    expect(labels).toContain('Upload');
    expect(labels).toContain('Existing secret');
  });

  it('should render GenericKeyValuePairField when GENERIC is selected', () => {
    render(<EnvSecret {...defaultProps} env={{ category: SecretCategory.GENERIC, data: [] }} />);

    expect(screen.getByTestId('generic-key-value-pair-field')).toBeInTheDocument();
  });

  it('should render EnvUploadField when UPLOAD is selected', () => {
    render(<EnvSecret {...defaultProps} env={{ category: SecretCategory.UPLOAD, data: [] }} />);

    expect(screen.getByTestId('env-upload-field')).toBeInTheDocument();
  });

  it('should render EnvExistingSecret when EXISTING is selected', () => {
    render(<EnvSecret {...defaultProps} env={{ category: SecretCategory.EXISTING, data: [] }} />);

    expect(screen.getByTestId('env-existing-secret')).toBeInTheDocument();
  });

  it('should call onUpdate when a category is selected', () => {
    render(<EnvSecret {...defaultProps} />);

    fireEvent.change(screen.getByTestId('env-data-type-select'), {
      target: { value: SecretCategory.EXISTING },
    });

    expect(defaultProps.onUpdate).toHaveBeenCalledWith({
      category: SecretCategory.EXISTING,
      data: [],
    });
  });
});
