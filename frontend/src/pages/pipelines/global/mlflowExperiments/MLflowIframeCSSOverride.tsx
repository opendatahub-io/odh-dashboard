import React, { useRef, useEffect } from 'react';

interface MLflowIframeCSSOverrideProps {
  children: (iframeRef: React.RefObject<HTMLIFrameElement>) => React.ReactNode;
}

const MLflowIframeCSSOverride: React.FC<MLflowIframeCSSOverrideProps> = ({ children }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isElementNode = (node: Node): node is Element => node.nodeType === Node.ELEMENT_NODE;

  const isHTMLElement = (element: Element): element is HTMLElement =>
    'style' in element && typeof element.style === 'object';

  const removeQuery = '.du-bois-light-breadcrumb, .du-bois-dark-breadcrumb, header, aside';

  useEffect(() => {
    let observer: MutationObserver | null = null;

    const applyHiddenStylesToElement = (element: Element) => {
      if (isHTMLElement(element)) {
        element.style.setProperty('display', 'none', 'important');
      }
    };

    const hideElements = (doc: Document | Element) => {
      const elementsToHide = doc.querySelectorAll(removeQuery);
      elementsToHide.forEach((element) => {
        applyHiddenStylesToElement(element);
      });
    };

    const applyOverrideStylesToMainElement = (mainElement: HTMLElement) => {
      mainElement.style.setProperty('margin', '0', 'important');
      mainElement.style.setProperty('border-radius', '0', 'important');
    };

    const overrideMainElementStyles = (doc: Document | Element) => {
      const mainElement = doc.querySelector('main');
      if (mainElement) {
        applyOverrideStylesToMainElement(mainElement);
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
                if (isElementNode(node)) {
                  hideElements(node);
                  overrideMainElementStyles(node);
                }
              });

              if (
                mutation.type === 'attributes' &&
                mutation.attributeName === 'style' &&
                isElementNode(mutation.target)
              ) {
                const element = mutation.target;
                if (element.matches(removeQuery)) {
                  applyHiddenStylesToElement(element);
                } else if (element.matches('main') && isHTMLElement(element)) {
                  applyOverrideStylesToMainElement(element);
                }
              }
            });
          });

          observer.observe(doc.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style'],
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
