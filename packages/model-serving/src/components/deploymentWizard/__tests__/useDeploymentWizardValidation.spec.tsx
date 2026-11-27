import * as React from 'react';
import { renderHook } from '@testing-library/react';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import {
  ProjectsContext,
  type ProjectsContextType,
} from '@odh-dashboard/ui-core/context/ProjectsContext';
import { useModelDeploymentWizardValidation } from '../useDeploymentWizardValidation';
import type { WizardFormData } from '../../../shared/types/form-data';

jest.mock('@odh-dashboard/ui-core/hooks/useZodFormValidation', () => ({
  useZodFormValidation: () => ({ getFieldValidation: () => [] }),
}));
jest.mock('@odh-dashboard/ui-core/utilities/useValidation', () => ({
  useValidation: () => ({ getAllValidationIssues: () => ({}) }),
}));
jest.mock('@odh-dashboard/k8s-core', () => ({
  ...jest.requireActual('@odh-dashboard/k8s-core'),
  isK8sNameDescriptionDataValid: () => true,
}));

const project = (name: string): ProjectKind => ({
  apiVersion: 'v1',
  kind: 'Namespace',
  metadata: { name },
  status: { phase: 'Active' },
});

// Every step besides the project is mocked valid, so only the project decides.
const stateFor = (projectName: string): WizardFormData['state'] =>
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  new Proxy(
    {
      project: { projectName, setProjectName: jest.fn() },
      hardwareProfileConfig: { formData: {} },
    },
    {
      get: (target: Record<string, unknown>, key: string) =>
        key in target ? target[key] : { data: undefined },
    },
  ) as unknown as WizardFormData['state'];

const renderValidation = (
  projectName: string,
  deploymentTargetProjects: ProjectKind[] | undefined,
  isEdit = false,
) => {
  const context: ProjectsContextType = {
    projects: [project('targets'), project('revoked')],
    modelServingProjects: [],
    nonActiveProjects: [],
    deploymentTargetProjects,
    preferredProject: null,
    updatePreferredProject: jest.fn(),
    waitForProject: jest.fn(),
    loaded: true,
    loadError: undefined,
  };
  const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
    <ProjectsContext.Provider value={context}>{children}</ProjectsContext.Provider>
  );
  return renderHook(
    () => useModelDeploymentWizardValidation(stateFor(projectName), [], true, isEdit),
    { wrapper },
  ).result.current;
};

describe('useModelDeploymentWizardValidation', () => {
  it('should accept a new deployment in a current deploy target', () => {
    const validation = renderValidation('targets', [project('targets')]);
    expect(validation.isPreconfigureStepValid).toBe(true);
    expect(validation.isModelDeploymentStepValid).toBe(true);
  });

  it('should reject a new deployment whose project is no longer a deploy target', () => {
    const validation = renderValidation('revoked', [project('targets')]);
    expect(validation.isPreconfigureStepValid).toBe(false);
    expect(validation.isModelDeploymentStepValid).toBe(false);
    expect(validation.isAllValid).toBe(false);
  });

  it('should keep editing an existing deployment in its own project', () => {
    const validation = renderValidation('revoked', [project('targets')], true);
    expect(validation.isModelDeploymentStepValid).toBe(true);
  });

  it('should accept any named project when the host sets no deploy targets', () => {
    expect(renderValidation('revoked', undefined).isModelDeploymentStepValid).toBe(true);
  });
});
