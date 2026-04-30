import React from 'react';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockInferenceServiceK8sResource } from '#~/__mocks__';
import { useInferenceServicesForConnection } from '#~/pages/projects/useInferenceServicesForConnection';
import { ProjectDetailsContextType } from '#~/pages/projects/ProjectDetailsContext';
import { mockConnection } from '#~/__mocks__/mockConnection';

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}));

const useContextMock = React.useContext as jest.Mock;

const connection = mockConnection({
  name: 'connection1',
  displayName: 'Connection 1',
  description: 'desc1',
});

const mockInferenceServices = [
  mockInferenceServiceK8sResource({
    name: 'item-1',
    displayName: 'Item 1',
    secretName: 'connection1',
  }),
  mockInferenceServiceK8sResource({
    name: 'item-2',
    displayName: 'Item 2',
    secretName: 'connection2',
  }),
];

describe('useInferenceServicesForConnection', () => {
  beforeEach(() => {
    useContextMock.mockReturnValue({
      inferenceServices: {
        data: { items: mockInferenceServices, hasNonDashboardItems: false },
        loaded: true,
        refresh: jest.fn(),
      },
    } satisfies Pick<ProjectDetailsContextType, 'inferenceServices'>);
  });

  it('should return matching inference services', () => {
    const renderResult = testHook(useInferenceServicesForConnection)(connection);
    expect(renderResult.result.current).toHaveLength(1);
  });

  it('should match connections via the opendatahub.io/connections annotation', () => {
    const uriConnection = mockConnection({
      name: 'uri-connection',
      displayName: 'URI Connection',
      connectionType: 'uri-v1',
      data: { URI: btoa('https://example.com/model') },
    });

    const uriInferenceServices = [
      mockInferenceServiceK8sResource({
        name: 'uri-model',
        displayName: 'URI Model',
        secretName: 'uri-connection',
        storageUri: 'https://example.com/model',
      }),
      mockInferenceServiceK8sResource({
        name: 'other-model',
        displayName: 'Other Model',
        secretName: 'other-connection',
      }),
    ];

    useContextMock.mockReturnValue({
      inferenceServices: {
        data: { items: uriInferenceServices, hasNonDashboardItems: false },
        loaded: true,
        refresh: jest.fn(),
      },
    } satisfies Pick<ProjectDetailsContextType, 'inferenceServices'>);

    const renderResult = testHook(useInferenceServicesForConnection)(uriConnection);
    expect(renderResult.result.current).toHaveLength(1);
    expect(renderResult.result.current[0].metadata.name).toBe('uri-model');
  });

  it('should return empty array when no connection is provided', () => {
    const renderResult = testHook(useInferenceServicesForConnection)(undefined);
    expect(renderResult.result.current).toHaveLength(0);
  });
});
