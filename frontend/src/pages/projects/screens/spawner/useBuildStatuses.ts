import * as React from 'react';
import { getNotebookBuildConfigs, getBuildsForBuildConfig } from '#~/api';
import useNotification from '#~/utilities/useNotification';
import { BuildConfigKind, BuildPhase } from '#~/k8sTypes';
import { BuildStatus } from './types';
import { compareBuilds } from './spawnerUtils';

const useBuildStatuses = (namespace?: string): BuildStatus[] => {
  const notification = useNotification();
  const [buildStatuses, setBuildStatuses] = React.useState<BuildStatus[]>([]);

  React.useEffect(() => {
    const getBuildStatus = async (
      ns: string,
      buildConfig: BuildConfigKind,
    ): Promise<BuildStatus> => {
      const bcName = buildConfig.metadata.name;
      const buildNotebookName =
        buildConfig.metadata.labels?.['opendatahub.io/notebook-name'] || bcName;
      return getBuildsForBuildConfig(ns, bcName)
        .then((builds) => {
          if (builds.length <= 0) {
            return {
              name: buildNotebookName,
              status: BuildPhase.NONE,
              imageStreamVersion: buildConfig.spec.output.to.name,
            };
          }
          const mostRecent = builds.toSorted(compareBuilds)[builds.length - 1];
          return {
            name: buildNotebookName,
            status: mostRecent.status.phase,
            imageStreamVersion: mostRecent.spec.output.to.name,
            timestamp: mostRecent.status.completionTimestamp || mostRecent.status.startTimestamp,
          };
        })
        .catch((e) => {
          notification.error(`failed to get builds of ${buildNotebookName}`, e);
          return {
            name: buildNotebookName,
            status: BuildPhase.PENDING,
            imageStreamVersion: buildConfig.spec.output.to.name,
          };
        });
    };
    if (namespace) {
      getNotebookBuildConfigs(namespace)
        .then((buildConfigs) => {
          const getter = buildConfigs.map((buildConfig) => getBuildStatus(namespace, buildConfig));
          Promise.all(getter).then((buildStatusesRes) => setBuildStatuses(buildStatusesRes));
        })
        .catch((e) => {
          setBuildStatuses([]);
          notification.error('Error getting build configs', e);
        });
    }
  }, [namespace, notification]);

  return buildStatuses;
};

export default useBuildStatuses;
