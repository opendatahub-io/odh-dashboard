import { getDSGProjects } from '~/api';
import { ProjectKind } from '~/k8sTypes';
import useFetchState, { FetchState } from '~/utilities/useFetchState';

const useUserProjects = (): FetchState<ProjectKind[]> => useFetchState(getDSGProjects, []);

export default useUserProjects;
