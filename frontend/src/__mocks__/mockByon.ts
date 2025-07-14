/* eslint-disable camelcase */
import * as _ from 'lodash-es';

import { RecursivePartial } from '#~/typeHelpers';
import { BYONImage } from '#~/types';

export const mockByon = (opts?: RecursivePartial<BYONImage[]>): BYONImage[] =>
  _.merge(
    [
      {
        id: '0c2e4fcf-b330-4da2-80b1-49a3febd2172',
        name: 'byon-123',
        display_name: 'Testing Custom Image',
        description: 'A custom notebook image',
        recommendedAcceleratorIdentifiers: [],
        visible: true,
        packages: [
          {
            name: 'test-package',
            version: '1.0',
            visible: true,
          },
        ],
        software: [
          {
            name: 'test-software',
            version: '2.0',
            visible: true,
          },
        ],
        imported_time: '2023-10-12T18:35:36Z',
        url: 'vault.habana.ai/gaudi-docker/1.11.0/rhel8.6/habanalabs/tensorflow-installer-tf-cpu-2.12.1:latest',
        provider: 'admin',
        error: '',
      },
    ],
    opts,
  );
