import '@patternfly/patternfly/base/patternfly-shield-inheritable.css';
import '@patternfly/patternfly/utilities/Accessibility/accessibility.css';
import '@patternfly/react-catalog-view-extension/dist/css/react-catalog-view-extension.css';
import '@cloudmosaic/quickstarts/dist/quickstarts.css';
import React from 'react';
import {
  QuickStartDrawer,
  QuickStartContext,
  useValuesForQuickStartContext,
  useLocalStorage,
} from '@cloudmosaic/quickstarts';

const importAll = (r: any) => {
  return r.keys().map(r);
};

/*
To load a quick start from a nested component, import and use the QuickStartContext.
Ex:
import { QuickStartContext, QuickStartContextValues } from '@cloudmosaic/quickstarts';
...
const qsContext = React.useContext<QuickStartContextValues>(QuickStartContext);
const qsButton = (
  <button
    onClick={() => qsContext.setActiveQuickStart && qsContext.setActiveQuickStart('template-id')}
  >
    Open a quick start from a nested component
  </button>
);
*/

export const QuickStarts = ({ children }) => {
  // @ts-ignore
  const allQuickStarts = importAll(require.context('../quickstarts', false, /\.ya?ml$/));
  const [activeQuickStartID, setActiveQuickStartID] = useLocalStorage('quickstartId', '');
  const [allQuickStartStates, setAllQuickStartStates] = useLocalStorage('quickstarts', {});
  const { pathname: currentPath } = window.location;
  const quickStartPath = '/quickstarts';
  const valuesForQuickStartContext = useValuesForQuickStartContext({
    allQuickStarts,
    activeQuickStartID,
    setActiveQuickStartID,
    allQuickStartStates,
    setAllQuickStartStates,
    footer: {
      showAllLink: currentPath !== quickStartPath,
      onShowAllLinkClick: () => {},
    },
  });

  return (
    <QuickStartContext.Provider value={valuesForQuickStartContext}>
      <QuickStartDrawer>{children}</QuickStartDrawer>
    </QuickStartContext.Provider>
  );
};
