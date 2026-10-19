import { usePipelineRunQuery as useCorePipelineRunQuery } from '@odh-dashboard/autox-core/ui/hooks';
import { ConfigureSchema } from '~/app/schemas/configure.schema';

export const usePipelineRunQuery = useCorePipelineRunQuery<ConfigureSchema>;
