import * as React from 'react';
import { trimInputOnBlur, trimInputOnPaste } from '#~/utilities/trimInput';

describe('trimInputOnBlur', () => {
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
});

describe('trimInputOnPaste', () => {
  it('trims pasted text before inserting it', () => {
    const handleChange = jest.fn();

    const mockEvent = {
      preventDefault: jest.fn(),
      clipboardData: {
        getData: () => '    foo     ',
      },
      currentTarget: {
        value: '',
        selectionStart: 0,
        selectionEnd: 0,
      },
    } as unknown as React.ClipboardEvent<HTMLInputElement>;

    trimInputOnPaste(handleChange)(mockEvent);
    expect(handleChange).toHaveBeenCalledWith('foo');
  });

  it('reads current text from the DOM, not from React state', () => {
    const handleChange = jest.fn();

    const mockEvent = {
      preventDefault: jest.fn(),
      clipboardData: {
        getData: () => 'PASTED',
      },
      currentTarget: {
        value: 'dom-value',
        selectionStart: 9,
        selectionEnd: 9,
      },
    } as unknown as React.ClipboardEvent<HTMLInputElement>;

    trimInputOnPaste(handleChange)(mockEvent);
    expect(handleChange).toHaveBeenCalledWith('dom-valuePASTED');
  });

  it('inserts trimmed pasted text at cursor position within existing value', () => {
    const handleChange = jest.fn();

    const mockEvent = {
      preventDefault: jest.fn(),
      clipboardData: {
        getData: () => '  PASTED  ',
      },
      currentTarget: {
        value: 'hello world',
        selectionStart: 5,
        selectionEnd: 5,
      },
    } as unknown as React.ClipboardEvent<HTMLInputElement>;

    trimInputOnPaste(handleChange)(mockEvent);
    expect(handleChange).toHaveBeenCalledWith('helloPASTED world');
  });

  it('replaces selected text with trimmed pasted text', () => {
    const handleChange = jest.fn();
    const mockEvent = {
      preventDefault: jest.fn(),
      clipboardData: {
        getData: () => '  REPLACEMENT  ',
      },
      currentTarget: {
        value: 'hello world',
        selectionStart: 6,
        selectionEnd: 11,
      },
    } as unknown as React.ClipboardEvent<HTMLInputElement>;

    trimInputOnPaste(handleChange)(mockEvent);
    expect(handleChange).toHaveBeenCalledWith('hello REPLACEMENT');
  });

  it('defaults selectionEnd to selectionStart when both are null', () => {
    const handleChange = jest.fn();
    const mockEvent = {
      preventDefault: jest.fn(),
      clipboardData: {
        getData: () => 'PASTED',
      },
      currentTarget: {
        value: 'existing',
        selectionStart: null,
        selectionEnd: null,
      },
    } as unknown as React.ClipboardEvent<HTMLInputElement>;

    trimInputOnPaste(handleChange)(mockEvent);
    expect(handleChange).toHaveBeenCalledWith('PASTEDexisting');
  });
});
