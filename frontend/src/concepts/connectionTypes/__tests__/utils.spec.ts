import { mockConnectionTypeConfigMapObj } from '~/__mocks__/mockConnectionType';
import { DropdownField, HiddenField, TextField } from '~/concepts/connectionTypes/types';
import {
  defaultValueToString,
  toConnectionTypeConfigMap,
  toConnectionTypeConfigMapObj,
} from '~/concepts/connectionTypes/utils';

describe('toConnectionTypeConfigMap / toConnectionTypeConfigMapObj', () => {
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
    ).toBe('••••••••••');
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
    ).toBe('Two');
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
    ).toBe('Two');
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
    ).toBe('Two, Three');
  });
});
