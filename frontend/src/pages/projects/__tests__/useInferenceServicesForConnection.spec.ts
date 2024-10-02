import React from 'react';
import { mockInferenceServiceK8sResource } from '~/__mocks__';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { useInferenceServicesForConnection } from '~/pages/projects/useInferenceServicesForConnection';
import { mockConnection } from '~/__mocks__/mockConnection';

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
    useContextMock.mockReturnValue({ inferenceServices: { data: mockInferenceServices } });
  });

  it('should return matching inference services', () => {
    const renderResult = testHook(useInferenceServicesForConnection)(connection);
    expect(renderResult.result.current).toHaveLength(1);
  });
});
