import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: './.env.test.local' });
dotenv.config({ path: './.env.test' });
dotenv.config({ path: './.env' });

if (process.env.ODH_IS_PROJECT_ROOT_DIR === 'false') {
  dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env.test.local') });
  dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env.test') });
  dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });
}

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({}));
