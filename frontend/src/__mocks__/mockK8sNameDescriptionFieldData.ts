import * as _ from 'lodash-es';
import { RecursivePartial } from '#~/typeHelpers';
import { K8sNameDescriptionFieldData } from '#~/concepts/k8s/K8sNameDescriptionField/types';

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
