/* eslint-env jest */
const { toMatchContract } = require('../matchers/toMatchContract');

expect.extend({ toMatchContract });
