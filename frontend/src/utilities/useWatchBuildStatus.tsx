import * as React from 'react';
import { useDispatch } from 'react-redux';
import { BUILD_PHASE, BuildStatus } from '../types';
import { POLL_INTERVAL } from './const';
import { useDeepCompareMemoize } from './useDeepCompareMemoize';
import { fetchBuildStatuses } from '../services/buildsService';
import { addNotification } from '../redux/actions/actions';
import { AppNotificationStatus } from '../redux/types';

const runningStatuses = [
  BUILD_PHASE.new,
  BUILD_PHASE.pending,
  BUILD_PHASE.running,
  BUILD_PHASE.cancelled,
];
const failedStatuses = [BUILD_PHASE.failed];

const filterBuilds = (
  buildStatuses: BuildStatus[],
  filterStatuses: BUILD_PHASE[],
): BuildStatus[] => {
  return buildStatuses.filter((buildStatus) => filterStatuses.includes(buildStatus.status));
};

export const useWatchBuildStatus = (): void => {
  const [statuses, setStatuses] = React.useState<BuildStatus[]>([]);
  const prevBuildStatuses = React.useRef<BuildStatus[]>([]);
  const dispatch = useDispatch();

  React.useEffect(() => {
    let watchHandle;
    const watchBuildStatuses = () => {
      fetchBuildStatuses()
        .then((statuses: BuildStatus[]) => {
          statuses.sort((a, b) => a.name.localeCompare(b.name));
          setStatuses(statuses);
        })
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .catch(() => {});
      watchHandle = setTimeout(watchBuildStatuses, POLL_INTERVAL);
    };
    watchBuildStatuses();

    return () => {
      if (watchHandle) {
        clearTimeout(watchHandle);
      }
    };
  }, []);

  const buildStatuses = useDeepCompareMemoize<BuildStatus[]>(statuses);

  React.useEffect(() => {
    if (!buildStatuses) {
      return;
    }
    const wasNotStarted = filterBuilds(prevBuildStatuses.current, [BUILD_PHASE.none]);
    const wasBuilding = filterBuilds(prevBuildStatuses.current, runningStatuses);
    const wasFailed = filterBuilds(prevBuildStatuses.current, failedStatuses);
    const notStarted = filterBuilds(buildStatuses, [BUILD_PHASE.none]);
    const building = filterBuilds(buildStatuses, runningStatuses);
    const failed = filterBuilds(buildStatuses, failedStatuses);
    const complete = filterBuilds(buildStatuses, [BUILD_PHASE.complete]);

    // Add notifications for new failures
    if (failed.length > 0) {
      failed.forEach((failedBuild) => {
        if (!wasFailed.find((prevFailedBuild) => failedBuild.name === prevFailedBuild.name)) {
          dispatch(
            addNotification({
              status: 'danger',
              title: `Notebook image build ${failedBuild.name} failed.`,
              timestamp: new Date(),
            }),
          );
        }
      });
    }

    // Add notifications for new not started
    if (notStarted.length && !wasNotStarted.length) {
      dispatch(
        addNotification({
          status: 'danger',
          title: 'These notebook image builds have not started:',
          message: (
            <div className="odh-dashboard__notifications__message">
              <ul className="odh-dashboard__notifications__list">
                {notStarted.map((build) => (
                  <li key={build.name}>{build.name}</li>
                ))}
              </ul>
              Contact your administrator to start the builds.
            </div>
          ),
          timestamp: new Date(),
        }),
      );
    }

    // Add notification if builds are now running
    if (building.length && !wasBuilding.length) {
      dispatch(
        addNotification({
          status: 'info',
          title: 'Notebook images are building.',
          timestamp: new Date(),
        }),
      );
    }

    // Add notification if all builds are now complete
    if (
      complete.length &&
      (wasBuilding.length || wasNotStarted.length) &&
      !building.length &&
      !notStarted.length
    ) {
      let status: AppNotificationStatus = 'success';
      let message;
      if (failed.length) {
        status = complete.length ? 'warning' : 'danger';
        message = (
          <div className="odh-dashboard__notifications__message">
            {complete.length} of {failed.length + complete.length} builds completed successfully.
            <ul className="odh-dashboard__notifications__list">
              {failed.map((build) => (
                <li key={build.name}>{build.name} build image failed.</li>
              ))}
            </ul>
            Contact your administrator to retry failed images.
          </div>
        );
      }
      dispatch(
        addNotification({
          status,
          title: 'All notebook image builds are complete.',
          message,
          timestamp: new Date(),
        }),
      );
    }

    prevBuildStatuses.current = buildStatuses;
  }, [buildStatuses, dispatch]);
};
