import { mockConnectionTypeConfigMapObj } from '~/__mocks__/mockConnectionType';
import {
  ConnectionTypeFieldType,
  DropdownField,
  HiddenField,
  TextField,
} from '~/concepts/connectionTypes/types';
import {
  defaultValueToString,
  fieldNameToEnvVar,
  fieldTypeToString,
  toConnectionTypeConfigMap,
  toConnectionTypeConfigMapObj,
} from '~/concepts/connectionTypes/utils';

describe('toConnectionTypeConfigMap / toConnectionTypeConfigMapObj', () => {
  it('should serialize / deserialize connection type fields', () => {
    const ct = mockConnectionTypeConfigMapObj({});
    const configMap = toConnectionTypeConfigMap(ct);
    expect(typeof configMap.data?.category).toBe('string');
    expect(typeof configMap.data?.fields).toBe('string');
    expect(ct).toEqual(toConnectionTypeConfigMapObj(toConnectionTypeConfigMap(ct)));
  });

  it('should serialize / deserialize connection type with missing fields', () => {
    const ct = mockConnectionTypeConfigMapObj({ fields: undefined, category: undefined });
    const configMap = toConnectionTypeConfigMap(ct);
    expect(configMap.data?.category).toBeUndefined();
    expect(configMap.data?.fields).toBeUndefined();
    expect(ct).toEqual(toConnectionTypeConfigMapObj(configMap));
  });
});

describe('defaultValueToString', () => {
  it('should return default value as string', () => {
    expect(
      defaultValueToString({
        type: 'text',
        name: 'test',
        envVar: 'test',
        properties: {},
      } satisfies TextField),
    ).toBe(undefined);
    expect(
      defaultValueToString({
        type: 'text',
        name: 'test',
        envVar: 'test',
        properties: {
          defaultValue: '',
        },
      } satisfies TextField),
    ).toBe('');
    expect(
      defaultValueToString({
        type: 'text',
        name: 'test',
        envVar: 'test',
        properties: {
          defaultValue: 'test value',
        },
      } satisfies TextField),
    ).toBe('test value');
  });
  it('should return masked hidden value as string', () => {
    expect(
      defaultValueToString({
        type: 'hidden',
        name: 'test',
        envVar: 'test',
        properties: {},
      } satisfies HiddenField),
    ).toBe(undefined);
    expect(
      defaultValueToString({
        type: 'hidden',
        name: 'test',
        envVar: 'test',
        properties: {
          defaultValue: '',
        },
      } satisfies HiddenField),
    ).toBe('');
    expect(
      defaultValueToString({
        type: 'hidden',
        name: 'test',
        envVar: 'test',
        properties: {
          defaultValue: 'test value',
        },
      } satisfies HiddenField),
    ).toBe('test value');
  });

  it('should return single variant dropdown value as string', () => {
    expect(
      defaultValueToString({
        type: 'dropdown',
        name: 'test',
        envVar: 'test',
        properties: {
          variant: 'single',
          items: [
            { value: '1', label: 'One' },
            { value: '2', label: 'Two' },
            { value: '3', label: 'Three' },
          ],
        },
      } satisfies DropdownField),
    ).toBe(undefined);
    expect(
      defaultValueToString({
        type: 'dropdown',
        name: 'test',
        envVar: 'test',
        properties: {
          variant: 'single',
          items: [
            { value: '1', label: 'One' },
            { value: '2', label: 'Two' },
            { value: '3', label: 'Three' },
          ],
          defaultValue: [],
        },
      } satisfies DropdownField),
    ).toBe(undefined);
    expect(
      defaultValueToString({
        type: 'dropdown',
        name: 'test',
        envVar: 'test',
        properties: {
          variant: 'single',
          items: [
            { value: '1', label: 'One' },
            { value: '2', label: 'Two' },
            { value: '3', label: 'Three' },
          ],
          defaultValue: ['2'],
        },
      } satisfies DropdownField),
    ).toBe('Two (Value: 2)');
    expect(
      defaultValueToString({
        type: 'dropdown',
        name: 'test',
        envVar: 'test',
        properties: {
          variant: 'single',
          items: [
            { value: '1', label: 'One' },
            { value: '2', label: 'Two' },
            { value: '3', label: 'Three' },
          ],
          // supply an array with multiple values for single variant
          defaultValue: ['2', '3'],
        },
      } satisfies DropdownField),
    ).toBe('Two (Value: 2)');
  });

  it('should return multi variant dropdown value as string', () => {
    expect(
      defaultValueToString({
        type: 'dropdown',
        name: 'test',
        envVar: 'test',
        properties: {
          variant: 'multi',
          items: [
            { value: '1', label: 'One' },
            { value: '2', label: 'Two' },
            { value: '3', label: 'Three' },
          ],
        },
      } satisfies DropdownField),
    ).toBe(undefined);
    expect(
      defaultValueToString({
        type: 'dropdown',
        name: 'test',
        envVar: 'test',
        properties: {
          variant: 'multi',
          items: [
            { value: '1', label: 'One' },
            { value: '2', label: 'Two' },
            { value: '3', label: 'Three' },
          ],
          defaultValue: [],
        },
      } satisfies DropdownField),
    ).toBe(undefined);
    expect(
      defaultValueToString({
        type: 'dropdown',
        name: 'test',
        envVar: 'test',
        properties: {
          variant: 'multi',
          items: [
            { value: '1', label: 'One' },
            { value: '2', label: 'Two' },
            { value: '3', label: 'Three' },
          ],
          defaultValue: ['2', '3'],
        },
      } satisfies DropdownField),
    ).toBe('Two (Value: 2), Three (Value: 3)');
  });
});

