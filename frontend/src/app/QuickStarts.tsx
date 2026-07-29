import React from 'react';
import { useLocalStorage, QuickStartContainer, QuickStartContext } from '@patternfly/quickstarts';
import '@patternfly/react-catalog-view-extension/dist/css/react-catalog-view-extension.css';
import '@patternfly/quickstarts/dist/quickstarts.min.css';
import { QuickStartsContext } from '#~/concepts/quickStarts/QuickStartsContext';
import { useWatchQuickStartsQuery } from '#~/utilities/useWatchQuickStartsQuery';

const QuickStartsBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pfContext = React.useContext(QuickStartContext);
  return <QuickStartsContext.Provider value={pfContext}>{children}</QuickStartsContext.Provider>;
};

type QuickStartsProps = {
  children: React.ReactNode;
};

const QuickStarts: React.FC<QuickStartsProps> = ({ children }) => {
  const [activeQuickStartID, setActiveQuickStartID] = useLocalStorage('rhodsQuickstartId', '');
  const [allQuickStartStates, setAllQuickStartStates] = useLocalStorage('rhodsQuickstarts', {});
  const { quickStarts } = useWatchQuickStartsQuery();

  const valuesForQuickStartContext = {
    quickStarts,
    activeQuickStartID,
    setActiveQuickStartID,
    allQuickStartStates,
    setAllQuickStartStates,
  };
  return (
    <QuickStartContainer {...valuesForQuickStartContext}>
      <QuickStartsBridge>{children}</QuickStartsBridge>
    </QuickStartContainer>
  );
};

export default QuickStarts;
