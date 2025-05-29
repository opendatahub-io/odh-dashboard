import React from 'react';
import { useLocalStorage, QuickStartContainer } from '@patternfly/quickstarts';
import '@patternfly/react-catalog-view-extension/dist/css/react-catalog-view-extension.css';
import '@patternfly/quickstarts/dist/quickstarts.min.css';
import { useWatchQuickStarts } from '#~/utilities/useWatchQuickStarts';

type QuickStartsProps = {
  children: React.ReactNode;
};

const QuickStarts: React.FC<QuickStartsProps> = ({ children }) => {
  const [activeQuickStartID, setActiveQuickStartID] = useLocalStorage('rhodsQuickstartId', '');
  const [allQuickStartStates, setAllQuickStartStates] = useLocalStorage('rhodsQuickstarts', {});
  const { quickStarts } = useWatchQuickStarts();

  const valuesForQuickStartContext = {
    quickStarts,
    activeQuickStartID,
    setActiveQuickStartID,
    allQuickStartStates,
    setAllQuickStartStates,
  };

  return <QuickStartContainer {...valuesForQuickStartContext}>{children}</QuickStartContainer>;
};

export default QuickStarts;
