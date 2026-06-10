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
  const execCommandMock = jest.fn().mockReturnValue(true);

  beforeEach(() => {
    document.execCommand = execCommandMock;
  });

  afterEach(() => {
    execCommandMock.mockClear();
  });

  it('trims pasted text via execCommand to preserve undo stack', () => {
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
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(execCommandMock).toHaveBeenCalledWith('insertText', false, 'foo');
    // onChange is not called directly; execCommand triggers the input's onChange
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('lets the browser paste when text has no surrounding whitespace', () => {
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
    // No trimming needed – browser handles it natively
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    expect(execCommandMock).not.toHaveBeenCalled();
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('uses execCommand to insert trimmed text when pasted text has whitespace', () => {
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
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(execCommandMock).toHaveBeenCalledWith('insertText', false, 'PASTED');
  });

  it('uses execCommand for trimmed text when replacing selected text', () => {
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
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(execCommandMock).toHaveBeenCalledWith('insertText', false, 'REPLACEMENT');
  });

  it('falls back to default browser paste when onChange is not provided', () => {
    const mockEvent = {
      preventDefault: jest.fn(),
      clipboardData: {
        getData: () => '  trimme  ',
      },
      currentTarget: {
        value: 'existing',
        selectionStart: null,
        selectionEnd: null,
      },
    } as unknown as React.ClipboardEvent<HTMLInputElement>;

    trimInputOnPaste(undefined)(mockEvent);
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    expect(execCommandMock).not.toHaveBeenCalled();
  });
});
