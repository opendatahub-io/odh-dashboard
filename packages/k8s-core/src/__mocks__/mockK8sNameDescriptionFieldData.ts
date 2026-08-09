import * as _ from 'lodash-es';
import type { RecursivePartial } from '@odh-dashboard/foundation';
import type { K8sNameDescriptionFieldData } from '../k8sNameDescriptionFieldTypes';

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
