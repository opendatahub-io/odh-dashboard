/* eslint-disable camelcase -- UIErrors may have messageId's of different cases. Don't enforce case for keys */

import type { UIErrorMappings } from '~/app/components/common/UIError/types.ts';

export const autoragUIErrorMappings: UIErrorMappings = {
  unsupported_multiple_json_request: {
    title: 'Unsupported request type',
    description: 'An unsupported pipeline request was provided, check the request and try again.',
  },
};
