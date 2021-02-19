import React from 'react';
import {
  QuickStartDrawer,
  QuickStartContext,
  useValuesForQuickStartContext,
  useLocalStorage,
  QuickStart,
} from '@cloudmosaic/quickstarts';
import '@patternfly/patternfly/base/patternfly-shield-inheritable.css';
import '@patternfly/patternfly/utilities/Accessibility/accessibility.css';
import '@patternfly/react-catalog-view-extension/dist/css/react-catalog-view-extension.css';
import '@cloudmosaic/quickstarts/dist/quickstarts.css';
import { fetchQuickStarts } from '../services/quickStartsService';

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

const QuickStarts: React.FC = ({ children }) => {
  const [activeQuickStartID, setActiveQuickStartID] = useLocalStorage('quickstartId', '');
  const [allQuickStartStates, setAllQuickStartStates] = useLocalStorage('quickstarts', {});
  const [quickStarts, setQuickStarts] = React.useState<QuickStart[]>([]);
  const { pathname: currentPath } = window.location;
  const quickStartPath = '/quickstarts';

  const updateQuickStarts = React.useCallback(
    (updatedQuickStarts: any) => {
      if (JSON.stringify(updatedQuickStarts) !== JSON.stringify(quickStarts)) {
        setQuickStarts(updatedQuickStarts);
      }
    },
    [quickStarts],
  );

  React.useEffect(() => {
    let watchHandle;
    const watchQuickStarts = () => {
      fetchQuickStarts().then((response) => {
        if (response.quickStarts) {
          updateQuickStarts(response.quickStarts);
        }
      });
      watchHandle = setTimeout(watchQuickStarts, 5000);
    };
    watchQuickStarts();
    return () => {
      if (watchHandle) {
        clearTimeout(watchHandle);
        watchHandle = null;
      }
    };
  }, [updateQuickStarts]);

  const valuesForQuickStartContext = useValuesForQuickStartContext({
    allQuickStarts: quickStarts || [],
    activeQuickStartID,
    setActiveQuickStartID,
    allQuickStartStates,
    setAllQuickStartStates,
    footer: {
      showAllLink: currentPath !== quickStartPath,
      onShowAllLinkClick: () => {
        return null;
      },
    },
  });

  return (
    <QuickStartContext.Provider value={valuesForQuickStartContext}>
      <QuickStartDrawer>{children}</QuickStartDrawer>
    </QuickStartContext.Provider>
  );
};

export default QuickStarts;
