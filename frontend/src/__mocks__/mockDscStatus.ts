import { DataScienceClusterKindStatus } from '~/k8sTypes';
import { StackComponent } from '~/concepts/areas/types';

type MockDscStatus = {
  installedComponents?: DataScienceClusterKindStatus['installedComponents'];
};

export const mockDscStatus = ({
  installedComponents,
}: MockDscStatus): DataScienceClusterKindStatus => ({
  conditions: [],
  installedComponents: Object.values(StackComponent).reduce(
    (acc, component) => ({
      ...acc,
      [component]: installedComponents?.[component] ?? false,
    }),
    {},
  ),
  phase: 'Ready',
});
