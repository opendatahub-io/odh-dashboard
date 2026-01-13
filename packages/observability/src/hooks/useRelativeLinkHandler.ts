import * as React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Check if a URL is a relative link (starts with / but not //)
 */
const isRelativeLink = (href: string): boolean => href.startsWith('/') && !href.startsWith('//');

/**
 * Hook that returns a ref callback to attach to a DOM node. It intercepts relative link clicks
 * and navigates using React Router instead of causing a full page reload.
 *
 * This is useful for content rendered by third-party libraries (like Perses Markdown)
 * where links would otherwise cause full SPA reloads.
 *
 * @returns A ref callback to attach to the container element
 *
 * @example
 * ```tsx
 * const linkHandlerRef = useRelativeLinkHandler();
 *
 * return <div ref={linkHandlerRef}>{markdownContent}</div>;
 * ```
 */
const useRelativeLinkHandler = (): React.RefCallback<HTMLElement> => {
  const navigate = useNavigate();
  const [node, setNode] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!node) {
      return undefined;
    }

    const handleClick = (event: MouseEvent): void => {
      // Only handle left clicks without modifier keys
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      // Find the closest anchor element
      const { target } = event;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const anchor = target.closest('a');

      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute('href');

      // Only intercept relative links
      if (href && isRelativeLink(href)) {
        event.preventDefault();
        navigate(href);
      }
    };

    node.addEventListener('click', handleClick);

    return () => {
      node.removeEventListener('click', handleClick);
    };
  }, [node, navigate]);

  return setNode;
};

export default useRelativeLinkHandler;
