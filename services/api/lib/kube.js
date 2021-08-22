

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
     * Method to list GPU pods in the cluster
     */
    async listPods() {
        const res = await this.k8sApi.listNamespacedPod(this.namespace, undefined, undefined, undefined, undefined, 'type=gpu');
        if (res.statusCode >= 400) {
            return `Request failed: ${res.statusMessage}`;
        }

        if (res.body.items) {
            return res.body.items;
        } else {
            return [];
        }
    }

    /**
     * Create a podspec for a gpu pod based on a given name, type (gpu or cpu) and env vars.
     * env should be for example: [{name: test, value: test}, {name: test1, value: test1}]
     *
     * @param {String} name
     * @param {String} type
     * @param {Object} env
     */
    makePodSpec(name, type, env) {
        const nodeSelectorKey = this.config.nodeSelectorKey;
        const nodeSelectorValue = this.config.nodeSelectorValue;
        const deploymentName = this.config.Deployment;
        const gpuImageName = this.config.GpuImageName;
        const gpuImageTag = this.config.GpuImageTag;

        let resources;
        if (type === 'gpu') {
            resources = {
                limits: {
                    'nvidia.com/gpu': 1
                }
            };
        }

        if (type === 'cpu') {
            resources = {
                requests: {
                    'cpu': '4',
                    'memory': '8Gi'
                },
                limits: {
                    'cpu': '8',
                    'memory': '16Gi'
                }
            };
        }
        // if (deploymentName === 'lulc-production-lulc-helm') {
        //     resources = {
        //         requests: {
        //             'cpu': '2',
        //             'memory': '2Gi'
        //         },
        //         limits: {
        //             'cpu': '4',
        //             'memory': '8Gi'
        //         }
        //     }
        // } else {
        //     resources = {
        //             limits: {
        //                 'nvidia.com/gpu': 1
        //             }
        //         }
        // }
        const nodeSelector = {};
        nodeSelector[nodeSelectorKey] = nodeSelectorValue;

        let volumes = [];
        let volumeMounts = [];
        if (type === 'gpu') {
            volumes = [
                {
                    name: 'dshm',
                    emptyDir: {
                        medium: 'Memory'
                    }
                }
            ];

            volumeMounts = [
                {
                    mountPath: '/dev/shm',
                    name: 'dshm'
                }
            ];
        }

        return {
            apiVersion: 'v1',
            kind: 'Pod',
            metadata: {
                name: `${deploymentName}-gpu-${name}`,
                annotations: {
                    'janitor/ttl': '40m'
                },
                labels: {
                    type: type
                }
            },
            spec: {
                containers: [
                    {
                        name: `gpu-${name}`,
                        image: `${gpuImageName}:${gpuImageTag}`,
                        resources: resources,
                        env: env,
                        volumeMounts: volumeMounts
                    }
                ],
                volumes: volumes,
                nodeSelector: nodeSelector,
                restartPolicy: 'Never'
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

        if (res.statusCode === 404) {
            return null;
        }

        if (res.statusCode >= 400) {
            return `Request failed: ${res.statusMessage}`;
        }
        return res.body;
    }
}

module.exports = {
    Kube
};
