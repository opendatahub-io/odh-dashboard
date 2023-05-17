import * as React from 'react';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';

/**
 * Projects are stored at the app level -- some pages are *really* Project specific. Auto refreshing
 * on mount is useful to consume old state & refresh for new state.
 */
const useMountProjectRefresh = () => {
  const { refresh } = React.useContext(ProjectsContext);
  // We care about the latest refresh, but we don't want to react on it
  const lastRefreshRef = React.useRef(() => Promise.resolve());
  lastRefreshRef.current = refresh;

  React.useEffect(() => {
    // Only on mount fire
    lastRefreshRef.current();
  }, []);
};

export default useMountProjectRefresh;
