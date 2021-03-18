require('./dotenv');

const PORT = process.env.PORT || process.env.BACKEND_PORT || 8080;
const IP = process.env.IP || '0.0.0.0';
const LOG_LEVEL = process.env.FASTIFY_LOG_LEVEL || process.env.LOG_LEVEL || 'info';
const DEV_MODE = process.env.APP_ENV === 'development';

const yamlRegExp = /\.ya?ml$/;
const mdRegExp = /\.md$/;

module.exports = {
  PORT,
  IP,
  LOG_LEVEL,
  APP_ENV: process.env.APP_ENV,
  DEV_MODE,
  yamlRegExp,
  mdRegExp,
};
