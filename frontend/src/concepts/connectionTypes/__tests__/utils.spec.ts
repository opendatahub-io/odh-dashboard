import { mockConnectionTypeConfigMapObj } from '~/__mocks__/mockConnectionType';
import {
  toConnectionTypeConfigMap,
  toConnectionTypeConfigMapObj,
} from '~/concepts/connectionTypes/utils';

describe('utils', () => {
  it('should serialize / deserialize connection type fields', () => {
    const ct = mockConnectionTypeConfigMapObj({});
    const configMap = toConnectionTypeConfigMap(ct);
    expect(typeof configMap.data?.fields).toBe('string');
    expect(ct).toEqual(toConnectionTypeConfigMapObj(toConnectionTypeConfigMap(ct)));
  });

  it('should serialize / deserialize connection type with missing fields', () => {
    const ct = mockConnectionTypeConfigMapObj({ fields: undefined });
    const configMap = toConnectionTypeConfigMap(ct);
    expect(configMap.data?.fields).toBeUndefined();
    expect(ct).toEqual(toConnectionTypeConfigMapObj(configMap));
  });
});
