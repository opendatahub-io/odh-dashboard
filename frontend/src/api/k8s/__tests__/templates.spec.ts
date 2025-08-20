import { K8sStatus, k8sDeleteResource } from '@openshift/dynamic-plugin-sdk-utils';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mock200Status, mock404Error } from '#~/__mocks__/mockK8sStatus';
import { mockServingRuntimeTemplateK8sResource } from '#~/__mocks__/mockServingRuntimeTemplateK8sResource';
import {
  assembleServingRuntimeTemplate,
  deleteTemplate,
  groupVersionKind,
  useTemplates,
} from '#~/api';
import { TemplateModel } from '#~/api/models';
import { K8sDSGResource, TemplateKind } from '#~/k8sTypes';
import useCustomServingRuntimesEnabled from '#~/pages/modelServing/customServingRuntimes/useCustomServingRuntimesEnabled';
import useModelServingEnabled from '#~/pages/modelServing/useModelServingEnabled';
import {
  ServingRuntimeAPIProtocol,
  ServingRuntimePlatform,
  ServingRuntimeModelType,
} from '#~/types';
import { genRandomChars } from '#~/utilities/string';
import useK8sWatchResourceList from '#~/utilities/useK8sWatchResourceList';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
  k8sDeleteResource: jest.fn(),
}));

jest.mock('#~/utilities/string', () => ({
  genRandomChars: jest.fn(),
}));

