/* eslint-disable camelcase -- UIErrors may have messageId's of different cases. Don't enforce case for keys */

import type { UIErrorMappings } from '~/app/components/common/UIError/types.ts';

export const autoragUIErrorMappings: UIErrorMappings = {
  example_ui_error_invalid_pipeline_run_name: {
    title: 'Invalid AutoRAG optimization run',
    description: 'You cannot name your run that. Try again with a different name',
  },
};
