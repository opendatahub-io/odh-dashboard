import React, { useRef, useEffect } from 'react';
import {
  hideElements,
  overrideMainElementStyles,
  isElementNode,
  removeQuery,
  applyHiddenStylesToElement,
  isHTMLElement,
  applyOverrideStylesToMainElement,
  mainElementQuery,
} from './utils';

interface MLflowIframeCSSOverrideProps {
  children: (iframeRef: React.RefObject<HTMLIFrameElement>) => React.ReactNode;
}

const MLflowIframeCSSOverride: React.FC<MLflowIframeCSSOverrideProps> = ({ children }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let observer: MutationObserver | null = null;

    const handleNodeMutation = (node: Node) => {
      if (isElementNode(node)) {
        // Check if the node itself matches our selectors
        if (node.matches(removeQuery)) {
          applyHiddenStylesToElement(node);
        } else if (node.matches(mainElementQuery) && isHTMLElement(node)) {
          applyOverrideStylesToMainElement(node);
        }
        // Also check children within the node
        hideElements(node);
        overrideMainElementStyles(node);
      }
    };

    const handleIframeLoad = () => {
      try {
        const iframe = iframeRef.current;
        if (iframe?.contentDocument) {
          const doc = iframe.contentDocument;

          hideElements(doc);
          overrideMainElementStyles(doc);

          observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              mutation.addedNodes.forEach((node) => {
                handleNodeMutation(node);
              });
            });
          });

          observer.observe(doc.body, {
            childList: true,
            subtree: true,
          });
        }
      } catch (error) {
        console.warn('Error accessing iframe content:', error);
      }
    };

    const iframe = iframeRef.current;
    if (iframe) {
      iframe.addEventListener('load', handleIframeLoad);
      return () => {
        iframe.removeEventListener('load', handleIframeLoad);
        observer?.disconnect();
      };
    }
    return undefined;
  }, []);

  return children(iframeRef);
};

export default MLflowIframeCSSOverride;
