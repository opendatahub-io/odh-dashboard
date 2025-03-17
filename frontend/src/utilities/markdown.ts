import DOMPurify from 'dompurify';
import { Converter } from 'showdown';

export const markdownConverter = {
  makeHtml: (markdown: string, maxHeading = 1): string => {
    const converter = new Converter({
      tables: true,
      openLinksInNewWindow: true,
      strikethrough: true,
      emoji: true,
      literalMidWordUnderscores: true,
    });
    let unsafeHtml = converter.makeHtml(markdown);

    if (maxHeading > 1) {
      // shift headings down (prevent them from competeing with page headings)
      const shift = maxHeading - 1;
      unsafeHtml = unsafeHtml.replace(
        /<(\/?)h(\d)(.*?)>/gi,
        (match, closingSlash, level, attributes) => {
          const newLevel = Math.min(parseInt(level) + shift, 4); // cap at h4
          return `<${closingSlash}h${newLevel}${attributes}>`;
        },
      );
    }

    // add hook to transform anchor tags
    DOMPurify.addHook('beforeSanitizeElements', (node) => {
      // nodeType 1 = element type
      if (
        node instanceof HTMLElement &&
        node.nodeType === 1 &&
        node.nodeName.toLowerCase() === 'a'
      ) {
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });

    return DOMPurify.sanitize(unsafeHtml, {
      ALLOWED_TAGS: [
        'b',
        'i',
        'strike',
        's',
        'del',
        'em',
        'strong',
        'a',
        'p',
        'h1',
        'h2',
        'h3',
        'h4',
        'ul',
        'ol',
        'li',
        'code',
        'pre',
        'table',
        'thead',
        'tbody',
        'tr',
        'th',
        'td',
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    });
  },
};
