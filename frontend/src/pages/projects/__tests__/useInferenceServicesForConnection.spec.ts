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
});
