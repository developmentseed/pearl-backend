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

  makePodSpec(name) {
    return {
      apiVersion: "v1",
      kind: "Pod",
      metadata: {
        name: `gpu-${name}`
      },
      spec: {
        containers: [
          {
            name: `gpu-${name}`,
            image: `${process.env.GpuImageName}:${process.env.GpuImageTag}`,
          }
        ]
      }
    };
  }

  async createpod(podSpec) {
    const res = await this.k8sApi.createNamespacedPod('default', podSpec);
    return res.body;
  }
}

module.exports = {
  Kube
};