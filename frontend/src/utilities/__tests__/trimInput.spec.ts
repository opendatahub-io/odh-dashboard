import * as React from 'react';
import { trimInputOnBlur, trimInputOnPaste } from '@odh-dashboard/ui-core/utilities';

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
  const createPasteEvent = (
    text: string,
    currentTarget: Partial<HTMLInputElement | HTMLTextAreaElement> = {},
  ) =>
    ({
      preventDefault: jest.fn(),
      clipboardData: { getData: () => text },
      currentTarget: {
        value: '',
        selectionStart: 0,
        selectionEnd: 0,
        ...currentTarget,
      },
    } as unknown as React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>);

  it('should insert trimmed text through the target document without setting React state directly', () => {
    const handleChange = jest.fn();
    const execCommand = jest.fn(() => true);
    const ownerDocument = { execCommand } as unknown as Document;
    const event = createPasteEvent('    foo     ', { ownerDocument });

    trimInputOnPaste(handleChange)(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(execCommand).toHaveBeenCalledWith('insertText', false, 'foo');
    expect(handleChange).not.toHaveBeenCalled();
  });

  it.each(['PASTED', 'https://example.com/model', ''])(
    'should allow native paste when no trimming is needed for %j',
    (text) => {
      const handleChange = jest.fn();
      const execCommand = jest.fn();
      const ownerDocument = { execCommand } as unknown as Document;
      const event = createPasteEvent(text, { ownerDocument });

      trimInputOnPaste(handleChange)(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(execCommand).not.toHaveBeenCalled();
      expect(handleChange).not.toHaveBeenCalled();
    },
  );

  it('should leave paste unchanged when no onChange handler is provided', () => {
    const execCommand = jest.fn();
    const ownerDocument = { execCommand } as unknown as Document;
    const event = createPasteEvent('  foo  ', { ownerDocument });

    trimInputOnPaste()(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(execCommand).not.toHaveBeenCalled();
  });

  it('should pass an empty string to native editing for whitespace-only clipboard text', () => {
    const handleChange = jest.fn();
    const execCommand = jest.fn(() => true);
    const ownerDocument = { execCommand } as unknown as Document;
    const event = createPasteEvent(' \n\t ', { ownerDocument });

    trimInputOnPaste(handleChange)(event);

    expect(execCommand).toHaveBeenCalledWith('insertText', false, '');
    expect(handleChange).not.toHaveBeenCalled();
  });

  describe('when native insertion is unavailable', () => {
    it.each([false, undefined])('should still trim pasted text (command result: %s)', (result) => {
      const handleChange = jest.fn();
      const ownerDocument = {
        execCommand: result === undefined ? undefined : jest.fn(() => result),
      } as unknown as Document;
      const event = createPasteEvent('    foo     ', { ownerDocument });

      trimInputOnPaste(handleChange)(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(handleChange).toHaveBeenCalledWith('foo');
    });

    it.each([
      {
        current: 'dom-value',
        selectionStart: 9,
        selectionEnd: 9,
        text: ' PASTED ',
        expected: 'dom-valuePASTED',
      },
      {
        current: 'hello world',
        selectionStart: 5,
        selectionEnd: 5,
        text: '  PASTED  ',
        expected: 'helloPASTED world',
      },
      {
        current: 'hello world',
        selectionStart: 6,
        selectionEnd: 11,
        text: '  REPLACEMENT  ',
        expected: 'hello REPLACEMENT',
      },
      {
        current: 'existing',
        selectionStart: null,
        selectionEnd: null,
        text: ' PASTED ',
        expected: 'PASTEDexisting',
      },
      {
        current: 'hello world',
        selectionStart: 6,
        selectionEnd: 11,
        text: ' \n\t ',
        expected: 'hello ',
      },
    ])(
      'should read the current DOM value and replace its selection with $expected',
      ({ current, selectionStart, selectionEnd, text, expected }) => {
        const handleChange = jest.fn();
        const ownerDocument = { execCommand: jest.fn(() => false) } as unknown as Document;
        const event = createPasteEvent(text, {
          ownerDocument,
          value: current,
          selectionStart,
          selectionEnd,
        });

        trimInputOnPaste(handleChange)(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(handleChange).toHaveBeenCalledWith(expected);
      },
    );
  });
});
