import * as _ from 'lodash-es';
import type { K8sNameDescriptionFieldData } from '@odh-dashboard/k8s-core';
import type { RecursivePartial } from '@odh-dashboard/foundation';

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
          touched: false,
        },
      },
    },
    overrides,
  );
