import { markdownConverter } from '#~/utilities/markdown';

describe('markdownConverter', () => {
  // Helper function to convert HTML string to a DOM node
  const htmlToNode = (html: string): HTMLDivElement => {
    const container = document.createElement('div');
    container.innerHTML = html;
    return container;
  };

  it('should convert markdown to sanitized HTML and add hook to transform anchor tags', () => {
    const mockMarkdown = '## Heading\n\n[Link](https://example.com)';
    const expectedHtml = htmlToNode(
      '<h2>Heading</h2>\n' +
        '<p><a href="https://example.com" rel="noopener noreferrer" target="_blank">Link</a></p>',
    );

    const result = htmlToNode(markdownConverter.makeHtml(mockMarkdown));

    expect(result.isEqualNode(expectedHtml)).toBe(true);
  });
});
