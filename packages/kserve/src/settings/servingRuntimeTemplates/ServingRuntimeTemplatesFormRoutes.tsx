import * as React from 'react';
import { useMatch } from 'react-router-dom';
import ServingRuntimeTemplatesFormPlaceholder from './ServingRuntimeTemplatesFormPlaceholder';
import { SERVING_RUNTIME_TEMPLATES_TAB_PATH } from './paths';

/**
 * Full-page breakout routes for the serving runtime forms when the tabbed Model
 * deployment settings page is enabled.
 *
 * These are placeholders — the real add/edit/duplicate forms are migrated in
 * RHOAIENG-68986. Until then they render an "under construction" page so the
 * tab's Add/Edit/Duplicate actions resolve to a real destination instead of
 * redirecting back to the list.
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

  const mode = isEdit ? 'edit' : isDuplicate ? 'duplicate' : 'add';
  return <ServingRuntimeTemplatesFormPlaceholder mode={mode} />;
};

export default ServingRuntimeTemplatesFormRoutes;
