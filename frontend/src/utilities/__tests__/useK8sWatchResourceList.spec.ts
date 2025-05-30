import { WatchK8sResource, useK8sWatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { testHook } from '#~/__tests__/unit/testUtils/hooks';
import { TemplateModel, groupVersionKind } from '#~/api';
import useK8sWatchResourceList from '#~/utilities/useK8sWatchResourceList';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  useK8sWatchResource: jest.fn(),
}));

const useK8sWatchResourceMock = useK8sWatchResource as jest.Mock;

const namespace = 'opendatahub';

describe('useK8sWatchResourceList', () => {
  it('should wrap useK8sWatchResource', () => {
    const mockReturnValue: ReturnType<typeof useK8sWatchResourceMock> = [[], false, undefined];
    useK8sWatchResourceMock.mockReturnValue(mockReturnValue);
    const initResource: WatchK8sResource | null = {
      isList: true,
      groupVersionKind: groupVersionKind(TemplateModel),
      namespace,
    };
    const renderResult = testHook(useK8sWatchResourceList)(initResource, TemplateModel);
    useK8sWatchResourceMock.mockReturnValue(mockReturnValue);
    expect(renderResult.result.current).toStrictEqual(mockReturnValue);
  });

  it('should return empty array when initResource is null', () => {
    const mockReturnValue: ReturnType<typeof useK8sWatchResourceMock> = [
      undefined,
      false,
      undefined,
    ];
    useK8sWatchResourceMock.mockReturnValue(mockReturnValue);
    const initResource: WatchK8sResource | null = null;
    const renderResult = testHook(useK8sWatchResourceList)(initResource, TemplateModel);
    useK8sWatchResourceMock.mockReturnValue(mockReturnValue);
    expect(renderResult.result.current).toStrictEqual([[], false, undefined]);
  });

  it('should return error when it is instance of error', () => {
    const mockReturnValue: ReturnType<typeof useK8sWatchResourceMock> = [
      [],
      false,
      new Error('error'),
    ];
    useK8sWatchResourceMock.mockReturnValue(mockReturnValue);
    const initResource: WatchK8sResource | null = {
      isList: true,
      groupVersionKind: groupVersionKind(TemplateModel),
      namespace,
    };
    const renderResult = testHook(useK8sWatchResourceList)(initResource, TemplateModel);
    useK8sWatchResourceMock.mockReturnValue(mockReturnValue);
    expect(renderResult.result.current).toStrictEqual(mockReturnValue);
  });

  it('should return error object when it is not instance of error', () => {
    const mockReturnValue: ReturnType<typeof useK8sWatchResourceMock> = [[], false, 'error'];
    useK8sWatchResourceMock.mockReturnValue(mockReturnValue);
    const initResource: WatchK8sResource | null = {
      isList: true,
      groupVersionKind: groupVersionKind(TemplateModel),
      namespace,
    };
    const renderResult = testHook(useK8sWatchResourceList)(initResource, TemplateModel);
    useK8sWatchResourceMock.mockReturnValue(mockReturnValue);
    expect(renderResult.result.current).toStrictEqual([
      [],
      false,
      new Error('Unknown error occured'),
    ]);
  });

  it('should return undefined when error is an empty string', () => {
    const mockReturnValue: ReturnType<typeof useK8sWatchResourceMock> = [[], false, ''];
    useK8sWatchResourceMock.mockReturnValue(mockReturnValue);
    const initResource: WatchK8sResource | null = {
      isList: true,
      groupVersionKind: groupVersionKind(TemplateModel),
      namespace,
    };
    const renderResult = testHook(useK8sWatchResourceList)(initResource, TemplateModel);
    useK8sWatchResourceMock.mockReturnValue(mockReturnValue);
    expect(renderResult.result.current).toStrictEqual([[], false, undefined]);
  });
});
