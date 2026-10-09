import { mockServingRuntimeTemplateK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeTemplateK8sResource';
import { parseServingRuntimeTemplate } from '../parseServingRuntimeTemplate';

const source = () => mockServingRuntimeTemplateK8sResource({ name: 'runtime-from-library' });

describe('parseServingRuntimeTemplate', () => {
  it('should decode a full Template and preserve its ServingRuntime and annotations', () => {
    const template = source();
    expect(parseServingRuntimeTemplate(JSON.stringify(template))).toEqual(template);
  });

  it('should strip server-assigned metadata on the nested ServingRuntime without mutating source', () => {
    const template = source();
    const original = {
      ...template,
      objects: [
        {
          ...template.objects[0],
          metadata: {
            ...template.objects[0].metadata,
            uid: 'server-uid',
            resourceVersion: '42',
            managedFields: [],
          },
        },
      ],
    };
    const result = parseServingRuntimeTemplate(JSON.stringify(original));
    expect(result.objects[0].metadata).not.toHaveProperty('uid');
    expect(result.objects[0].metadata).not.toHaveProperty('resourceVersion');
    expect(result.objects[0].metadata).not.toHaveProperty('managedFields');
    expect(original.objects[0].metadata.uid).toBe('server-uid');
  });

  it.each(['{bad', 'null', '[]', '{}', '{"kind":"ConfigMap"}'])(
    'should reject invalid JSON or a non-Template source: %s',
    (input) => {
      expect(() => parseServingRuntimeTemplate(input)).toThrow();
    },
  );

  it('should reject a missing, wrong-kind, unnamed, or malformed first object', () => {
    const template = source();
    const inputs = [
      { ...template, objects: [] },
      { ...template, objects: [{ kind: 'ConfigMap' }] },
      { ...template, objects: [{ ...template.objects[0], metadata: {} }] },
      { ...template, objects: [{ ...template.objects[0], spec: {} }] },
    ];
    inputs.forEach((input) => {
      expect(() => parseServingRuntimeTemplate(JSON.stringify(input))).toThrow();
    });
  });

  it('should leave missing and malformed protocol/model-type annotations unselected by existing helpers', () => {
    const template = source();
    const parsed = parseServingRuntimeTemplate(
      JSON.stringify({
        ...template,
        metadata: {
          ...template.metadata,
          annotations: { 'opendatahub.io/apiProtocol': 12, 'opendatahub.io/model-type': [] },
        },
      }),
    );
    expect(parsed.metadata.annotations?.['opendatahub.io/apiProtocol']).toBeUndefined();
    expect(parsed.metadata.annotations?.['opendatahub.io/model-type']).toBeUndefined();
  });
});
