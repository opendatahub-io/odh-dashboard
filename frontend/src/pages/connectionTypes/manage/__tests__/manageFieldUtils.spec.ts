import { prepareFieldForSave } from '#~/pages/connectionTypes/manage/manageFieldUtils';
import {
  ConnectionTypeDataField,
  ConnectionTypeFieldType,
  DropdownField,
  FileField,
} from '#~/concepts/connectionTypes/types';

describe('prepareFieldForSave', () => {
  const baseField: ConnectionTypeDataField = {
    name: 'test-field',
    type: ConnectionTypeFieldType.Text,
    envVar: 'TEST_FIELD',
    properties: {},
  };

  it('should clear default value and read-only status for deferred fields', () => {
    const deferredField: ConnectionTypeDataField = {
      ...baseField,
      properties: {
        deferInput: true,
        defaultValue: 'some-value',
        defaultReadOnly: true,
      },
    };

    const result = prepareFieldForSave(deferredField);
    expect(result.properties.defaultValue).toBeUndefined();
    expect(result.properties.defaultReadOnly).toBeUndefined();
  });

  it('should not modify non-deferred fields default values', () => {
    const nonDeferredField: ConnectionTypeDataField = {
      ...baseField,
      properties: {
        deferInput: false,
        defaultValue: 'some-value',
        defaultReadOnly: true,
      },
    };

    const result = prepareFieldForSave(nonDeferredField);
    expect(result.properties.defaultValue).toBe('some-value');
    expect(result.properties.defaultReadOnly).toBe(true);
  });

  it('should cleanup file upload fields', () => {
    const fileField: FileField = {
      name: 'file-upload',
      type: ConnectionTypeFieldType.File,
      envVar: 'FILE_UPLOAD',
      properties: {
        extensions: ['.JPG', '  ', '.png', '', '.pdf', 'JPEG'],
      },
    };

    const result = prepareFieldForSave(fileField) as FileField;
    expect(result.properties.extensions).toEqual(['.jpg', '.png', '.pdf', 'jpeg']);
  });

  it('should handle file upload fields with no extensions', () => {
    const fileField: FileField = {
      name: 'file-upload',
      type: ConnectionTypeFieldType.File,
      envVar: 'FILE_UPLOAD',
      properties: {
        extensions: undefined,
      },
    };

    const result = prepareFieldForSave(fileField) as FileField;
    expect(result.properties.extensions).toBeUndefined();
  });

  it('should cleanup dropdown fields', () => {
    const dropdownField: DropdownField = {
      name: 'dropdown',
      type: ConnectionTypeFieldType.Dropdown,
      envVar: 'DROPDOWN',
      properties: {
        items: [
          { label: 'Item 1', value: 'item1' },
          { label: 'Item 2', value: '' },
          { label: 'Item 3', value: 'item3' },
        ],
      },
    };

    const result = prepareFieldForSave(dropdownField) as DropdownField;
    expect(result.properties.items).toEqual([
      { label: 'Item 1', value: 'item1' },
      { label: 'Item 3', value: 'item3' },
    ]);
  });

  it('should handle dropdown fields with no items', () => {
    const dropdownField: DropdownField = {
      name: 'dropdown',
      type: ConnectionTypeFieldType.Dropdown,
      envVar: 'DROPDOWN',
      properties: {
        items: undefined,
      },
    };

    const result = prepareFieldForSave(dropdownField) as DropdownField;
    expect(result.properties.items).toBeUndefined();
  });

  it('should not modify other field types', () => {
    const textField: ConnectionTypeDataField = {
      ...baseField,
      type: ConnectionTypeFieldType.Text,
    };
    const result = prepareFieldForSave(textField);
    expect(result).toEqual(textField);
  });

  it('should handle deferred file upload fields correctly', () => {
    const deferredFileField: FileField = {
      name: 'deferred-file-upload',
      type: ConnectionTypeFieldType.File,
      envVar: 'DEFERRED_FILE_UPLOAD',
      properties: {
        deferInput: true,
        defaultValue: 'some-default',
        defaultReadOnly: true,
        extensions: ['.JPG', '', '.png'],
      },
    };

    const result = prepareFieldForSave(deferredFileField) as FileField;
    expect(result.properties.defaultValue).toBeUndefined();
    expect(result.properties.defaultReadOnly).toBeUndefined();
    expect(result.properties.extensions).toEqual(['.jpg', '.png']);
  });

  it('should handle deferred dropdown fields correctly', () => {
    const deferredDropdownField: DropdownField = {
      name: 'deferred-dropdown',
      type: ConnectionTypeFieldType.Dropdown,
      envVar: 'DEFERRED_DROPDOWN',
      properties: {
        deferInput: true,
        defaultValue: ['some-default'],
        defaultReadOnly: true,
        items: [
          { label: 'Item 1', value: 'item1' },
          { label: 'Item 2', value: '' },
        ],
      },
    };

    const result = prepareFieldForSave(deferredDropdownField) as DropdownField;
    expect(result.properties.defaultValue).toBeUndefined();
    expect(result.properties.defaultReadOnly).toBeUndefined();
    expect(result.properties.items).toEqual([{ label: 'Item 1', value: 'item1' }]);
  });
});
