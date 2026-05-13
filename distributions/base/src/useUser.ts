import { useEffect, useState } from 'react';

type UserState = {
  user: string | null;
  loading: boolean;
  error: string | null;
};

export const useUser = (): UserState => {
  const [state, setState] = useState<UserState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/status', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then((data: { user: string }) => {
        setState({ user: data.user, loading: false, error: null });
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') {
          setState({ user: null, loading: false, error: err.message });
        }
      });
    return () => controller.abort();
  }, []);

  return state;
};
