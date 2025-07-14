import { AppState } from '#~/redux/types';
import { useAppSelector } from '#~/redux/hooks';
import { isStateEqual } from '#~/redux/selectors/utils';
import { ClusterState } from './types';

const getClusterInfo = (state: AppState): ClusterState => ({
  clusterID: state.clusterID,
  clusterBranding: state.clusterBranding,
  serverURL: state.serverURL,
});

export const useClusterInfo = (): ClusterState => useAppSelector(getClusterInfo, isStateEqual);
