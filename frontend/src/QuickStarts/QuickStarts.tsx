import React from 'react';
import {
  QuickStartDrawer,
  QuickStartContext,
  QuickStartCatalogPage,
  useValuesForQuickStartContext,
  useLocalStorage,
  QuickStartContextValues,
  ProcedureAsciiDocParser,
} from '@cloudmosaic/quickstarts';
import template from './TEMPLATE_PROCEDURE.adoc';

export const QuickStarts = ({ children }) => {
  debugger;
  const allQuickStarts = [
    ProcedureAsciiDocParser(template, {
      attributes: {
        context: 'template',
        'qs-id': 'template-id',
        'qs-duration-minutes': 5,
      },
    }),
  ];
  const [activeQuickStartID, setActiveQuickStartID] = useLocalStorage('quickstartId', '');
  const [allQuickStartStates, setAllQuickStartStates] = useLocalStorage('quickstarts', {});
  const { pathname: currentPath } = window.location;
  const quickStartPath = '/quickstarts';
  const valuesForQuickstartContext = useValuesForQuickStartContext({
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
    <QuickStartContext.Provider value={valuesForQuickstartContext}>
      <QuickStartDrawer>{children}</QuickStartDrawer>
    </QuickStartContext.Provider>
  );
};

// const SomeNestedComponent = () => {
//   const qsContext = React.useContext<QuickStartContextValues>(QuickStartContext);
//   return (
//     <button onClick={() => qsContext.setActiveQuickStart('a quickstart id')}>
//       Open a quickstart from a nested component
//     </button>
//   );
// };
