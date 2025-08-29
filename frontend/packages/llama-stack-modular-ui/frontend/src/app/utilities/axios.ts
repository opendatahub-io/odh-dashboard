// eslint-disable-next-line no-restricted-imports
import axios from 'axios';

export default axios.create({
  headers: {
    Authorization: `Bearer ${process.env.AUTH_TOKEN || 'dummy-token'}`,
  }, //Requests are failing with 'missing required Header: Authorization' without this.
});
