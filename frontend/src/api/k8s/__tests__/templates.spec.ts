import { K8sStatus, k8sDeleteResource, k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mock200Status, mock404Error } from '~/__mocks__/mockK8sStatus';

import { mockServingRuntimeTemplateK8sResource } from '~/__mocks__/mockServingRuntimeTemplateK8sResource';
import { assembleServingRuntimeTemplate, deleteTemplate, listTemplates } from '~/api';
import { TemplateModel } from '~/api/models';
import { K8sDSGResource, TemplateKind } from '~/k8sTypes';
import { ServingRuntimeAPIProtocol, ServingRuntimePlatform } from '~/types';
import { genRandomChars } from '~/utilities/string';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
  k8sDeleteResource: jest.fn(),
}));

jest.mock('~/utilities/string', () => ({
  genRandomChars: jest.fn(),
}));

const k8sListResourceMock = jest.mocked(k8sListResource<TemplateKind>);
const genRandomCharsMock = jest.mocked(genRandomChars);
const k8sDeleteResourceMock = jest.mocked(k8sDeleteResource<TemplateKind, K8sStatus>);

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
    const result = assembleServingRuntimeTemplate(
      servingRuntimeMock,
      namespace,
      [ServingRuntimePlatform.MULTI],
      ServingRuntimeAPIProtocol.REST,
      'template-1',
    );
    expect(result).toStrictEqual(
      mockServingRuntimeTemplateK8sResource({ platforms: [ServingRuntimePlatform.MULTI] }),
    );
  });
  it('should assemble serving runtime template without templateName', () => {
    genRandomCharsMock.mockReturnValue('123');
    const servingRuntimeMock = JSON.stringify(createServingRuntime('template-123'));
    const result = assembleServingRuntimeTemplate(
      servingRuntimeMock,
      namespace,
      [ServingRuntimePlatform.MULTI],
      ServingRuntimeAPIProtocol.REST,
    );
    expect(result).toStrictEqual(
      mockServingRuntimeTemplateK8sResource({
        name: 'template-123',
        platforms: [ServingRuntimePlatform.MULTI],
      }),
    );
  });

  it('should throw an error when servingRuntime name doesnt exist', () => {
    const servingRuntimeMock = JSON.stringify(createServingRuntime(''));
    expect(() => {
      assembleServingRuntimeTemplate(
        servingRuntimeMock,
        namespace,
        [ServingRuntimePlatform.MULTI],
        ServingRuntimeAPIProtocol.REST,
      );
    }).toThrow('Serving runtime name is required');
  });
});

describe('listTemplates', () => {
  it('should list templates without namespace and label selector', async () => {
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([templateMock]));
    const result = await listTemplates();
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: TemplateModel,
      queryOptions: {},
    });
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual([templateMock]);
  });

  it('should list templates with namespace and label selector', async () => {
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([templateMock]));
    const result = await listTemplates(namespace, 'labelSelector');
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: TemplateModel,
      queryOptions: { ns: namespace, queryParams: { labelSelector: 'labelSelector' } },
    });
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual([templateMock]);
  });

  it('should handle errors and rethrow', async () => {
    k8sListResourceMock.mockRejectedValue(new Error('error1'));
    await expect(listTemplates()).rejects.toThrow('error1');
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: TemplateModel,
      queryOptions: {},
    });
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
