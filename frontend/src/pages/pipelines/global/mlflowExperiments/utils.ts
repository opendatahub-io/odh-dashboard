export const removeQuery = '.du-bois-light-breadcrumb, .du-bois-dark-breadcrumb, header, aside';
export const experimentsPagePaddingQuery = 'main > div';
export const headingQuery = 'h2';
export const mainElementQuery = 'main';

export const isElementNode = (node: Node): node is Element => node.nodeType === Node.ELEMENT_NODE;

export const isHTMLElement = (element: Element): element is HTMLElement =>
  'style' in element && typeof element.style === 'object';

export const applyHiddenStylesToElement = (element: Element): void => {
  if (isHTMLElement(element)) {
    element.style.setProperty('display', 'none', 'important');
  }
};

export const applyOverrideStylesToMainElement = (mainElement: HTMLElement): void => {
  mainElement.style.setProperty('margin', '0', 'important');
  mainElement.style.setProperty('border-radius', '0', 'important');
};

export const applyOverrideStylesInExperimentsPage = (
  experimentsPagePaddingElement: Element | null,
  headingElement: Element | null,
): void => {
  if (experimentsPagePaddingElement && isHTMLElement(experimentsPagePaddingElement)) {
    experimentsPagePaddingElement.style.setProperty('padding-left', '0', 'important');
    experimentsPagePaddingElement.style.setProperty('padding-right', '0', 'important');
  }
  if (headingElement && isHTMLElement(headingElement)) {
    headingElement.style.setProperty('display', 'none', 'important');
  }
};

export const overrideElementsInExperimentsPage = (doc: Document | Element): void => {
  const experimentsPagePaddingElement = doc.querySelector(experimentsPagePaddingQuery);
  const headingElement = doc.querySelector(headingQuery);
  applyOverrideStylesInExperimentsPage(experimentsPagePaddingElement, headingElement);
};

export const hideElements = (doc: Document | Element): void => {
  const elementsToHide = doc.querySelectorAll(removeQuery);
  elementsToHide.forEach((element) => {
    applyHiddenStylesToElement(element);
  });
};

export const overrideMainElementStyles = (doc: Document | Element): void => {
  const mainElement = doc.querySelector(mainElementQuery);
  if (mainElement) {
    applyOverrideStylesToMainElement(mainElement);
  }
};
