import * as React from 'react';
import { FetchState } from '~/utilities/useFetchState';
import { FAST_POLL_INTERVAL } from '~/utilities/const';

/**
 * @deprecated -- remove before production
 * TODO: HACK, remove asap
 * https://issues.redhat.com/browse/RHODS-6921 will create us a status to know when the
 * DS Pipeline server is fully installed. Until then, we can just keep pinging the route until it
 * stops giving us a not ready HTML page.
 */
const usePipelineRefreshHack = <T>(fetchStateOutput: FetchState<T>): FetchState<T> => {
  const [v, l, errorState, refresh] = fetchStateOutput;
  const hasError = errorState?.message.includes('<'); // not ready HTML page
  React.useEffect(() => {
    let interval;
    if (hasError) {
      interval = setInterval(refresh, FAST_POLL_INTERVAL);
    }

    return () => {
      clearInterval(interval);
    };
  }, [hasError, refresh]);

  // Thread information forward, but ignore the error when it's in the "not ready" state
  if (hasError) {
    return [v, l, undefined, refresh];
  }

  return fetchStateOutput;
};

export default usePipelineRefreshHack;
