'use strict';

const k8s = require('@kubernetes/client-node');

/**
 * @class Kube
 */
class Kube {

    /**
     * Kubernetes Client
     *
     * @param {Config} config Server Config
     * @param {String} [namespace="default"] - Client Namespace
     */
    constructor(config, namespace) {
        this.config = config;
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
     *
     * @param {String} name
     * @param {Object} env
     */
    makePodSpec(name, env) {
        const nodeSelectorKey = this.config.nodeSelectorKey;
        const nodeSelectorValue = this.config.nodeSelectorValue;
        const deploymentName = this.config.Deployment;
        const gpuImageName = this.config.GpuImageName;
        const gpuImageTag = this.config.GpuImageTag;

        const nodeSelector = {};
        nodeSelector[nodeSelectorKey] = nodeSelectorValue;

        return {
            apiVersion: 'v1',
            kind: 'Pod',
            metadata: {
                name: `${deploymentName}-gpu-${name}`
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
                nodeSelector: nodeSelector
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
     *
     * Delete a pod based on the name
     */

    async deletePod(name) {
        const res = await this.k8sApi.deleteNamespacedPod(name, this.namespace);
        if (res.statusCode >= 400) {
            return `REquest failed: ${res.statusMessage}`;
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
