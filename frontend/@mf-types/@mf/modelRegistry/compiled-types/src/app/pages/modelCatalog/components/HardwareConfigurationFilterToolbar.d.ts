import * as React from 'react';
type HardwareConfigurationFilterToolbarProps = {
    onResetAllFilters?: () => void;
    /** If true, shows basic filter chips. Defaults to false (only show on landing page when toggle is ON). */
    includeBasicFilters?: boolean;
    /** If true, shows performance filter chips. Landing page passes performanceViewEnabled, details page passes true. */
    includePerformanceFilters?: boolean;
    /** Optional content to render at the end of the toolbar (e.g., manage columns button). */
    toolbarActions?: React.ReactNode;
};
declare const HardwareConfigurationFilterToolbar: React.FC<HardwareConfigurationFilterToolbarProps>;
export default HardwareConfigurationFilterToolbar;
