import { markdownConverter } from '~/utilities/markdown';

describe('markdownConverter', () => {
  it('should convert markdown to sanitized HTML and add hook to transform anchor tags', () => {
    const mockMarkdown = '## Heading\n[Link](https://example.com)';
    const expectedHtml =
      '<h2>Heading</h2>\n<p><a target="_blank" rel="noopener noreferrer" href="https://example.com">Link</a></p>';

    const result = markdownConverter.makeHtml(mockMarkdown);
    expect(result).toEqual(expectedHtml);
  });
});
