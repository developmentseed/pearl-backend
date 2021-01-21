'use strict';

const k8s = require('@kubernetes/client-node');

class Kube {
  constructor(namespace) {
    this.kc = new k8s.KubeConfig();
    this.kc.loadFromDefault();
    this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
    this.namespace = namespace || 'default';
  }

  async listPods() {
    const res = await this.k8sApi.listNamespacedPod(this.namespace);
    return res.body;
  }
}

module.exports = {
  Kube
};