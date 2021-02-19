const _ = require('lodash');
const getQuickStarts = require('../../../quickstarts/getQuickStarts');

module.exports = function () {
  return Promise.resolve(getQuickStarts());
};
