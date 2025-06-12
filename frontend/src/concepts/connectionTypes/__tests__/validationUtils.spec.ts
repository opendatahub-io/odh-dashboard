import {
  BooleanField,
  ConnectionTypeField,
  ConnectionTypeFormData,
  DropdownField,
  FileField,
  HiddenField,
  NumericField,
  SectionField,
  ShortTextField,
  TextField,
  UriField,
} from '#~/concepts/connectionTypes/types';
import {
  booleanFieldSchema,
  connectionTypeFormSchema,
  dropdownFieldSchema,
  fieldArraySchema,
  fileFieldSchema,
  hiddenFieldSchema,
  numericFieldSchema,
  sectionFieldSchema,
  shortTextFieldSchema,
  textFieldSchema,
  uriFieldSchema,
} from '#~/concepts/connectionTypes/validationUtils';

describe('sectionFieldSchema', () => {
  it('should validate the section field', () => {
    const section: SectionField = {
      name: 'Section 1',
      type: 'section',
    };
    const result = sectionFieldSchema.safeParse(section);
    expect(result.success).toBe(true);
  });
  it('should error', () => {
    const section: SectionField = {
      name: '',
      type: 'section',
    };
    const result = sectionFieldSchema.safeParse(section);
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBe(1);
    expect(result.error?.issues[0]).toEqual(
      expect.objectContaining({
        message: 'Name is required',
        path: ['name'],
      }),
    );
  });
});

describe('shortTextFieldSchema', () => {
  it('should validate the short text field', () => {
    const field: ShortTextField = {
      name: 'Field 1',
      type: 'short-text',
      envVar: 'FIELD_1',
      properties: {
        defaultValue: 'Hello, world!',
      },
    };
    const result = shortTextFieldSchema.safeParse(field);
    expect(result.success).toBe(true);
  });
  it('should error', () => {
    const field: ShortTextField = {
      name: '',
      type: 'short-text',
      envVar: 'FIELD_1',
      properties: {},
    };
    const result = shortTextFieldSchema.safeParse(field);
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBe(1);
    expect(result.error?.issues[0]).toEqual(
      expect.objectContaining({
        message: 'Name is required',
        path: ['name'],
      }),
    );
  });
});

describe('textFieldSchema', () => {
  it('should validate the text field', () => {
    const field: TextField = {
      name: 'Field 1',
      type: 'text',
      envVar: 'FIELD_1',
      properties: {
        defaultValue: 'Hello, world!',
      },
    };
    const result = textFieldSchema.safeParse(field);
    expect(result.success).toBe(true);
  });
  it('should error', () => {
    const field: TextField = {
      name: '',
      type: 'text',
      envVar: 'FIELD_1',
      properties: {},
    };
    const result = textFieldSchema.safeParse(field);
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBe(1);

    expect(result.error?.issues[0]).toEqual(
      expect.objectContaining({
        message: 'Name is required',
        path: ['name'],
      }),
    );
  });
});

describe('hiddenFieldSchema', () => {
  it('should validate the hidden text field', () => {
    const field: HiddenField = {
      name: 'Field 1',
      type: 'hidden',
      envVar: 'FIELD_1',
      properties: {
        defaultValue: 'Hello, world!',
      },
    };
    const result = hiddenFieldSchema.safeParse(field);
    expect(result.success).toBe(true);
  });
  it('should error', () => {
    const field: HiddenField = {
      name: '',
      type: 'hidden',
      envVar: 'FIELD_1',
      properties: {},
    };
    const result = hiddenFieldSchema.safeParse(field);
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBe(1);

    expect(result.error?.issues[0]).toEqual(
      expect.objectContaining({
        message: 'Name is required',
        path: ['name'],
      }),
    );
  });
});

describe('uriFieldSchema', () => {
  it('should validate the uri field', () => {
    const field: UriField = {
      name: 'Field 1',
      type: 'uri',
      envVar: 'FIELD_1',
      properties: {
        defaultValue: 'https://example.com',
      },
    };
    const result = uriFieldSchema.safeParse(field);
    expect(result.success).toBe(true);
  });
  it('should error', () => {
    const field: UriField = {
      name: '',
      type: 'uri',
      envVar: 'FIELD_1',
      properties: {
        defaultValue: 'not a uri',
      },
    };
    const result = uriFieldSchema.safeParse(field);
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBe(2);
    expect(result.error?.issues[0]).toEqual(
      expect.objectContaining({
        message: 'Name is required',
        path: ['name'],
      }),
    );
    expect(result.error?.issues[1]).toEqual(
      expect.objectContaining({
        message: 'Invalid URI',
        path: ['properties', 'defaultValue'],
      }),
    );
  });
});

