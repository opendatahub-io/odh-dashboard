/* eslint-disable camelcase */
import { RegisteredModel } from '~/concepts/modelRegistry/types';
import { getLabels } from '~/pages/modelRegistry/screens/utils';

describe('getLabels', () => {
  it('should return an empty array when customProperties is empty', () => {
    const customProperties: RegisteredModel['customProperties'] = {};
    const result = getLabels(customProperties);
    expect(result).toEqual([]);
  });

  it('should return an array of keys with empty string values in customProperties', () => {
    const customProperties: RegisteredModel['customProperties'] = {
      label1: { string_value: '' },
      label2: { string_value: 'non-empty' },
      label3: { string_value: '' },
    };
    const result = getLabels(customProperties);
    expect(result).toEqual(['label1', 'label3']);
  });

  it('should return an empty array when all values in customProperties are non-empty strings', () => {
    const customProperties: RegisteredModel['customProperties'] = {
      label1: { string_value: 'non-empty' },
      label2: { string_value: 'another-non-empty' },
    };
    const result = getLabels(customProperties);
    expect(result).toEqual([]);
  });
});
