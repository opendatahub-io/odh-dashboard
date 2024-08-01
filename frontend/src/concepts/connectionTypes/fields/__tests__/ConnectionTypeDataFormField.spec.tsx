import * as React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { ConnectionTypeDataField, ConnectionTypeFieldType } from '~/concepts/connectionTypes/types';
import ConnectionTypeDataFormField from '~/concepts/connectionTypes/fields/ConnectionTypeDataFormField';

describe('ConnectionTypeDataFormField', () => {
  it('should render field', () => {
    const test = (type: ConnectionTypeFieldType) => {
      const field = {
        type,
        name: 'test-name',
        envVar: 'test-envVar',
        properties: {},
      } as ConnectionTypeDataField;
      expect(
        render(<ConnectionTypeDataFormField field={field} />).queryByTestId(
          `field ${type} test-envVar`,
        ),
      ).toBeInTheDocument();
    };
    test(ConnectionTypeFieldType.Boolean);
    test(ConnectionTypeFieldType.ShortText);
    test(ConnectionTypeFieldType.Text);
    test(ConnectionTypeFieldType.URI);
    test(ConnectionTypeFieldType.Hidden);
    test(ConnectionTypeFieldType.File);
    test(ConnectionTypeFieldType.Numeric);
    test(ConnectionTypeFieldType.Dropdown);
  });
});
