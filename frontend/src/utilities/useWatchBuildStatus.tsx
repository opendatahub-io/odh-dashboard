import * as React from 'react';
import { AlertVariant, List, ListItem, Stack, StackItem } from '@patternfly/react-core';
import { BuildPhase, BuildStatus } from '#~/types';
import { fetchBuildStatuses } from '#~/services/buildsService';
import { addNotification } from '#~/redux/actions/actions';
import { useAppDispatch } from '#~/redux/hooks';
import { useDeepCompareMemoize } from './useDeepCompareMemoize';
import { POLL_INTERVAL } from './const';

const runningStatuses = [
  BuildPhase.new,
  BuildPhase.pending,
  BuildPhase.running,
  BuildPhase.cancelled,
];
const failedStatuses = [BuildPhase.failed];

const filterBuilds = (buildStatuses: BuildStatus[], filterStatuses: BuildPhase[]): BuildStatus[] =>
  buildStatuses.filter((buildStatus) => filterStatuses.includes(buildStatus.status));

export const useWatchBuildStatus = (): BuildStatus[] => {
  const [statuses, setStatuses] = React.useState<BuildStatus[]>([]);
  const prevBuildStatuses = React.useRef<BuildStatus[]>([]);
  const dispatch = useAppDispatch();

  React.useEffect(() => {
    let watchHandle: ReturnType<typeof setTimeout>;
    const watchBuildStatuses = () => {
      fetchBuildStatuses()
        .then((buildStatuses: BuildStatus[]) => {
          setStatuses(buildStatuses.toSorted((a, b) => a.name.localeCompare(b.name)));
        })
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .catch(() => {});
      watchHandle = setTimeout(watchBuildStatuses, POLL_INTERVAL);
    };
    watchBuildStatuses();

    return () => {
      clearTimeout(watchHandle);
    };
  }, []);

  const buildStatuses = useDeepCompareMemoize(statuses);

  React.useEffect(() => {
    const wasNotStarted = filterBuilds(prevBuildStatuses.current, [BuildPhase.none]);
    const wasBuilding = filterBuilds(prevBuildStatuses.current, runningStatuses);
    const wasFailed = filterBuilds(prevBuildStatuses.current, failedStatuses);
    const notStarted = filterBuilds(buildStatuses, [BuildPhase.none]);
    const building = filterBuilds(buildStatuses, runningStatuses);
    const failed = filterBuilds(buildStatuses, failedStatuses);
    const complete = filterBuilds(buildStatuses, [BuildPhase.complete]);

    // Add notifications for new failures
    if (failed.length > 0) {
      failed.forEach((failedBuild) => {
        if (!wasFailed.find((prevFailedBuild) => failedBuild.name === prevFailedBuild.name)) {
          dispatch(
            addNotification({
              status: AlertVariant.danger,
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
          status: AlertVariant.danger,
          title: 'These notebook image builds have not started:',
          message: (
            <Stack hasGutter>
              <StackItem>
                <List>
                  {notStarted.map((build) => (
                    <ListItem key={build.name}>{build.name}</ListItem>
                  ))}
                </List>
              </StackItem>
              <StackItem>Contact your administrator to start the builds.</StackItem>
            </Stack>
          ),
          timestamp: new Date(),
        }),
      );
    }

    // Add notification if builds are now running
    if (building.length && !wasBuilding.length) {
      dispatch(
        addNotification({
          status: AlertVariant.info,
          title: 'Workbench images are building.',
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
      let status: AlertVariant = AlertVariant.success;
      let message;
      if (failed.length) {
        status = complete.length ? AlertVariant.warning : AlertVariant.danger;
        message = (
          <Stack hasGutter>
            <StackItem>
              {complete.length} of {failed.length + complete.length} builds completed successfully.
            </StackItem>
            <StackItem>
              <List>
                {failed.map((build) => (
                  <ListItem key={build.name}>{build.name} build image failed.</ListItem>
                ))}
              </List>
            </StackItem>
            <StackItem>Contact your administrator to retry failed images.</StackItem>
          </Stack>
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

  return buildStatuses;
};
