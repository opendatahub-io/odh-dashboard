import * as _ from 'lodash-es';
import type { K8sNameDescriptionFieldData, ProjectKind } from '@odh-dashboard/k8s-core';
import { KnownLabels } from '@odh-dashboard/k8s-core';
import type { RecursivePartial } from '@odh-dashboard/foundation';

/** Local test factory — keep ui-core tests free of `@odh-dashboard/internal` imports. */
export const mockK8sNameDescriptionFieldData = (
  overrides: RecursivePartial<K8sNameDescriptionFieldData> = {},
): K8sNameDescriptionFieldData =>
  _.merge(
    {},
    {
      name: '',
      description: '',
      k8sName: {
        value: '',
        state: {
          immutable: false,
          invalidLength: false,
          invalidCharacters: false,
          maxLength: 253,
          routeNameTooLong: false,
          touched: false,
        },
      },
    },
    overrides,
  );

type MockProjectConfig = {
  displayName?: string;
  description?: string;
  k8sName?: string;
};

/** Minimal ProjectKind for setupDefaults / isK8sDSGResource tests. */
export const mockProjectK8sResource = ({
  displayName = 'Test Project',
  k8sName = 'test-project',
  description = '',
}: MockProjectConfig = {}): ProjectKind => ({
  kind: 'Project',
  apiVersion: 'project.openshift.io/v1',
  metadata: {
    name: k8sName,
    labels: {
      'kubernetes.io/metadata.name': k8sName,
      [KnownLabels.DASHBOARD_RESOURCE]: 'true',
    },
    annotations: {
      ...(description && { 'openshift.io/description': description }),
      ...(displayName && { 'openshift.io/display-name': displayName }),
    },
  },
  status: {
    phase: 'Active',
  },
});
