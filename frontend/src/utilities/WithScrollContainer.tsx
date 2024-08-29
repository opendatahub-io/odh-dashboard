import * as React from 'react';

const isHTMLElement = (n: Node): n is HTMLElement => n.nodeType === Node.ELEMENT_NODE;

export const getParentScrollableElement = (node: HTMLElement | null): HTMLElement | undefined => {
  let parentNode: Node | null = node;
  while (parentNode) {
    if (isHTMLElement(parentNode)) {
      let { overflow } = parentNode.style;
      if (!overflow.includes('scroll') && !overflow.includes('auto')) {
        overflow = window.getComputedStyle(parentNode).overflow;
      }
      if (overflow.includes('scroll') || overflow.includes('auto')) {
        return parentNode;
      }
    }
    parentNode = parentNode.parentNode;
  }
  return undefined;
};

type WithScrollContainerProps = {
  children: (scrollContainer: HTMLElement | 'inline') => React.ReactElement | null;
};

export const WithScrollContainer: React.FC<WithScrollContainerProps> = ({ children }) => {
  const [scrollContainer, setScrollContainer] = React.useState<HTMLElement | null>();
  const ref = React.useCallback((node: HTMLElement | null) => {
    if (node) {
      setScrollContainer(getParentScrollableElement(node));
    }
  }, []);
  return scrollContainer ? children(scrollContainer) : <span ref={ref}>{children('inline')}</span>;
};

export const useScrollContainer = (): [HTMLElement | undefined, (node: HTMLElement) => void] => {
  const [scrollContainer, setScrollContainer] = React.useState<HTMLElement | undefined>();
  const elementRef = React.useCallback((node: HTMLElement | null) => {
    if (node === null) {
      setScrollContainer(undefined);
    }
    if (node) {
      setScrollContainer(getParentScrollableElement(node));
    }
  }, []);
  return [scrollContainer, elementRef];
};
