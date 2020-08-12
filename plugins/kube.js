"use strict";

const fs = require("fs");
const fp = require("fastify-plugin");
const k8s = require("@kubernetes/client-node");

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const currentContext = kc.getCurrentContext();
const customObjectsApi = kc.makeApiClient(k8s.CustomObjectsApi);

module.exports = fp(async function (fastify, opts) {
  let namespace;
  try {
    namespace = await getCurrentNamespace();
  } catch (e) {
    fastify.log.error(e, "Failed to retrieve current namespace");
  }

  fastify.decorate("kube", {
    config: kc,
    currentContext,
    namespace,
    customObjectsApi,
  });
});

async function getCurrentNamespace() {
  return new Promise((resolve, reject) => {
    if (currentContext === "inClusterContext") {
      fs.readFile(
        "/var/run/secrets/kubernetes.io/serviceaccount/namespace",
        "utf8",
        function (err, data) {
          if (err) {
            reject(err);
          }
          resolve(data);
        }
      );
    } else {
      resolve(currentContext.split("/")[0]);
    }
  });
}
