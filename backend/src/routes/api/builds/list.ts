import { getBuildStatuses } from '../../../utils/resourceUtils';
import { BuildStatus } from '../../../types';

export const listBuilds = async (): Promise<BuildStatus[]> => getBuildStatuses();
