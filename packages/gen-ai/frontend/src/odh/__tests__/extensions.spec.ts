import type { K8sCondition } from '@odh-dashboard/k8s-core';
import extensions, { MODEL_AS_SERVICE_CAMEL, GEN_AI_TRACING } from '~/odh/extensions';

const findArea = (id: string) => {
  const area = extensions.find((ext) => ext.type === 'app.area' && ext.properties.id === id);
  if (!area || area.type !== 'app.area') {
    throw new Error(`${id} area extension not found`);
  }
  return area;
};

const findMaaSArea = () => findArea(MODEL_AS_SERVICE_CAMEL);

const makeDscStatus = (conditions: K8sCondition[]) =>
  ({
    conditions,
    components: {},
  }) as never;

describe('modelAsService area extension', () => {
  it('should have a customCondition defined', () => {
    const area = findMaaSArea();
    expect(area.properties.customCondition).toBeDefined();
  });

  it('should return true when ModelsAsServiceReady is True', () => {
    const area = findMaaSArea();
    const dscStatus = makeDscStatus([
      {
        type: 'ModelsAsServiceReady',
        status: 'True',
        lastTransitionTime: '',
        reason: 'Ready',
        message: '',
      },
    ]);

    const result = area.properties.customCondition!({
      dashboardConfigSpec: {} as never,
      dscStatus,
      dsciStatus: null,
    });

    expect(result).toBe(true);
  });

  it('should return false when ModelsAsServiceReady is False', () => {
    const area = findMaaSArea();
    const dscStatus = makeDscStatus([
      {
        type: 'ModelsAsServiceReady',
        status: 'False',
        lastTransitionTime: '',
        reason: 'NotReady',
        message: '',
      },
    ]);

    const result = area.properties.customCondition!({
      dashboardConfigSpec: {} as never,
      dscStatus,
      dsciStatus: null,
    });

    expect(result).toBe(false);
  });

  it('should return false when ModelsAsServiceReady condition is absent', () => {
    const area = findMaaSArea();
    const dscStatus = makeDscStatus([
      {
        type: 'SomeOtherCondition',
        status: 'True',
        lastTransitionTime: '',
        reason: '',
        message: '',
      },
    ]);

    const result = area.properties.customCondition!({
      dashboardConfigSpec: {} as never,
      dscStatus,
      dsciStatus: null,
    });

    expect(result).toBe(false);
  });

  it('should return false when dscStatus is null', () => {
    const area = findMaaSArea();

    const result = area.properties.customCondition!({
      dashboardConfigSpec: {} as never,
      dscStatus: null,
      dsciStatus: null,
    });

    expect(result).toBe(false);
  });
});

const makeDsciStatus = (conditions: K8sCondition[]) => ({ conditions }) as never;

describe('tracing area extension', () => {
  it('should have a customCondition defined', () => {
    const area = findArea(GEN_AI_TRACING);
    expect(area.properties.customCondition).toBeDefined();
  });

  it('should return true when OpenTelemetryCollectorAvailable is True', () => {
    const area = findArea(GEN_AI_TRACING);
    const dsciStatus = makeDsciStatus([
      {
        type: 'OpenTelemetryCollectorAvailable',
        status: 'True',
        lastTransitionTime: '',
        reason: 'Ready',
        message: '',
      },
    ]);

    const result = area.properties.customCondition!({
      dashboardConfigSpec: {} as never,
      dscStatus: null,
      dsciStatus,
    });

    expect(result).toBe(true);
  });

  it('should return false when OpenTelemetryCollectorAvailable is False', () => {
    const area = findArea(GEN_AI_TRACING);
    const dsciStatus = makeDsciStatus([
      {
        type: 'OpenTelemetryCollectorAvailable',
        status: 'False',
        lastTransitionTime: '',
        reason: 'TracesNotConfigured',
        message: '',
      },
    ]);

    const result = area.properties.customCondition!({
      dashboardConfigSpec: {} as never,
      dscStatus: null,
      dsciStatus,
    });

    expect(result).toBe(false);
  });

  it('should return false when OpenTelemetryCollectorAvailable condition is absent', () => {
    const area = findArea(GEN_AI_TRACING);
    const dsciStatus = makeDsciStatus([
      {
        type: 'SomeOtherCondition',
        status: 'True',
        lastTransitionTime: '',
        reason: '',
        message: '',
      },
    ]);

    const result = area.properties.customCondition!({
      dashboardConfigSpec: {} as never,
      dscStatus: null,
      dsciStatus,
    });

    expect(result).toBe(false);
  });

  it('should return false when dsciStatus is null', () => {
    const area = findArea(GEN_AI_TRACING);

    const result = area.properties.customCondition!({
      dashboardConfigSpec: {} as never,
      dscStatus: null,
      dsciStatus: null,
    });

    expect(result).toBe(false);
  });
});
