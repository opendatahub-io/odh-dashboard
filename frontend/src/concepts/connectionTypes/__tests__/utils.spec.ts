import * as React from 'react';
import { mockConnection } from '#~/__mocks__/mockConnection';
import {
  mockConnectionTypeConfigMapObj,
  mockModelServingFields,
} from '#~/__mocks__/mockConnectionType';
import {
  ConnectionTypeFieldType,
  DropdownField,
  HiddenField,
  TextField,
} from '#~/concepts/connectionTypes/types';
import {
  defaultValueToString,
  fieldNameToEnvVar,
  fieldTypeToString,
  getModelServingCompatibility,
  isModelServingCompatible,
  isValidEnvVar,
  ModelServingCompatibleTypes,
  toConnectionTypeConfigMap,
  toConnectionTypeConfigMapObj,
  trimInputOnBlur,
  trimInputOnPaste,
} from '#~/concepts/connectionTypes/utils';

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
    expect(fieldNameToEnvVar('a!@#$%^&*()-=_+[]\\{}|;\':"`,./<>?1')).toBe('A__1');
    expect(fieldNameToEnvVar('=== tWo')).toBe('_TWO');
  });
  it('should remove numbers at the start', () => {
    expect(fieldNameToEnvVar('1one')).toBe('ONE');
    expect(fieldNameToEnvVar('++123 TWO 456')).toBe('_TWO_456');
  });
});

describe('isValidEnvVar', () => {
  it('should be valid env var', () => {
    expect(isValidEnvVar('NAME')).toBe(true);
    expect(isValidEnvVar('UNDERSCORE_NAME')).toBe(true);
    expect(isValidEnvVar('has_digits_1234')).toBe(true);
    expect(isValidEnvVar('.dockerconfigjson')).toBe(true);
  });

  it('should be invalid env var', () => {
    expect(isValidEnvVar('has space')).toBe(false);
    expect(isValidEnvVar('has+=')).toBe(false);
    expect(isValidEnvVar('has!$@#*')).toBe(false);
    expect(isValidEnvVar('')).toBe(false);
  });
});

describe('isModelServingCompatible', () => {
  it('should identify model serving compatible connections', () => {
    expect(isModelServingCompatible(mockConnection({}))).toBe(false);
    expect(
      isModelServingCompatible(mockConnection({}), ModelServingCompatibleTypes.S3ObjectStorage),
    ).toBe(false);
    expect(
      isModelServingCompatible(
        mockConnection({
          data: {
            AWS_ACCESS_KEY_ID: 'keyid',
            AWS_SECRET_ACCESS_KEY: 'accesskey',
            AWS_S3_ENDPOINT: 'endpoint',
            AWS_S3_BUCKET: 'bucket',
          },
        }),
        ModelServingCompatibleTypes.S3ObjectStorage,
      ),
    ).toBe(true);
    expect(
      isModelServingCompatible(
        mockConnection({
          connectionType: 'test',
          data: {
            AWS_ACCESS_KEY_ID: 'test',
            AWS_SECRET_ACCESS_KEY: 'test',
            AWS_S3_ENDPOINT: 'test',
            AWS_S3_BUCKET: 'test',
          },
        }),
      ),
    ).toBe(false);
    expect(
      isModelServingCompatible(
        mockConnection({
          managed: false,
          data: {
            AWS_ACCESS_KEY_ID: 'test',
            AWS_SECRET_ACCESS_KEY: 'test',
            AWS_S3_ENDPOINT: 'test',
            AWS_S3_BUCKET: 'test',
          },
        }),
      ),
    ).toBe(false);
    expect(
      isModelServingCompatible(
        mockConnection({
          data: {
            AWS_ACCESS_KEY_ID: 'test',
          },
        }),
      ),
    ).toBe(false);
    expect(
      isModelServingCompatible(
        mockConnection({
          data: {
            URI: 'test',
          },
        }),
      ),
    ).toBe(true);
    expect(
      isModelServingCompatible(
        mockConnection({
          connectionType: 'oci-v1',
          data: {
            ACCESS_TYPE: 'Push',
            '.dockerconfigjson': '{}',
            OCI_HOST: 'quay.io',
          },
        }),
      ),
    ).toBe(false);
    expect(
      isModelServingCompatible(
        mockConnection({
          connectionType: 'oci-v1',
          data: {
            ACCESS_TYPE: window.btoa('["Pull"]'), // Have to encode the string "Pull" since we decode it in isModelServingCompatible
            '.dockerconfigjson': '{}',
            OCI_HOST: 'quay.io',
          },
        }),
      ),
    ).toBe(true);
    expect(
      isModelServingCompatible(
        mockConnection({
          connectionType: 'oci-v1',
          data: {
            '.dockerconfigjson': '{}',
            OCI_HOST: 'quay.io',
          },
        }),
      ),
    ).toBe(true);
  });

  it('should identify model serving compatible env vars', () => {
    expect(
      isModelServingCompatible(['AWS_ACCESS_KEY_ID'], ModelServingCompatibleTypes.S3ObjectStorage),
    ).toBe(false);
    expect(
      isModelServingCompatible(
        ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_ENDPOINT', 'AWS_S3_BUCKET'],
        ModelServingCompatibleTypes.S3ObjectStorage,
      ),
    ).toBe(true);
    expect(isModelServingCompatible(['invalid'], ModelServingCompatibleTypes.URI)).toBe(false);
    expect(isModelServingCompatible(['URI'], ModelServingCompatibleTypes.URI)).toBe(true);
  });

  it('should identify model serving compatible connection types', () => {
    expect(
      isModelServingCompatible(mockConnection({}), ModelServingCompatibleTypes.S3ObjectStorage),
    ).toBe(false);
    expect(
      isModelServingCompatible(
        mockConnectionTypeConfigMapObj({
          fields: mockModelServingFields,
        }),
        ModelServingCompatibleTypes.S3ObjectStorage,
      ),
    ).toBe(true);
  });
});

