### Helm Chart for PEARL

This is a [Helm](https://helm.sh) chart for the [Pearl Backend](https://github.com/developmentseed/pearl-backend) code-base.

This helm chart can be installed onto a Kubernetes cluster with:

    helm repo add pearl-helm https://devseed.com/pearl-helm-chart/
    helm repo update
    helm install pearl pearl-helm/pearl-helm

You can see a list of versions published at: https://devseed.com/pearl-helm-chart/

You can see an example terraform configuration to setup the cluster and infrastructure resources on Azure here: https://github.com/developmentseed/pearl-backend/tree/develop/deployment/terraform

Note: If you are creating the Kubernetes cluster and resources yourself, you will need to create a nodepool with the name "gpunodepool" for GPU resources and "cpunodepool" for CPU resources to run inference.

For more documentation on infrastructure and deployment, see https://github.com/developmentseed/lulc-infra/blob/develop/docs/deploy.md

Other values and configuration can be customized by setting Values to customize your Helm install. The required and optional values are documented in the [Values Schema JSON](https://github.com/developmentseed/pearl-backend/blob/develop/deployment/helm/lulc-helm/values.schema.json). Human friendly version of documentation at: http://devseed.com/pearl-backend/

If you have any issues installing or troubleshooting, please make an issue at https://github.com/developmentseed/pearl-backend/issues