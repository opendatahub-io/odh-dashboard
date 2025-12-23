export const removeQuery = '.du-bois-light-breadcrumb, .du-bois-dark-breadcrumb, header, aside';
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
