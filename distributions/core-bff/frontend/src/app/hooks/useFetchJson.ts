import { useEffect, useState } from 'react';
import { URL_PREFIX } from '~/app/utilities/const';

type FetchState<T> = { data: T | null; loaded: boolean; error?: string };

const useFetchJson = <T>(path: string | null): FetchState<T> => {
  const [state, setState] = useState<FetchState<T>>({ data: null, loaded: false });

  useEffect(() => {
    if (path === null) {
      setState({ data: null, loaded: true });
      return;
    }

    let cancelled = false;
    const doFetch = async () => {
      try {
        const resp = await fetch(`${URL_PREFIX}${path}`);
        if (!resp.ok) {
          if (!cancelled) {
            setState({ data: null, loaded: true, error: `HTTP ${resp.status}` });
          }
          return;
        }
        const data: T = await resp.json();
        if (!cancelled) {
          setState({ data, loaded: true });
        }
      } catch (err) {
        if (!cancelled) {
          setState({ data: null, loaded: true, error: String(err) });
        }
      }
    };

    setState({ data: null, loaded: false });
    doFetch();

    return () => {
      cancelled = true;
    };
  }, [path]);

  return state;
};

export default useFetchJson;
