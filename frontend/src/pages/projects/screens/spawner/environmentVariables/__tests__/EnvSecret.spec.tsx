import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SimpleSelect from '@odh-dashboard/ui-core/components/SimpleSelect';
import { SecretCategory, EnvVariableData } from '#~/pages/projects/types';
import EnvSecret from '#~/pages/projects/screens/spawner/environmentVariables/EnvSecret';

jest.mock('../GenericKeyValuePairField', () => ({
  __esModule: true,
  default: () => <div data-testid="generic-key-value-pair-field" />,
}));

jest.mock('../EnvUploadField', () => ({
  __esModule: true,
  default: () => <div data-testid="env-upload-field" />,
}));

jest.mock('../EnvExistingSecretField', () => ({
  __esModule: true,
  default: () => <div data-testid="env-existing-secret-field" />,
}));

jest.mock('@odh-dashboard/ui-core/components/SimpleSelect', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('#~/utilities/utils', () => ({
  getDashboardMainContainer: jest.fn(),
}));

const mockSimpleSelect = SimpleSelect as jest.Mock;

describe('EnvSecret', () => {
  const onUpdate = jest.fn();
  const onUpdateVariable = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSimpleSelect.mockImplementation(({ options, onChange, value }) => (
      <div data-testid="env-data-type-field">
        <select
          data-testid="env-secret-category-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select one</option>
          {options.map((option: { key: string; label: string }) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    ));
  });

  it('should render all three category options (GENERIC, UPLOAD, EXISTING)', () => {
    render(<EnvSecret onUpdate={onUpdate} onUpdateVariable={onUpdateVariable} />);

    const { options } = mockSimpleSelect.mock.calls[0][0];
    const keys = options.map((o: { key: string }) => o.key);

    expect(keys).toContain(SecretCategory.GENERIC);
    expect(keys).toContain(SecretCategory.UPLOAD);
    expect(keys).toContain(SecretCategory.EXISTING);
    expect(options).toHaveLength(3);
  });

  it('should render the "Key / value" label for GENERIC option', () => {
    render(<EnvSecret onUpdate={onUpdate} onUpdateVariable={onUpdateVariable} />);

    const { options } = mockSimpleSelect.mock.calls[0][0];
    const generic = options.find((o: { key: string }) => o.key === SecretCategory.GENERIC);
    expect(generic.label).toBe('Key / value');
  });

  it('should render the "Upload" label for UPLOAD option', () => {
    render(<EnvSecret onUpdate={onUpdate} onUpdateVariable={onUpdateVariable} />);

    const { options } = mockSimpleSelect.mock.calls[0][0];
    const upload = options.find((o: { key: string }) => o.key === SecretCategory.UPLOAD);
    expect(upload.label).toBe('Upload');
  });

  it('should render the "Existing secret" label for EXISTING option', () => {
    render(<EnvSecret onUpdate={onUpdate} onUpdateVariable={onUpdateVariable} />);

    const { options } = mockSimpleSelect.mock.calls[0][0];
    const existing = options.find((o: { key: string }) => o.key === SecretCategory.EXISTING);
    expect(existing.label).toBe('Existing secret');
  });

  it('should call onUpdateVariable to clear existingName when switching from EXISTING to another category', () => {
    const envWithExisting: EnvVariableData = {
      category: SecretCategory.EXISTING,
      data: [{ key: 'DB_HOST', value: '' }],
    };

    render(
      <EnvSecret env={envWithExisting} onUpdate={onUpdate} onUpdateVariable={onUpdateVariable} />,
    );

    const { onChange } = mockSimpleSelect.mock.calls[0][0];
    onChange(SecretCategory.GENERIC);

    expect(onUpdateVariable).toHaveBeenCalledWith({
      existingName: undefined,
      values: { category: SecretCategory.GENERIC, data: [] },
    });
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('should call onUpdateVariable to clear existingName when selecting EXISTING category', () => {
    render(<EnvSecret onUpdate={onUpdate} onUpdateVariable={onUpdateVariable} />);

    const { onChange } = mockSimpleSelect.mock.calls[0][0];
    onChange(SecretCategory.EXISTING);

    expect(onUpdateVariable).toHaveBeenCalledWith({
      existingName: undefined,
      values: { category: SecretCategory.EXISTING, data: [] },
    });
  });

  it('should fall back to onUpdate when onUpdateVariable is not provided', () => {
    const env: EnvVariableData = {
      category: SecretCategory.GENERIC,
      data: [{ key: 'KEY1', value: 'val1' }],
    };

    render(<EnvSecret env={env} onUpdate={onUpdate} />);

    const { onChange } = mockSimpleSelect.mock.calls[0][0];
    onChange(SecretCategory.UPLOAD);

    expect(onUpdate).toHaveBeenCalledWith({
      ...env,
      category: SecretCategory.UPLOAD,
      data: [],
    });
  });

  it('should render EnvExistingSecretField when EXISTING is selected', () => {
    const envExisting: EnvVariableData = {
      category: SecretCategory.EXISTING,
      data: [],
    };

    render(<EnvSecret env={envExisting} onUpdate={onUpdate} onUpdateVariable={onUpdateVariable} />);

    expect(screen.getByTestId('env-existing-secret-field')).toBeInTheDocument();
  });
});
