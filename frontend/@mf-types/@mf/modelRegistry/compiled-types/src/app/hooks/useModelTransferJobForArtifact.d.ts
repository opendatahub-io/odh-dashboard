import { FetchState } from 'mod-arch-core';
import { ModelTransferJob } from '~/app/types';
import { TransferJobParams } from '~/concepts/modelRegistry/types';
declare const useModelTransferJobForArtifact: (transferJobParams: TransferJobParams | null) => FetchState<ModelTransferJob | null>;
export default useModelTransferJobForArtifact;
