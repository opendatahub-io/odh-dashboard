import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useAccessReview } from '#~/api';
import {
  ProjectDetailsContext,
  ProjectDetailsContextType,
} from '#~/pages/projects/ProjectDetailsContext';
import { EnvironmentVariableType, SecretCategory } from '#~/pages/projects/types';
import type { EnvVariable } from '#~/pages/projects/types';
import EnvSecret from '#~/pages/projects/screens/spawner/environmentVariables/EnvSecret';

jest.mock('#~/api/useAccessReview', () => ({
  useAccessReview: jest.fn(),
}));

jest.mock('#~/pages/projects/screens/spawner/environmentVariables/EnvExistingSecret', () => {
  const MockEnvExistingSecret: React.FC = () => (
    <div data-testid="env-existing-secret-mock">EnvExistingSecret</div>
  );
  MockEnvExistingSecret.displayName = 'MockEnvExistingSecret';
  return { __esModule: true, default: MockEnvExistingSecret };
});

const mockUseAccessReview = jest.mocked(useAccessReview);

const mockContextValue = {
  currentProject: { metadata: { name: 'test-ns' } },
} as unknown as ProjectDetailsContextType;

const renderWithContext = (ui: React.ReactElement) =>
  render(
    <ProjectDetailsContext.Provider value={mockContextValue}>{ui}</ProjectDetailsContext.Provider>,
  );

describe('EnvSecret', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccessReview.mockReturnValue([true, true]);
  });

  it('should render three radio buttons for Key/value, Upload, and Existing secret', () => {
    const envVariable: EnvVariable = {
      type: EnvironmentVariableType.SECRET,
      values: { category: SecretCategory.GENERIC, data: [] },
    };
    renderWithContext(<EnvSecret envVariable={envVariable} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('secret-category-key-value')).toBeInTheDocument();
    expect(screen.getByTestId('secret-category-upload')).toBeInTheDocument();
    expect(screen.getByTestId('secret-category-existing')).toBeInTheDocument();
  });

  it('should call onUpdate with EXISTING category when Existing secret radio is clicked', () => {
    const onUpdate = jest.fn();
    const envVariable: EnvVariable = {
      type: EnvironmentVariableType.SECRET,
      values: { category: SecretCategory.GENERIC, data: [] },
    };
    renderWithContext(<EnvSecret envVariable={envVariable} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByTestId('secret-category-existing'));
    expect(onUpdate).toHaveBeenCalledTimes(1);
    const updatedEnv = onUpdate.mock.calls[0][0] as EnvVariable;
    expect(updatedEnv.values?.category).toBe(SecretCategory.EXISTING);
  });

  it('should disable existing secret radio when RBAC check denies access', () => {
    mockUseAccessReview.mockReturnValue([false, true]);
    const envVariable: EnvVariable = {
      type: EnvironmentVariableType.SECRET,
      values: { category: SecretCategory.GENERIC, data: [] },
    };
    renderWithContext(<EnvSecret envVariable={envVariable} onUpdate={jest.fn()} />);
    const existingRadio = screen.getByTestId('secret-category-existing');
    expect(existingRadio).toBeDisabled();
  });
});
