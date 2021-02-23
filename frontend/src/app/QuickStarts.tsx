import React from 'react';
import {
  QuickStartDrawer,
  QuickStartContext,
  useValuesForQuickStartContext,
  useLocalStorage,
} from '@cloudmosaic/quickstarts';
import '@patternfly/patternfly/base/patternfly-shield-inheritable.css';
import '@patternfly/patternfly/utilities/Accessibility/accessibility.css';
import '@patternfly/react-catalog-view-extension/dist/css/react-catalog-view-extension.css';
import '@cloudmosaic/quickstarts/dist/quickstarts.css';
import { useWatchQuickStarts } from '../utilities/useWatchQuickStarts';

const QuickStarts: React.FC = ({ children }) => {
  const [activeQuickStartID, setActiveQuickStartID] = useLocalStorage('rhodsQuickstartId', '');
  const [allQuickStartStates, setAllQuickStartStates] = useLocalStorage('rhodsQuickstarts', {});
  const { quickStarts } = useWatchQuickStarts();

  const valuesForQuickStartContext = useValuesForQuickStartContext({
    allQuickStarts: quickStarts || [],
    activeQuickStartID,
    setActiveQuickStartID,
    allQuickStartStates,
    setAllQuickStartStates,
  });

  return (
    <QuickStartContext.Provider value={valuesForQuickStartContext}>
      <QuickStartDrawer>{children}</QuickStartDrawer>
    </QuickStartContext.Provider>
  );
};

export default QuickStarts;
