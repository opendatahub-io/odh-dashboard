import * as React from 'react';
/**
 * ODH-specific override of ModelCatalogCoreLoader that includes admin user detection
 * for showing the appropriate action link in empty states:
 * - Admin users see "Go to Model catalog settings" link
 * - Non-admin users see "Who's my administrator" link
 */
declare const OdhModelCatalogCoreLoader: React.FC;
export default OdhModelCatalogCoreLoader;
