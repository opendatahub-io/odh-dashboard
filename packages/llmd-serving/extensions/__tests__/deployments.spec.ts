import fullExtensions from '../index';
import deployments from '../deployments';

describe('LLM-d deployment extension entry point', () => {
  it('should keep the lifecycle, YAML assembly, gateway and tracking integrations', () => {
    expect(deployments.map((extension) => extension.type)).toEqual(
      expect.arrayContaining([
        'app.area',
        'model-serving.platform/watch-deployments',
        'model-serving.deployed-model/serving-runtime',
        'model-serving.deployment/form-data',
        'model-serving.platform/delete-deployment',
        'model-serving.deployment/deploy',
        'model-serving.deployment/assemble-model-resource',
        'model-serving.deployment/tracking-properties',
      ]),
    );
    const gateway = deployments.filter(
      (extension) =>
        'fieldId' in extension.properties &&
        extension.properties.fieldId === 'llmd-serving/gateway',
    );
    expect(gateway.map((extension) => extension.type)).toEqual([
      'model-serving.deployment/wizard-field-apply',
      'model-serving.deployment/wizard-field-extractor',
    ]);
    gateway.forEach((extension) =>
      expect(extension.flags).toEqual({
        required: ['llmd-serving', 'llmd-gateway-field'],
      }),
    );
  });

  it('should omit administration, runtime installation and optional topology or MaaS features', () => {
    expect(
      deployments.every(
        (extension) => !extension.type.startsWith('app.') || extension.type === 'app.area',
      ),
    ).toBe(true);
    expect(
      deployments.some(
        (extension) =>
          extension.type === 'model-serving.runtime-image/install-target' ||
          extension.type === 'model-serving.deployments-table/start-stop-action',
      ),
    ).toBe(false);
    const fields = deployments.flatMap((extension) =>
      'fieldId' in extension.properties ? [extension.properties.fieldId] : [],
    );
    expect(fields).toEqual(['llmd-serving/gateway', 'llmd-serving/gateway', 'deploymentMethod']);
    expect(
      deployments.some(
        (extension) =>
          extension.flags?.required?.includes('vllm-on-maas') ||
          extension.flags?.required?.includes('ADMIN_USER'),
      ),
    ).toBe(false);
  });

  it('should reuse the full dashboard declarations without changing ordering or gates', () => {
    expect(fullExtensions.filter((extension) => deployments.includes(extension))).toEqual(
      deployments,
    );
    expect(fullExtensions.some((extension) => extension.type === 'app.route')).toBe(true);
    expect(
      fullExtensions.some(
        (extension) => extension.type === 'model-serving.runtime-image/install-target',
      ),
    ).toBe(true);
    expect(deployments.find((extension) => extension.type === 'app.area')?.properties).toEqual({
      id: 'llmd-serving',
      requiredComponents: ['kserve'],
      reliantAreas: ['model-serving-shell'],
      featureFlags: ['disableLLMd'],
    });
  });
});
