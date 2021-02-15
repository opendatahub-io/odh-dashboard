import "@patternfly/patternfly/base/patternfly-shield-inheritable.css";
import "@patternfly/patternfly/utilities/Accessibility/accessibility.css";
import "@patternfly/react-catalog-view-extension/dist/css/react-catalog-view-extension.css";
import "@cloudmosaic/quickstarts/dist/quickstarts.css";
import React from 'react';
import {
  QuickStartDrawer,
  QuickStartContext,
  useValuesForQuickStartContext,
  useLocalStorage,
  ProcedureAsciiDocParser,
} from '@cloudmosaic/quickstarts';
import template from './data/TEMPLATE_PROCEDURE.adoc';
import addHealthChecks from './data/add-healthchecks-quickstart.yaml';

/*
To load a quickstart from a nested component, import and use the QuickStartContext.
Ex:
import { QuickStartContext, QuickStartContextValues } from '@cloudmosaic/quickstarts';
...
const qsContext = React.useContext<QuickStartContextValues>(QuickStartContext);
const qsButton = (
  <button
    onClick={() => qsContext.setActiveQuickStart && qsContext.setActiveQuickStart('template-id')}
  >
    Open a quickstart from a nested component
  </button>
);
*/

export const QuickStarts = ({ children }) => {
  const allQuickStarts = [
    // ascii doc files need a parser
    ProcedureAsciiDocParser(template, {
      attributes: {
        context: 'template',
        'qs-id': 'template-id',
        'qs-duration-minutes': 5,
      },
    }),
    // yaml files are supported natively
    addHealthChecks
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
