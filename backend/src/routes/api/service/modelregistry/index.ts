import { proxyService } from '../../../../utils/proxy';

export default proxyService(null, {
  suffix: '-rest',
  route: true,
});
