import * as React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { mockInferenceServiceK8sResource } from '#~/__mocks__/mockInferenceServiceK8sResource';
import InferenceServiceProject from '#~/pages/modelServing/screens/global/InferenceServiceProject';
import { ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { ProjectKind } from '#~/k8sTypes';

describe('InferenceServiceProject', () => {
  it('should render error if loading fails', () => {
    const result = render(
      <InferenceServiceProject inferenceService={mockInferenceServiceK8sResource({})} />,
      {
        wrapper: ({ children }) => (
          <ProjectsContext.Provider
            value={
              {
                loaded: true,
                loadError: new Error('test loading error'),
              } as React.ComponentProps<typeof ProjectsContext.Provider>['value']
            }
          >
            {children}
          </ProjectsContext.Provider>
        ),
      },
    );

    expect(result.queryByText(/test loading error/)).toBeInTheDocument();
  });

  it('should render modelmesh project', () => {
    const result = render(
      <InferenceServiceProject
        inferenceService={mockInferenceServiceK8sResource({
          namespace: 'my-project',
        })}
      />,
      {
        wrapper: ({ children }) => (
          <ProjectsContext.Provider
            value={
              {
                loaded: true,
                modelServingProjects: [
                  mockProjectK8sResource({
                    k8sName: 'my-project',
                    displayName: 'My Project',
                    enableModelMesh: true,
                  }),
                ],
              } as React.ComponentProps<typeof ProjectsContext.Provider>['value']
            }
          >
            {children}
          </ProjectsContext.Provider>
        ),
      },
    );

    expect(result.queryByText('My Project')).toBeInTheDocument();
    expect(result.queryByText('Multi-model serving enabled')).toBeInTheDocument();
  });

  it('should render kserve project', () => {
    const result = render(
      <InferenceServiceProject
        inferenceService={mockInferenceServiceK8sResource({
          namespace: 'my-project',
        })}
      />,
      {
        wrapper: ({ children }) => (
          <ProjectsContext.Provider
            value={
              {
                loaded: true,
                modelServingProjects: [
                  mockProjectK8sResource({
                    k8sName: 'my-project',
                    displayName: 'My Project',
                    enableModelMesh: false,
                  }),
                ],
              } as React.ComponentProps<typeof ProjectsContext.Provider>['value']
            }
          >
            {children}
          </ProjectsContext.Provider>
        ),
      },
    );

    expect(result.queryByText('My Project')).toBeInTheDocument();
    expect(result.queryByText('Single-model serving enabled')).toBeInTheDocument();
  });

  it('should render kserve project', () => {
    const result = render(
      <InferenceServiceProject
        inferenceService={mockInferenceServiceK8sResource({
          namespace: 'my-project',
        })}
      />,
      {
        wrapper: ({ children }) => (
          <ProjectsContext.Provider
            value={
              {
                loaded: true,
                modelServingProjects: [] as ProjectKind[],
              } as React.ComponentProps<typeof ProjectsContext.Provider>['value']
            }
          >
            {children}
          </ProjectsContext.Provider>
        ),
      },
    );

    expect(result.queryByText('My Project')).not.toBeInTheDocument();
    expect(result.queryByText('Unknown')).toBeInTheDocument();
    expect(result.queryByText('Single-model serving enabled')).not.toBeInTheDocument();
    expect(result.queryByText('Multi-model serving enabled')).not.toBeInTheDocument();
  });
});
