import k8s from '@kubernetes/client-node';

/**
 * @class Kube
 */
export default class Kube {

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
     *
     * @returns {Object[]}
     */
    async listPods() {
        const res = await this.k8sApi.listNamespacedPod(this.namespace, undefined, 'false', undefined, undefined, 'workload=ml');
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
     *
     * @returns {Object}
     */
    makePodSpec(name, type, env) {
        // const nodeSelectorKey = this.config.nodeSelectorKey;
        // const nodeSelectorValue = this.config.nodeSelectorValue; // not used anymore
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
                    cpu: '1.5',
                    memory: '3Gi'
                },
                limits: {
                    cpu: '10',
                    memory: '15Gi'
                }
            };
        }

        const nodeSelector = {};
        nodeSelector['agentpool'] = type === 'cpu' ? 'cpunodepool' : 'gpunodepool';

        let volumes = [];
        let volumeMounts = [];
        if (type === 'gpu' || type === 'cpu') {
            volumes = [{
                name: 'dshm',
                emptyDir: {
                    medium: 'Memory'
                }
            }];

            volumeMounts = [{
                mountPath: '/dev/shm',
                name: 'dshm'
            }];
        }

        return {
            apiVersion: 'v1',
            kind: 'Pod',
            metadata: {
                name: `${deploymentName}-instance-${type}-${name}`,
                annotations: {
                    'janitor/ttl': '2h'
                },
                labels: {
                    type: type,
                    app: 'lulc-helm',
                    workload: 'ml'
                }
            },
            spec: {
                containers: [{
                    name: `instance-${type}-${name}`,
                    image: `${gpuImageName}:${gpuImageTag}`,
                    resources: resources,
                    env: env,
                    volumeMounts: volumeMounts
                }],
                volumes: volumes,
                nodeSelector: nodeSelector,
                restartPolicy: 'Never'
            }
        };
    }

    /**
     * Create a pod based on podSpec
     *
     * @param {Object} podSpec
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
     *
     * @param {String} name
     */
    async deletePod(name) {
        const res = await this.k8sApi.deleteNamespacedPod(name, this.namespace);
        if (res.statusCode >= 400) {
            return `Request failed: ${res.statusMessage}`;
        }
        return res.body;
    }

    /**
     * Get pod details
     *
     * @param {String} name
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
     *
     * @param {String} name
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
