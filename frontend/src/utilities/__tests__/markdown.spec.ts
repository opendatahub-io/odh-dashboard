import DOMPurify from 'dompurify';
import { Converter } from 'showdown';
import { markdownConverter } from '~/utilities/markdown';

// Mocking external dependencies
jest.mock('dompurify');
jest.mock('showdown');

describe('markdownConverter', () => {
  it('should convert markdown to sanitized HTML and add hook to transform anchor tags', () => {
    const mockMarkdown = '## Heading\n[Link](https://example.com)';
    const expectedHtml =
      '<h2>Heading</h2><p><a href="https://example.com" target="_blank" rel="noopener noreferrer">Link</a></p>';

    // Mock Converter's makeHtml method
    const converterInstanceMock = { makeHtml: jest.fn().mockReturnValue(expectedHtml) };
    (Converter as jest.Mock).mockImplementation(() => converterInstanceMock);

    // Mock DOMPurify's addHook and sanitize methods
    DOMPurify.addHook = jest.fn();
    (DOMPurify.sanitize as jest.Mock).mockImplementation((html) => html);

    // Call the function to test
    const result = markdownConverter.makeHtml(mockMarkdown);

    // Assertions
    expect(result).toEqual(expectedHtml);

    // Converter's makeHtml method should be called with the provided markdown
    expect(converterInstanceMock.makeHtml).toHaveBeenCalledWith(mockMarkdown);

    // DOMPurify hooks and sanitize should be called
    expect(DOMPurify.addHook).toHaveBeenCalledWith('beforeSanitizeElements', expect.any(Function));
    expect(DOMPurify.sanitize).toHaveBeenCalledWith(expectedHtml, expect.any(Object));

    // Additional assertion for the specific hook function
    const hookFunction = (DOMPurify.addHook as jest.Mock).mock.calls[0][1];
    const mockNode = { nodeType: 1, nodeName: 'A', setAttribute: jest.fn() };
    hookFunction(mockNode);

    // Assertion for node transformation
    expect(mockNode.setAttribute).toHaveBeenCalledWith('rel', 'noopener noreferrer');
  });
});
