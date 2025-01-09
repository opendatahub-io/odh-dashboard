import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { mockDashboardConfig, mockK8sResourceList } from '~/__mocks__';
import { mockServingRuntimeK8sResource } from '~/__mocks__/mockServingRuntimeK8sResource';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { useAccessReview } from '~/api';
import { useAppContext } from '~/app/AppContext';
import { ServingRuntimeKind } from '~/k8sTypes';
import useProjectErrorForRegisteredModel from '~/pages/modelRegistry/screens/RegisteredModels/useProjectErrorForRegisteredModel';
import { ServingRuntimePlatform } from '~/types';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
}));

// Mock the API functions
jest.mock('~/api', () => ({
  ...jest.requireActual('~/api'),
  useAccessReview: jest.fn(),
}));

jest.mock('~/pages/modelServing/useServingPlatformStatuses', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('~/app/AppContext', () => ({
  __esModule: true,
  useAppContext: jest.fn(),
}));

const useAppContextMock = jest.mocked(useAppContext);
const k8sListResourceMock = jest.mocked(k8sListResource<ServingRuntimeKind>);
const useAccessReviewMock = jest.mocked(useAccessReview);

describe('useProjectErrorForRegisteredModel', () => {
  beforeEach(() => {
    useAppContextMock.mockReturnValue({
      buildStatuses: [],
      dashboardConfig: mockDashboardConfig({}),
      storageClasses: [],
      isRHOAI: false,
      favoriteProjects: [],
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      setFavoriteProjects: () => {},
    });
    useAccessReviewMock.mockReturnValue([true, true]);
  });
  it('should return undefined when the project is not selected', async () => {
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([]));
    const renderResult = testHook(useProjectErrorForRegisteredModel)(undefined, undefined);
    // wait for update
    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual({ loaded: true, error: undefined });
  });

  it('should return undefined when only kServe is supported', async () => {
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([]));
    const renderResult = testHook(useProjectErrorForRegisteredModel)(
      'test-project',
      ServingRuntimePlatform.SINGLE,
    );
    // wait for update
    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual({ loaded: true, error: undefined });
  });

  it('should return undefined when only modelMesh is supported with server deployed', async () => {
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([mockServingRuntimeK8sResource({})]));
    const renderResult = testHook(useProjectErrorForRegisteredModel)(
      'test-project',
      ServingRuntimePlatform.MULTI,
    );
    // wait for update
    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual({ loaded: true, error: undefined });
  });

  it('should return error when only modelMesh is supported with no server deployed', async () => {
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([]));
    const renderResult = testHook(useProjectErrorForRegisteredModel)(
      'test-project',
      ServingRuntimePlatform.MULTI,
    );
    // wait for update
    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual({
      loaded: true,
      error: new Error('Cannot deploy the model until you configure a model server'),
    });
  });

  it('should return error when platform is not selected', async () => {
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([]));
    const renderResult = testHook(useProjectErrorForRegisteredModel)('test-project', undefined);
    // wait for update
    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual({
      loaded: true,
      error: new Error('Cannot deploy the model until you select a model serving platform'),
    });
  });
});