describe('fieldTypeToString', () => {
  it('should return default value as string', () => {
    expect(fieldTypeToString('text')).toBe('Text - Long');
    expect(fieldTypeToString(ConnectionTypeFieldType.Text)).toBe('Text - Long');
    expect(fieldTypeToString('short-text')).toBe('Text - Short');
    expect(fieldTypeToString(ConnectionTypeFieldType.ShortText)).toBe('Text - Short');
    expect(fieldTypeToString('hidden')).toBe('Text - Hidden');
    expect(fieldTypeToString(ConnectionTypeFieldType.Hidden)).toBe('Text - Hidden');
    expect(fieldTypeToString('uri')).toBe('URI');
    expect(fieldTypeToString(ConnectionTypeFieldType.URI)).toBe('URI');
    expect(fieldTypeToString('numeric')).toBe('Numeric');
    expect(fieldTypeToString(ConnectionTypeFieldType.Numeric)).toBe('Numeric');
  });
});

describe('fieldNameToEnvVar', () => {
  it('should replace spaces with underscores', () => {
    expect(fieldNameToEnvVar('ABC DEF')).toBe('ABC_DEF');
    expect(fieldNameToEnvVar('   ')).toBe('___');
    expect(fieldNameToEnvVar(' HI ')).toBe('_HI_');
  });
  it('should repalce lowercase with uppercase', () => {
    expect(fieldNameToEnvVar('one')).toBe('ONE');
    expect(fieldNameToEnvVar('tWo')).toBe('TWO');
    expect(fieldNameToEnvVar('THREE_')).toBe('THREE_');
  });
  it('should remove invalid characters', () => {
    expect(fieldNameToEnvVar('a!@#$%^&*()-=_+[]\\{}|;\':"`,./<>?1')).toBe('A-_.1');
    expect(fieldNameToEnvVar('=== tWo')).toBe('_TWO');
  });
  it('should remove numbers at the start', () => {
    expect(fieldNameToEnvVar('1one')).toBe('ONE');
    expect(fieldNameToEnvVar('++123 TWO 456')).toBe('_TWO_456');
  });
});