jest.mock('#~/utilities/useK8sWatchResourceList', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('#~/pages/modelServing/useModelServingEnabled', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('#~/pages/modelServing/customServingRuntimes/useCustomServingRuntimesEnabled', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const useModelServingEnabledMock = jest.mocked(useModelServingEnabled);
const useCustomServingRuntimesEnabledMock = jest.mocked(useCustomServingRuntimesEnabled);
const genRandomCharsMock = jest.mocked(genRandomChars);
const k8sDeleteResourceMock = jest.mocked(k8sDeleteResource<TemplateKind, K8sStatus>);
const useK8sWatchResourceListMock = jest.mocked(useK8sWatchResourceList<TemplateKind[]>);

const templateMock = mockServingRuntimeTemplateK8sResource({});
const { namespace } = templateMock.metadata;
const servingRuntime = templateMock.objects[0];

const createServingRuntime = (name: string): K8sDSGResource => ({
  ...servingRuntime,
  metadata: { ...servingRuntime.metadata, name },
});

describe('assembleServingRuntimeTemplate', () => {
  it('should assemble serving runtime template with templateName', () => {
    const servingRuntimeMock = JSON.stringify(createServingRuntime('template-1'));
    const servingRuntimeTemplatesMock = mockServingRuntimeTemplateK8sResource({
      platforms: [ServingRuntimePlatform.MULTI],
    });
    const result = assembleServingRuntimeTemplate(
      servingRuntimeMock,
      namespace,
      [ServingRuntimePlatform.MULTI],
      ServingRuntimeAPIProtocol.REST,
      [ServingRuntimeModelType.PREDICTIVE, ServingRuntimeModelType.GENERATIVE],
      'template-1',
    );
    expect(result).toStrictEqual(servingRuntimeTemplatesMock);
  });

  it('should assemble serving runtime template without templateName', () => {
    genRandomCharsMock.mockReturnValue('123');
    const servingRuntimeMock = JSON.stringify(createServingRuntime('template-123'));
    const servingRuntimeTemplatesMock = mockServingRuntimeTemplateK8sResource({
      name: 'template-123',
      platforms: [ServingRuntimePlatform.MULTI],
    });

    const result = assembleServingRuntimeTemplate(
      servingRuntimeMock,
      namespace,
      [ServingRuntimePlatform.MULTI],
      ServingRuntimeAPIProtocol.REST,
      [ServingRuntimeModelType.PREDICTIVE, ServingRuntimeModelType.GENERATIVE],
    );
    expect(result).toStrictEqual(servingRuntimeTemplatesMock);
  });

  it('should throw an error when servingRuntime name doesnt exist', () => {
    const servingRuntimeMock = JSON.stringify(createServingRuntime(''));
    expect(() => {
      assembleServingRuntimeTemplate(
        servingRuntimeMock,
        namespace,
        [ServingRuntimePlatform.MULTI],
        ServingRuntimeAPIProtocol.REST,
        [ServingRuntimeModelType.PREDICTIVE],
      );
    }).toThrow('Serving runtime name is required');
  });
});

describe('useTemplates', () => {
  it('should wrap useK8sWatchResource to watch templates', () => {
    useModelServingEnabledMock.mockReturnValue(true);
    useCustomServingRuntimesEnabledMock.mockReturnValue(true);
    const mockReturnValue: ReturnType<typeof useK8sWatchResourceListMock> = [[], false, undefined];
    useK8sWatchResourceListMock.mockReturnValue(mockReturnValue);
    const { result } = testHook(useTemplates)(namespace);
    expect(result.current).toStrictEqual(mockReturnValue);
    expect(useK8sWatchResourceListMock).toHaveBeenCalledWith(
      {
        isList: true,
        groupVersionKind: groupVersionKind(TemplateModel),
        namespace,
        selector: {
          matchLabels: {
            'opendatahub.io/dashboard': 'true',
          },
        },
      },
      TemplateModel,
    );
  });

  it('should throw error when namespace is not provided', () => {
    useModelServingEnabledMock.mockReturnValue(true);
    useCustomServingRuntimesEnabledMock.mockReturnValue(true);
    const mockReturnValue: ReturnType<typeof useK8sWatchResourceListMock> = [[], false, undefined];
    useK8sWatchResourceListMock.mockReturnValue(mockReturnValue);
    const { result } = testHook(useTemplates)();
    expect(result.current).toStrictEqual(mockReturnValue);
  });

  it('should throw error when model serving is not enabled', () => {
    useModelServingEnabledMock.mockReturnValue(false);
    useCustomServingRuntimesEnabledMock.mockReturnValue(true);
    const mockReturnValue: ReturnType<typeof useK8sWatchResourceListMock> = [[], false, undefined];
    useK8sWatchResourceListMock.mockReturnValue(mockReturnValue);
    const { result } = testHook(useTemplates)(namespace);
    expect(result.current).toStrictEqual(mockReturnValue);
  });

  it('should return empty array when template data is undefined', () => {
    useModelServingEnabledMock.mockReturnValue(false);
    useCustomServingRuntimesEnabledMock.mockReturnValue(true);
    const mockReturnValue: ReturnType<typeof useK8sWatchResourceListMock> = [[], false, undefined];
    useK8sWatchResourceListMock.mockReturnValue(mockReturnValue);
    const { result } = testHook(useTemplates)(namespace);
    expect(result.current).toStrictEqual(mockReturnValue);
  });

  it('should filter templates when custom serving runtime is not enabled', () => {
    const templatesMock = {
      ...templateMock,
      metadata: { ...templateMock.metadata, labels: { 'opendatahub.io/ootb': 'true' } },
    };
    useModelServingEnabledMock.mockReturnValue(true);
    useCustomServingRuntimesEnabledMock.mockReturnValue(false);
    const mockReturnValue: ReturnType<typeof useK8sWatchResourceListMock> = [
      [templatesMock],
      false,
      undefined,
    ];
    useK8sWatchResourceListMock.mockReturnValue(mockReturnValue);
    const { result } = testHook(useTemplates)(namespace);
    expect(result.current).toStrictEqual(mockReturnValue);
    expect(useK8sWatchResourceListMock).toHaveBeenCalledWith(
      {
        isList: true,
        groupVersionKind: groupVersionKind(TemplateModel),
        namespace,
        selector: {
          matchLabels: {
            'opendatahub.io/dashboard': 'true',
          },
        },
      },
      TemplateModel,
    );
  });
});

describe('deleteTemplate', () => {
  it('should return status as Success', async () => {
    const mockK8sStatus = mock200Status({});
    k8sDeleteResourceMock.mockResolvedValue(mockK8sStatus);
    const result = await deleteTemplate('name', namespace);
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      model: TemplateModel,
      queryOptions: { name: 'name', ns: namespace },
    });
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(mockK8sStatus);
  });

  it('should return status as Failure', async () => {
    const mockK8sStatus = mock404Error({});
    k8sDeleteResourceMock.mockResolvedValue(mockK8sStatus);
    const result = await deleteTemplate('name', namespace);
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      model: TemplateModel,
      queryOptions: { name: 'name', ns: namespace },
    });
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(mockK8sStatus);
  });

  it('should handle errors and rethrow', async () => {
    k8sDeleteResourceMock.mockRejectedValue(new Error('error1'));
    await expect(deleteTemplate('name', namespace)).rejects.toThrow('error1');
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      model: TemplateModel,
      queryOptions: { name: 'name', ns: namespace },
    });
  });
});
