import { setServingRuntimeTemplate } from '#~/pages/modelServing/customServingRuntimes/utils';

describe('setServingRuntimeTemplate', () => {
  const mockSetData = jest.fn();
  const mockSetDisplayName = jest.fn();
  const mockResetModelFormat = jest.fn();

  const mockTemplate = {
    apiVersion: 'template.openshift.io/v1',
    kind: 'Template',
    metadata: {
      name: 'example-template',
      namespace: 'default',
      annotations: {
        'opendatahub.io/modelServingSupport': '["MULTI"]',
      },
      labels: {
        'opendatahub.io/dashboard': 'true',
      },
    },
    objects: [
      {
        apiVersion: 'serving.knative.dev/v1',
        kind: 'Service',
        metadata: {
          name: 'serving-runtime-object',
          annotations: {
            'openshift.io/display-name': 'Example Display Name',
          },
        },
        spec: {
          containers: [{}],
          supportedModelFormats: [{}],
        },
      },
    ],
    parameters: [],
  };

  it('should update data and call resetModelFormat when template and scope changed', () => {
    setServingRuntimeTemplate({
      template: mockTemplate,
      scope: 'namespace',
      currentScope: 'user',
      currentTemplateName: 'old-template',
      setData: mockSetData,
      setDisplayName: mockSetDisplayName,
      resetModelFormat: mockResetModelFormat,
    });

    expect(mockSetData).toHaveBeenCalledWith(
      'servingRuntimeTemplateName',
      'serving-runtime-object',
    );
    expect(mockSetData).toHaveBeenCalledWith('scope', 'namespace');
    expect(mockSetDisplayName).toHaveBeenCalledWith('Example Display Name');
    expect(mockResetModelFormat).toHaveBeenCalled();
  });
});
