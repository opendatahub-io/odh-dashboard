/* eslint-disable camelcase */
import { RegisteredModel } from '~/concepts/modelRegistry/types';
import { getRegisteredModelLabels } from '~/pages/modelRegistry/screens/utils';

describe('getRegisteredModelLabels', () => {
  it('should return an empty array when customProperties is empty', () => {
    const customProperties: RegisteredModel['customProperties'] = {};
    const result = getRegisteredModelLabels(customProperties);
    expect(result).toEqual([]);
  });

  it('should return an array of keys with empty string values in customProperties', () => {
    const customProperties: RegisteredModel['customProperties'] = {
      label1: { string_value: '' },
      label2: { string_value: 'non-empty' },
      label3: { string_value: '' },
    };
    const result = getRegisteredModelLabels(customProperties);
    expect(result).toEqual(['label1', 'label3']);
  });

  it('should return an empty array when all values in customProperties are non-empty strings', () => {
    const customProperties: RegisteredModel['customProperties'] = {
      label1: { string_value: 'non-empty' },
      label2: { string_value: 'another-non-empty' },
    };
    const result = getRegisteredModelLabels(customProperties);
    expect(result).toEqual([]);
  });
});
