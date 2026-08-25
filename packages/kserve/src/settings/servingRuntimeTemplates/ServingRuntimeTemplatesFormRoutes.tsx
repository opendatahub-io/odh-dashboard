import * as React from 'react';
import { useMatch } from 'react-router-dom';
import CustomServingRuntimeContextProvider from './CustomServingRuntimeContext';
import CustomServingRuntimeAddTemplate, {
  ServingRuntimeTemplateFormByName,
} from './CustomServingRuntimeAddTemplate';
import { SERVING_RUNTIME_TEMPLATES_TAB_PATH } from './paths';

/**
 * Full-page breakout routes for the serving runtime add/edit/duplicate forms when
 * the tabbed Model deployment settings page is enabled.
 *
 * Registered as their own `app.route` extensions rather than as tab content, so
 * the forms render with their own breadcrumb and title instead of nested beneath
 * the page title and tab bar.
 *
 * There is deliberately no nested `<Routes>` here. Each extension registers an
 * exact path, so by the time this renders the parent route has already consumed
 * the whole pathname and a descendant router would match nothing and render
 * blank. The mode is therefore resolved from the location directly.
 */
const ServingRuntimeTemplatesFormRoutes: React.FC = () => {
  const isEdit =
    useMatch(`${SERVING_RUNTIME_TEMPLATES_TAB_PATH}/edit/:servingRuntimeName`) !== null;
  const isDuplicate =
    useMatch(`${SERVING_RUNTIME_TEMPLATES_TAB_PATH}/duplicate/:servingRuntimeName`) !== null;

  return (
    <CustomServingRuntimeContextProvider>
      {isEdit || isDuplicate ? (
        <ServingRuntimeTemplateFormByName mode={isEdit ? 'edit' : 'duplicate'} />
      ) : (
        <CustomServingRuntimeAddTemplate mode="add" />
      )}
    </CustomServingRuntimeContextProvider>
  );
};

export default ServingRuntimeTemplatesFormRoutes;