describe('booleanFieldSchema', () => {
  it('should validate the boolean field', () => {
    const field: BooleanField = {
      name: 'Field 1',
      type: 'boolean',
      envVar: 'FIELD_1',
      properties: {
        defaultValue: true,
        label: 'Checkbox label',
      },
    };
    const result = booleanFieldSchema.safeParse(field);
    expect(result.success).toBe(true);
  });
  it('should error', () => {
    const field: BooleanField = {
      name: '',
      type: 'boolean',
      envVar: 'FIELD_1',
      properties: {},
    };
    const result = booleanFieldSchema.safeParse(field);
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBe(2);
    expect(result.error?.issues[0]).toEqual(
      expect.objectContaining({
        message: 'Name is required',
        path: ['name'],
      }),
    );
    expect(result.error?.issues[1]).toEqual(
      expect.objectContaining({
        message: 'Checkbox label is required',
        path: ['properties', 'label'],
      }),
    );
  });
});

describe('numericFieldSchema', () => {
  it('should validate the numeric field', () => {
    const field: NumericField = {
      name: 'Field 1',
      type: 'numeric',
      envVar: 'FIELD_1',
      properties: {
        defaultValue: 10,
        unit: 'cm',
        min: 1,
        max: 100,
      },
    };
    const result = numericFieldSchema.safeParse(field);
    expect(result.success).toBe(true);
  });
  it('should error when name is empty', () => {
    const field: NumericField = {
      name: '',
      type: 'numeric',
      envVar: 'FIELD_1',
      properties: {},
    };
    const result = numericFieldSchema.safeParse(field);
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBe(1);
    expect(result.error?.issues[0]).toEqual(
      expect.objectContaining({
        message: 'Name is required',
        path: ['name'],
      }),
    );
  });
  it('should error when min is greater than max', () => {
    const field: NumericField = {
      name: 'Field 1',
      type: 'numeric',
      envVar: 'FIELD_1',
      properties: {
        min: 100,
        max: 10,
      },
    };
    const result = numericFieldSchema.safeParse(field);
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBe(2);
    expect(result.error?.issues[0]).toEqual(
      expect.objectContaining({
        message: 'The lower threshold must be less than the upper threshold',
        path: ['properties', 'min'],
      }),
    );
    expect(result.error?.issues[1]).toEqual(
      expect.objectContaining({
        message: 'The upper threshold must be greater than the lower threshold',
        path: ['properties', 'max'],
      }),
    );
  });
  it('should error when defaultValue is less than min', () => {
    const field: NumericField = {
      name: 'Field 1',
      type: 'numeric',
      envVar: 'FIELD_1',
      properties: {
        defaultValue: 5,
        min: 10,
      },
    };
    const result = numericFieldSchema.safeParse(field);
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBe(1);
    expect(result.error?.issues[0]).toEqual(
      expect.objectContaining({
        message: 'The default value must be greater than the lower threshold',
        path: ['properties', 'defaultValue'],
      }),
    );
  });
  it('should error when defaultValue is greater than max', () => {
    const field: NumericField = {
      name: 'Field 1',
      type: 'numeric',
      envVar: 'FIELD_1',
      properties: {
        defaultValue: 15,
        max: 10,
      },
    };
    const result = numericFieldSchema.safeParse(field);
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBe(1);
    expect(result.error?.issues[0]).toEqual(
      expect.objectContaining({
        message: 'The default value must be less than the upper threshold',
        path: ['properties', 'defaultValue'],
      }),
    );
  });
});

