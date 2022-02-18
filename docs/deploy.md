### Deployment and CI
_This documentation is intended if you are managing the PEARL infrastructure. We assume you are using Azure for deployment_

We deploy the services needed for PEARL onto an Azure Kubernetes Service cluster. The deployment is managed by Terraform. Terraform creates necessary resources defined in the `deployment/terraform` directory. 

We use [`chartpress`](https://github.com/jupyterhub/chartpress) to handle building, tagging and publishing our Docker images to the Azure Container Registry (ACR), and [`Helm`](https://helm.sh) to handle templating of our Kubernetes YAML templates and deploying onto the cluster. Chartpress is configured in the deployment scripts in `scripts/`. We use the Terraform helm provider to install necessary Helm charts. For example, see `deployment/resources/helm-keda.tf`.

We use Github Actions for CI, with the Workflow file building docker images that need to be built, pushing to ACR, and finally deploying onto the cluster. These scripts are:
1. `scripts/cibuild`
2. `scripts/cipublish`
3. `scripts/cideploy`

The following Azure resources need to manually created before a deploy:
1. A common resource group. By default this is called `lulcterraformdev`
2. An ACR under that resource group. By default this is called `lulcterraformacr`

If you want to modify these, see `variables.tf`

### Adding Services

To add a new service to the project:

 - Create a folder for your service in the `services/` folder. This folder should contain a `Dockerfile` that builds the container needed for your service.
 - Add an entry in `chartpress.yaml` in the root of the project for your service. This tells Chartpress to build the docker image for your service, as well as the path in the Values.yaml file to update with the correctly versioned tag.
 - Create a folder to hold the Kubernetes YAML templates required for your services inside `deployment/helm/templates/`. Add configuration for the Deployment / Service and any other resources your service needs here, looking at the other folders inside `templates/` for examples.
 - Create a section in the `values.yaml` for your service, and add any parameters that your service needs, following the example of other services defined.
 - If you need any variables that are based on Azure resources, these can be added in `helm-lulc.tf`

 Once this is done, CI should handle building of the images, pushing to ACR and deploying onto the staging cluster. You can test if the images are being built correctly by running `chartpress` locally.


### Local Testing

Ideally, each service should be self contained and testable individually, and one shouldn't use the Kubernetes deploy to test individual services.

However, sometimes it is useful to test the entire deploy process locally without deploying to the cloud. For this, the recommendation would be to install [`k3s`](https://k3s.io/) locally and install onto your local cluster. To do this:

 - Follow instructions on https://k3s.io to install k3s and configure `kubectl` to talk to your local cluster. Run the `k3s` server with the `--docker` option to use your local docker context and avoid needing to re-pull images locally. 
 - Run `chartpress`
 - Run `helm install lulc-test lulc-helm` at the root of the project. `lulc-test` what you name the release and can be anything you like.
 - This should install the Helm chart to your local cluster. You can check runnings pods and services with `kubectl get pods`, `kubectl get svc`, etc.

