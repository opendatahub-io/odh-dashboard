import * as React from 'react';
import { render, screen, fireEvent, RenderResult } from '@testing-library/react';
import { ProjectKind, InferenceServiceKind } from '#~/k8sTypes';
import { DEFAULT_LIST_FETCH_STATE } from '#~/utilities/const';
import { LMEvalContext } from '#~/pages/lmEval/global/LMEvalContext';
import LMEvalForm from '#~/pages/lmEval/lmEvalForm/LMEvalForm';
import { mockInferenceServices } from './mockInferenceServicesData';

// Helper function to create a mock project
export const createMockProject = (namespace: string): ProjectKind => ({
  apiVersion: 'v1',
  kind: 'Project',
  metadata: {
    name: namespace,
    namespace,
  },
  status: {
    phase: 'Active',
  },
});

// Helper function to render LMEvalForm with context
export const renderWithContext = (namespace?: string): RenderResult => {
  const project = namespace ? createMockProject(namespace) : null;

  const mockContextValue = {
    lmEval: DEFAULT_LIST_FETCH_STATE,
    project,
    preferredProject: project,
    projects: project ? [project] : [],
  };

  return render(
    <LMEvalContext.Provider value={mockContextValue}>
      <LMEvalForm />
    </LMEvalContext.Provider>,
  );
};

// Helper function to create mock inference services with URLs
export const createMockServicesWithUrls = (): InferenceServiceKind[] =>
  mockInferenceServices.map((service) => ({
    ...service,
    status: {
      ...service.status,
      url: `https://${service.metadata.name}.apps.example.com`,
    },
  }));

// Default state for LMGenericObjectState
export const defaultLMEvalFormState = {
  deployedModelName: '',
  evaluationName: '',
  tasks: [],
  modelType: '',
  allowRemoteCode: false,
  allowOnline: false,
  model: {
    name: '',
    url: '',
    tokenizedRequest: 'False',
    tokenizer: '',
  },
};

// Helper function to open model dropdown and select a model
export const selectModel = async (modelName: string): Promise<void> => {
  const modelDropdown = screen.getByLabelText('Model options menu');
  fireEvent.click(modelDropdown);
  const modelOption = screen.getByText(modelName);
  fireEvent.click(modelOption);
};

// Helper function to open model type dropdown and select a type
export const selectModelType = (typeName: string): void => {
  const modelTypeDropdown = screen.getByLabelText('Options menu');
  fireEvent.click(modelTypeDropdown);
  const typeOption = screen.getByText(typeName);
  fireEvent.click(typeOption);
};
