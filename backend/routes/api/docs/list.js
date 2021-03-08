const docUtils = require('./docUtils');

module.exports = async ({ fastify, request }) => {
  // Fetch the installed quick starts
  let docs = await docUtils.getDocs(fastify);
  if (request.query.type) {
    docs = docs.filter((doc) => doc.metadata.type === request.query.type);
  }

  return await Promise.all(docs);
};
