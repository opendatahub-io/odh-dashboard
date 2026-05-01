import { FetchState } from 'mod-arch-core';
import { ModelTransferJobList } from '~/app/types';
declare const useModelTransferJobs: (jobNamespace?: string) => FetchState<ModelTransferJobList>;
export default useModelTransferJobs;
