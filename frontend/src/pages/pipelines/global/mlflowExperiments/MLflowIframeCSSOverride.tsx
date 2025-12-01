import React, { useRef, useEffect } from 'react';

interface MLflowIframeCSSOverrideProps {
  children: (iframeRef: React.RefObject<HTMLIFrameElement>) => React.ReactNode;
}

const MLflowIframeCSSOverride: React.FC<MLflowIframeCSSOverrideProps> = ({ children }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isElementNode = (node: Node): node is Element => node.nodeType === Node.ELEMENT_NODE;

  const removeQuery = '.du-bois-light-breadcrumb, .du-bois-dark-breadcrumb, header, aside';

  useEffect(() => {
    let observer: MutationObserver | null = null;

    const removeElements = (doc: Document | Element) => {
      const elementsToRemove = doc.querySelectorAll(removeQuery);
      elementsToRemove.forEach((element) => element.remove());
    };

    const overrideMainElementStyles = (doc: Document | Element) => {
      const mainElement = doc.querySelector('main');
      if (mainElement) {
        mainElement.style.setProperty('margin', '0', 'important');
        mainElement.style.setProperty('border-radius', '0', 'important');
      }
    };

    const handleIframeLoad = () => {
      try {
        const iframe = iframeRef.current;
        if (iframe?.contentDocument) {
          const doc = iframe.contentDocument;

          removeElements(doc);
          overrideMainElementStyles(doc);

          observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              mutation.addedNodes.forEach((node) => {
                if (isElementNode(node)) {
                  if (node.matches(removeQuery)) {
                    node.remove();
                  } else {
                    removeElements(node);
                  }
                  overrideMainElementStyles(node);
                }
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