describe('fileFieldSchema', () => {
  it('should validate the file field', () => {
    const field: FileField = {
      name: 'Field 1',
      type: 'file',
      envVar: 'FIELD_1',
      properties: {
        defaultValue: 'File content.',
        extensions: ['.txt', '.md'],
      },
    };
    const result = fileFieldSchema.safeParse(field);
    expect(result.success).toBe(true);
  });
  it('should error when name is empty', () => {
    const field: FileField = {
      name: '',
      type: 'file',
      envVar: 'FIELD_1',
      properties: {},
    };
    const result = fileFieldSchema.safeParse(field);
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBe(1);
    expect(result.error?.issues[0]).toEqual(
      expect.objectContaining({
        message: 'Name is required',
        path: ['name'],
      }),
    );
  });
  it('should error when extensions are not valid', () => {
    const field: FileField = {
      name: 'Field 1',
      type: 'file',
      envVar: 'FIELD_1',
      properties: {
        defaultValue: 'File content.',
        extensions: ['txt', 'md'],
      },
    };
    const result = fileFieldSchema.safeParse(field);
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBe(2);
    expect(result.error?.issues[0]).toEqual(
      expect.objectContaining({
        message: "A valid extension must start with '.'",
        path: ['properties', 'extensions', 0],
      }),
    );
    expect(result.error?.issues[1]).toEqual(
      expect.objectContaining({
        message: "A valid extension must start with '.'",
        path: ['properties', 'extensions', 1],
      }),
    );
  });
  it('should error when extensions are duplicated', () => {
    const field: FileField = {
      name: 'Field 1',
      type: 'file',
      envVar: 'FIELD_1',
      properties: {
        defaultValue: 'File content.',
        extensions: ['.txt', '.txt'],
      },
    };
    const result = fileFieldSchema.safeParse(field);
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBe(1);
    expect(result.error?.issues[0]).toEqual(
      expect.objectContaining({
        message: 'Extension has already been specified.',
        path: ['properties', 'extensions', 1],
      }),
    );
  });
});

describe('dropdownFieldSchema', () => {
  it('should validate the single variant dropdown field', () => {
    const field: DropdownField = {
      name: 'Field 1',
      type: 'dropdown',
      envVar: 'FIELD_1',
      properties: {
        variant: 'single',
        defaultValue: ['Option 2 Value'],
        items: [
          { label: 'Option 1 Label', value: 'Option 1 Value' },
          { label: 'Option 2 Label', value: 'Option 2 Value' },
          { label: 'Option 3 Label', value: 'Option 3 Value' },
        ],
      },
    };
    const result = dropdownFieldSchema.safeParse(field);
    expect(result.success).toBe(true);
  });
  it('should validate the multi variant dropdown field', () => {
    const field: DropdownField = {
      name: 'Field 1',
      type: 'dropdown',
      envVar: 'FIELD_1',
      properties: {
        variant: 'multi',
        defaultValue: ['Option 2 Value', 'Option 3 Value'],
        items: [
          { label: 'Option 1 Label', value: 'Option 1 Value' },
          { label: 'Option 2 Label', value: 'Option 2 Value' },
          { label: 'Option 3 Label', value: 'Option 3 Value' },
        ],
      },
    };
    const result = dropdownFieldSchema.safeParse(field);
    expect(result.success).toBe(true);
  });
  it('should error when name and items are empty', () => {
    const field: DropdownField = {
      name: '',
      type: 'dropdown',
      envVar: 'FIELD_1',
      properties: {
        items: [],
      },
    };
    const result = dropdownFieldSchema.safeParse(field);
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBe(2);
    expect(result.error?.issues[0]).toEqual(
      expect.objectContaining({
        message: 'Name is required',
        path: ['name'],
      }),
    );
    expect(result.error?.issues[1]).toEqual(
      expect.objectContaining({
        message: 'At least one item is required',
        path: ['properties', 'items'],
      }),
    );
  });
  it('should error when item values are missing', () => {
    const field: DropdownField = {
      name: 'Field 1',
      type: 'dropdown',
      envVar: 'FIELD_1',
      properties: {
        variant: 'single',
        defaultValue: ['Option 1 Value'],
        items: [{ label: 'Option 1 Label', value: '' }],
      },
    };
    const result = dropdownFieldSchema.safeParse(field);
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBe(1);
    expect(result.error?.issues[0]).toEqual(
      expect.objectContaining({
        message: 'Value is required',
        path: ['properties', 'items', 0, 'value'],
      }),
    );
  });
  it('should error when item labels are duplicated', () => {
    const field: DropdownField = {
      name: 'Field 1',
      type: 'dropdown',
      envVar: 'FIELD_1',
      properties: {
        variant: 'single',
        defaultValue: ['Option 2 Value'],
        items: [
          { label: 'Option Label', value: 'Option 1 Value' },
          { label: 'Option Label', value: 'Option 2 Value' },
        ],
      },
    };
    const result = dropdownFieldSchema.safeParse(field);
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBe(1);
    expect(result.error?.issues[0]).toEqual(
      expect.objectContaining({
        message: 'Option Label already exists.',
        path: ['properties', 'items', 1, 'label'],
      }),
    );
  });
  it('should error when item values are duplicated', () => {
    const field: DropdownField = {
      name: 'Field 1',
      type: 'dropdown',
      envVar: 'FIELD_1',
      properties: {
        variant: 'single',
        defaultValue: ['Option 2 Value'],
        items: [
          { label: 'Option 1 Label', value: 'Option Value' },
          { label: 'Option 2 Label', value: 'Option Value' },
        ],
      },
    };
    const result = dropdownFieldSchema.safeParse(field);
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBe(1);
    expect(result.error?.issues[0]).toEqual(
      expect.objectContaining({
        message: 'Option Value already exists.',
        path: ['properties', 'items', 1, 'value'],
      }),
    );
  });
});

