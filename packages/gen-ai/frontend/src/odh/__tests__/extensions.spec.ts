import type { K8sCondition } from '@odh-dashboard/internal/k8sTypes';
import extensions, { MODEL_AS_SERVICE_CAMEL } from '~/odh/extensions';

const findMaaSArea = () => {
  const area = extensions.find(
    (ext) => ext.type === 'app.area' && ext.properties.id === MODEL_AS_SERVICE_CAMEL,
  );
  if (!area || area.type !== 'app.area') {
    throw new Error('modelAsService area extension not found');
  }
  return area;
};

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
