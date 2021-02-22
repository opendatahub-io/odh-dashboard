import path from 'path';
import dotenv from 'dotenv';
import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

dotenv.config({ path: './.env.test.local' });
dotenv.config({ path: './.env.test' });
dotenv.config({ path: './.env' });

if (process.env.ODH_IS_PROJECT_ROOT_DIR === 'false') {
  dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env.test.local') });
  dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env.test') });
  dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });
}

configure({ adapter: new Adapter() });