describe('fieldArraySchema', () => {
  it('should validate the fields', () => {
    const fields: ConnectionTypeField[] = [
      {
        name: 'Section 1',
        type: 'section',
      },
      {
        name: 'Field 1',
        type: 'short-text',
        envVar: 'FIELD_1',
        properties: {},
      },
    ];
    const result = fieldArraySchema.safeParse(fields);
    expect(result.success).toBe(true);
  });

  it('should error when there are duplicate env vars', () => {
    const fields: ConnectionTypeField[] = [
      {
        name: 'Section 1',
        type: 'section',
      },
      {
        name: 'Field 1',
        type: 'short-text',
        envVar: 'FIELD_1',
        properties: {},
      },
      {
        name: 'Field 2',
        type: 'text',
        envVar: 'FIELD_1',
        properties: {},
      },
    ];
    const result = fieldArraySchema.safeParse(fields);
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBe(3);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message:
            'Two or more fields are using the same environment variable. Ensure that each field uses a unique environment variable to proceed.',
          path: [],
        }),
        expect.objectContaining({
          message: 'FIELD_1 already exists within this connection type.',
          path: [1, 'envVar'],
        }),
        expect.objectContaining({
          message: 'FIELD_1 already exists within this connection type.',
          path: [2, 'envVar'],
        }),
      ]),
    );
  });
});

describe('connectionTypeFormSchema', () => {
  it('should validate the connection type form', () => {
    const form: ConnectionTypeFormData = {
      enabled: true,
      fields: [],
      username: 'test',
      category: ['test'],
    };
    const result = connectionTypeFormSchema.safeParse(form);
    expect(result.success).toBe(true);
  });
  it('should error when username is empty', () => {
    const form: ConnectionTypeFormData = {
      enabled: true,
      fields: [],
      username: '',
      category: ['test'],
    };
    const result = connectionTypeFormSchema.safeParse(form);
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBe(1);
    expect(result.error?.issues[0]).toEqual(
      expect.objectContaining({
        message: 'Username is required',
        path: ['username'],
      }),
    );
  });
  it('should error when category array is empty', () => {
    const form: ConnectionTypeFormData = {
      enabled: true,
      fields: [],
      username: 'test',
      category: [],
    };
    const result = connectionTypeFormSchema.safeParse(form);
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBe(1);
    expect(result.error?.issues[0]).toEqual(
      expect.objectContaining({
        message: 'At least one category is required',
        path: ['category'],
      }),
    );
  });
  it('should error when category is empty', () => {
    const form: ConnectionTypeFormData = {
      enabled: true,
      fields: [],
      username: 'test',
      category: [''],
    };
    const result = connectionTypeFormSchema.safeParse(form);
    expect(result.success).toBe(false);
    expect(result.error?.issues.length).toBe(1);
    expect(result.error?.issues[0]).toEqual(
      expect.objectContaining({
        message: 'Category is required',
        path: ['category', 0],
      }),
    );
  });
});
