'use strict';

const k8s = require('@kubernetes/client-node');
class Kube {

    /**
   * Kubernetes Client
   * Create a client using a namespace. Default is default.
   */
    constructor(namespace) {
        this.kc = new k8s.KubeConfig();
        this.kc.loadFromDefault();
        this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
        this.namespace = namespace || 'default';
    }

    /**
     * Method to list pods in the cluster
     */
    async listPods() {
        const res = await this.k8sApi.listNamespacedPod(this.namespace);
        if (res.statusCode >= 400) {
            return `Request failed: ${res.statusMessage}`;
        }
        return res.body;
    }

    /**
     * Create a podspec for a gpu pod based on a given name and env vars.
     * env should be for example: [{name: test, value: test}, {name: test1, value: test1}]
     */
    makePodSpec(name, env) {
        const nodeSelectorKey = process.env.nodeSelectorKey;
        const nodeSelectorValue = process.env.nodeSelectorValue;
        const gpuImageName = process.env.GpuImageName;
        const gpuImageTag = process.env.GpuImageTag;

        return {
            apiVersion: 'v1',
            kind: 'Pod',
            metadata: {
                name: `gpu-${name}`
            },
            spec: {
                containers: [
                    {
                        name: `gpu-${name}`,
                        image: `${gpuImageName}:${gpuImageTag}`,
                        resources: {
                            limits: {
                                'nvidia.com/gpu': 1
                            }
                        },
                        env: env
                    }
                ],
                nodeSelector: `${nodeSelectorKey}:${nodeSelectorValue}`
            }
        };
    }

    /**
     * Create a pod based on podSpec
     */
    async createPod(podSpec) {
        const res = await this.k8sApi.createNamespacedPod(this.namespace, podSpec);
        if (res.statusCode >= 400) {
            return `Request failed: ${res.statusMessage}`;
        }
        return res.body;
    }

    /**
     * Get pod details
     */
    async getPod(name) {
        const res = await this.k8sApi.readNamespacedPod(name, this.namespace);
        if (res.statusCode >= 400) {
            return `Request failed: ${res.statusMessage}`;
        }
        return res.body;
    }

    /**
     * Get pod status.
     */
    async getPodStatus(name) {
        const res = await this.k8sApi.readNamespacedPodStatus(name, this.namespace);
        if (res.statusCode >= 400) {
            return `Request failed: ${res.statusMessage}`;
        }
        return res.body;
    }
}

module.exports = {
    Kube
};
