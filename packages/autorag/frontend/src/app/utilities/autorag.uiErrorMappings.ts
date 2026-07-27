/* eslint-disable camelcase -- UIErrors may have messageId's of different cases. Don't enforce case for keys */

import type { UIErrorMappings } from '~/app/components/common/UIError/types.ts';

export const autoragUIErrorMappings: UIErrorMappings = {
  unsupported_pipeline_type: {
    title: 'Unsupported pipeline type',
    description: 'An unsupported pipeline type provided, try again with a supported pipeline.',
  },
};
