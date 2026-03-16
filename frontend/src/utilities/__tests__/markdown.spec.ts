import { markdownConverter } from '~/utilities/markdown';

describe('markdownConverter', () => {
  it('should convert markdown to sanitized HTML and add hook to transform anchor tags', () => {
    const mockMarkdown = '## Heading\n[Link](https://example.com)';

    const result = markdownConverter.makeHtml(mockMarkdown);
    expect(result).toContain('<h2>Heading</h2>');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
    expect(result).toContain('>Link</a>');
  });
});
