import { markdownConverter } from '~/utilities/markdown';

describe('markdownConverter', () => {
  it('should convert markdown to sanitized HTML and add hook to transform anchor tags', () => {
    const mockMarkdown = '## Heading\n\n[Link](https://example.com)';
    const expectedHtml =
      '<h2>Heading</h2>\n' +
      '<p><a href="https://example.com" rel="noopener noreferrer" target="_blank">Link</a></p>';

    const result = markdownConverter.makeHtml(mockMarkdown);
    expect(result).toEqual(expectedHtml);
  });
});
