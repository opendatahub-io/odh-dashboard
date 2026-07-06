import { dataEntryToRecord } from '#~/utilities/dataEntryToRecord';

describe('dataEntryToRecord', () => {
  it('should convert data entry to record', () => {
    const dataEntry = [
      { key: 'key1', value: 'value1' },
      { key: 'key2', value: 'value2' },
    ];
    const result = dataEntryToRecord(dataEntry);
    expect(result).toStrictEqual({ key1: 'value1', key2: 'value2' });
  });
});
