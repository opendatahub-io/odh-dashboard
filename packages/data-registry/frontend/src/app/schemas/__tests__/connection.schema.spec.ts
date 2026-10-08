/* eslint-disable camelcase */

import { connectionsResponseSchema } from '~/app/schemas/connection.schema';

describe('connectionsResponseSchema', () => {
  it('should accept display-only RHOAI metadata alongside selectable DCH connections', () => {
    const response = {
      data: [
        {
          type: 'dch',
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Current DCH connection',
          connectionType: 'postgres',
        },
      ],
      metadata: {
        rhaiConnections: [
          {
            type: 'rhai',
            secret_name: 'legacy-rhai-connection',
            name: 'Existing RHOAI connection',
            connectionType: 's3',
          },
        ],
      },
    };

    expect(connectionsResponseSchema.parse(response)).toEqual(response);
  });
});
