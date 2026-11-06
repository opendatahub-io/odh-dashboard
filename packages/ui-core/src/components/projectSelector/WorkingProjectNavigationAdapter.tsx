import * as React from 'react';
import {
  createPath,
  resolvePath,
  useLocation,
  useNavigate,
  useResolvedPath,
} from 'react-router-dom';
import {
  useWorkingProject,
  type WorkingProjectNavigationTransaction,
} from '../../context/WorkingProjectContext';

type WorkingProjectNavigationAdapterProps = {
  getRedirectPath: (namespace: string) => string;
};

/** Register only on working-project surfaces, never on viewed-project details routes. */
const WorkingProjectNavigationAdapter: React.FC<WorkingProjectNavigationAdapterProps> = ({
  getRedirectPath,
}) => {
  const { registerProjectNavigation } = useWorkingProject();
  const navigate = useNavigate();
  const location = useLocation();
  const routeBase = useResolvedPath('.').pathname;
  const latest = React.useRef({ getRedirectPath, location, navigate, routeBase });
  const pending = React.useRef<{
    target: string;
    transaction: WorkingProjectNavigationTransaction;
  } | null>(null);
  React.useLayoutEffect(() => {
    latest.current = { getRedirectPath, location, navigate, routeBase };
  });

  React.useLayoutEffect(() => {
    const request = pending.current;
    if (request) {
      pending.current = null;
      if (request.target === `${location.pathname}${location.search}${location.hash}`) {
        request.transaction.commit();
      } else {
        request.transaction.cancel();
      }
    }
  }, [location]);

  React.useLayoutEffect(
    () => () => {
      pending.current?.transaction.cancel();
      pending.current = null;
    },
    [],
  );

  React.useLayoutEffect(
    () =>
      registerProjectNavigation?.((project, transaction) => {
        const { current } = latest;
        const supersedesNavigation = pending.current !== null;
        pending.current?.transaction.cancel();
        // Only the surface knows which query, hash, and detail state survive a switch.
        try {
          const destination = current.getRedirectPath(project.name);
          const target = createPath(
            resolvePath(
              destination,
              destination.startsWith('?') || destination.startsWith('#')
                ? current.location.pathname
                : current.routeBase,
            ),
          );
          if (
            supersedesNavigation ||
            target !==
              `${current.location.pathname}${current.location.search}${current.location.hash}`
          ) {
            // A same-location navigation still aborts a superseded loader/lazy transition.
            pending.current = { target, transaction };
            const result = current.navigate(target, { replace: true });
            if (result) {
              void result.catch(() => {
                if (pending.current?.transaction === transaction) {
                  pending.current = null;
                  transaction.cancel();
                }
              });
            }
          } else {
            pending.current = null;
            transaction.commit();
          }
        } catch {
          pending.current = null;
          transaction.cancel();
        }
      }),
    [registerProjectNavigation],
  );

  return null;
};

export default WorkingProjectNavigationAdapter;
