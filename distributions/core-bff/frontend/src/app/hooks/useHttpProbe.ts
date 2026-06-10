import { useEffect, useState } from 'react';
import { URL_PREFIX } from '~/app/utilities/const';

type ProbeResult = { status: number | null; loaded: boolean };

const useHttpProbe = (path: string | null): ProbeResult => {
  const [state, setState] = useState<ProbeResult>({ status: null, loaded: false });

  useEffect(() => {
    if (path === null) {
      setState({ status: null, loaded: true });
      return;
    }

    let cancelled = false;
    const doProbe = async () => {
      try {
        const resp = await fetch(`${URL_PREFIX}${path}`);
        if (!cancelled) {
          setState({ status: resp.status, loaded: true });
        }
      } catch {
        if (!cancelled) {
          setState({ status: null, loaded: true });
        }
      }
    };

    setState({ status: null, loaded: false });
    doProbe();

    return () => {
      cancelled = true;
    };
  }, [path]);

  return state;
};

export default useHttpProbe;