describe('getModelServingCompatibility', () => {
  it('should identify model serving compatible connections', () => {
    expect(getModelServingCompatibility(mockConnection({}))).toEqual([]);
    expect(
      getModelServingCompatibility(
        mockConnection({
          data: {
            AWS_ACCESS_KEY_ID: 'test',
            AWS_SECRET_ACCESS_KEY: 'test',
            AWS_S3_ENDPOINT: 'test',
            AWS_S3_BUCKET: 'test',
          },
        }),
      ),
    ).toEqual([ModelServingCompatibleTypes.S3ObjectStorage]);
    expect(
      getModelServingCompatibility(
        mockConnection({
          connectionType: 'test',
          data: {
            AWS_ACCESS_KEY_ID: 'test',
            AWS_SECRET_ACCESS_KEY: 'test',
            AWS_S3_ENDPOINT: 'test',
            AWS_S3_BUCKET: 'test',
          },
        }),
      ),
    ).toEqual([]);
    expect(
      getModelServingCompatibility(
        mockConnection({
          managed: false,
          data: {
            AWS_ACCESS_KEY_ID: 'test',
            AWS_SECRET_ACCESS_KEY: 'test',
            AWS_S3_ENDPOINT: 'test',
            AWS_S3_BUCKET: 'test',
          },
        }),
      ),
    ).toEqual([]);
    expect(
      getModelServingCompatibility(
        mockConnection({
          data: {
            AWS_ACCESS_KEY_ID: 'test',
          },
        }),
      ),
    ).toEqual([]);
    expect(
      getModelServingCompatibility(
        mockConnection({
          data: {
            URI: 'test',
          },
        }),
      ),
    ).toEqual([ModelServingCompatibleTypes.URI]);
    expect(
      getModelServingCompatibility(
        mockConnection({
          data: {
            AWS_ACCESS_KEY_ID: 'test',
            AWS_SECRET_ACCESS_KEY: 'test',
            AWS_S3_ENDPOINT: 'test',
            AWS_S3_BUCKET: 'test',
            URI: 'test',
          },
        }),
      ),
    ).toEqual([ModelServingCompatibleTypes.S3ObjectStorage, ModelServingCompatibleTypes.URI]);
    expect(
      getModelServingCompatibility(
        mockConnection({
          data: {
            ACCESS_TYPE: window.btoa('["Pull"]'), // Have to encode the string "Pull" since we decode it in isModelServingCompatible
            OCI_HOST: 'quay.io',
            '.dockerconfigjson': '{stuff}',
          },
        }),
      ),
    ).toEqual([ModelServingCompatibleTypes.OCI]);
    expect(
      getModelServingCompatibility(
        mockConnection({
          data: {
            OCI_HOST: 'quay.io',
          },
        }),
      ),
    ).toEqual([]);
  });
});

describe('useTrimInputHandlers', () => {
  it('trims whitespace on blur and calls onChange', () => {
    const handleChange = jest.fn();

    const mockEvent = {
      currentTarget: {
        value: '    hello     ',
      },
    } as React.FocusEvent<HTMLInputElement>;

    trimInputOnBlur('', handleChange)(mockEvent);
    expect(handleChange).toHaveBeenCalledWith('hello');
  });

  it('does not call onChange on blur if value is already trimmed', () => {
    const handleChange = jest.fn();

    const mockEvent = {
      currentTarget: {
        value: 'hello',
      },
    } as React.FocusEvent<HTMLInputElement>;

    trimInputOnBlur('hello', handleChange)(mockEvent);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('trims pasted text before inserting it', () => {
    const handleChange = jest.fn();

    const mockEvent = {
      preventDefault: jest.fn(),
      clipboardData: {
        getData: () => '    foo     ',
      },
      currentTarget: {
        value: '',
        setSelectionRange: jest.fn(),
        dispatchEvent: jest.fn(),
      },
    } as unknown as React.ClipboardEvent<HTMLInputElement>;

    trimInputOnPaste('', handleChange)(mockEvent);
    expect(handleChange).toHaveBeenCalledWith('foo');
  });
});
