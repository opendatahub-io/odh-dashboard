import * as React from 'react';
import RuntimeCatalogDetailsView from './RuntimeCatalogDetailsView';

/**
 * Full-page breakout route for the runtime catalog details page.
 *
 * Registered as a standalone `app.route` so the details page renders with its
 * own breadcrumb rather than inside the tabbed page chrome.
 *
 * The `:runtimeName` param is captured by the extension route path — this
 * component renders the view directly.
 */
const RuntimeCatalogDetailsRoutes: React.FC = () => <RuntimeCatalogDetailsView />;

export default RuntimeCatalogDetailsRoutes;
