import React from 'react';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockDashboardConfig } from '#~/__mocks__';
import { mockServingRuntimeK8sResource } from '#~/__mocks__/mockServingRuntimeK8sResource';
import { useAccessReview } from '#~/api';
import { useAppContext } from '#~/app/AppContext';
import { ServingRuntimeKind } from '#~/k8sTypes';
import { ModelServingContextType } from '#~/pages/modelServing/ModelServingContext';
import useProjectErrorForPrefilledModel from '#~/pages/modelServing/screens/projects/useProjectErrorForPrefilledModel';
import { ServingRuntimePlatform } from '#~/types';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
}));

// Mock the API functions
jest.mock('#~/api', () => ({
  ...jest.requireActual('#~/api'),
  useAccessReview: jest.fn(),
}));

jest.mock('#~/pages/modelServing/useServingPlatformStatuses', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('#~/app/AppContext', () => ({
  __esModule: true,
  useAppContext: jest.fn(),
}));

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}));

const useContextMock = React.useContext as jest.Mock;
const mockServingRuntimesFromContext = (data: ServingRuntimeKind[]) => {
  useContextMock.mockReturnValue({
    servingRuntimes: {
      data: { items: data, hasNonDashboardItems: false },
      loaded: true,
      error: undefined,
    } satisfies Pick<ModelServingContextType['servingRuntimes'], 'data' | 'loaded' | 'error'>,
  });
};

const useAppContextMock = jest.mocked(useAppContext);
const useAccessReviewMock = jest.mocked(useAccessReview);

describe('useProjectErrorForPrefilledModel', () => {
  beforeEach(() => {
    useAppContextMock.mockReturnValue({
      buildStatuses: [],
      dashboardConfig: mockDashboardConfig({}),
      storageClasses: [],
      isRHOAI: false,
    });
    useAccessReviewMock.mockReturnValue([true, true]);
  });
  it('should return undefined when the project is not selected', async () => {
    mockServingRuntimesFromContext([]);
    const renderResult = testHook(useProjectErrorForPrefilledModel)(undefined, undefined);
    expect(renderResult).hookToStrictEqual({ loaded: true, error: undefined });
  });

  it('should return undefined when only kServe is supported', async () => {
    mockServingRuntimesFromContext([]);
    const renderResult = testHook(useProjectErrorForPrefilledModel)(
      'test-project',
      ServingRuntimePlatform.SINGLE,
    );
    expect(renderResult).hookToStrictEqual({ loaded: true, error: undefined });
  });

  it('should return undefined when only modelMesh is supported with server deployed', async () => {
    mockServingRuntimesFromContext([mockServingRuntimeK8sResource({})]);
    const renderResult = testHook(useProjectErrorForPrefilledModel)(
      'test-project',
      ServingRuntimePlatform.MULTI,
    );
    expect(renderResult).hookToStrictEqual({ loaded: true, error: undefined });
  });

  it('should return error when only modelMesh is supported with no server deployed', async () => {
    mockServingRuntimesFromContext([]);
    const renderResult = testHook(useProjectErrorForPrefilledModel)(
      'test-project',
      ServingRuntimePlatform.MULTI,
    );
    expect(renderResult).hookToStrictEqual({
      loaded: true,
      error: new Error('To deploy a model, you must first configure a model server.'),
    });
  });

  it('should return error when platform is not selected', async () => {
    mockServingRuntimesFromContext([]);
    const renderResult = testHook(useProjectErrorForPrefilledModel)('test-project', undefined);
    expect(renderResult).hookToStrictEqual({
      loaded: true,
      error: new Error(
        'To deploy a model, you must first select a model serving platform for this project.',
      ),
    });
  });
});
