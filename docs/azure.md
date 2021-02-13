## Create an Azure Resource Group

```
az group create --name lulcStaging --location westeurope
```

## Create an Azure Container Registry

```
az acr create --resource-group lulcStaging --name lulcStagingAcr --sku Basic
```

## Create an Azure Kubernetes Service cluster

Create a cluster and attach the ACR to it.

```
az aks create -g lulcStaging -n lulcStagingAks --location westeurope --attach-acr lulcStagingAcr --generate-ssh-keys
```

## Create a Service Principal for CI

```
az ad sp create-for-rbac --sdk-auth
```

## Create a contributor scoped Service Principal for the Resource Group
```
az ad sp create-for-rbac --name lulc-frontend --role contributor --scopes /subscriptions/230383d9-08f3-4704-b6a5-d69e14bf02aa/resourceGroups/lulcStaging --sdk-auth
```
## Find ACR credentials for Helm ImagePullSecrets

* Resource Group > ACR > Access Keys > Enable Admin user
* Copy username and password into Github secrets
## Authorize and configure access to a cluster locally

```
az aks get-credentials --resource-group lulcStaging --name lulcStagingAks
```

## Install KEDA on to the cluster
```
kubectl create namespace keda
helm install keda kedacore/keda --namespace keda
```

## Create an Azure Database for PostgreSQL server

```
az postgres server create --resource-group lulcStaging --name lulcDb  --location westeurope --admin-user lulc --admin-password <server_admin_password> --sku-name GP_Gen5_2
```

## Add your IP to connect to the PostgreSQL server

```
az postgres server firewall-rule create --resource-group lulcStaging --server lulcDb --name AllowMyIP --start-ip-address <your ip address> --end-ip-address <your ip address>
```

## Get PostgreSQL connection information

```
az postgres server show --resource-group lulcStaging --name lulcDb
```

## Connect via PSQL
```
psql -h lulcdb.postgres.database.azure.com -U lulc@lulcdb -d postgres
```

## Create a database

```
createdb -h lulcdb.postgres.database.azure.com -O lulc lulc
```

# Create an Azure Storage Account
```
az storage account create \
    --name lulc \
    --resource-group lulcStaging \
    --location westeurope \
    --sku Standard_ZRS \
    --encryption-services blob
```

# Enable static website hosting from blob storage

```
az storage blob service-properties update --account-name lulc --static-website --404-document 404.html --index-document index.html
```

# Add a GPU nodepool to the cluster

```
az aks nodepool add \
    --resource-group lulcStaging \
    --cluster-name lulcStagingAks3 \
    --name gpunodepool \
    --node-count 1 \
    --node-vm-size Standard_NC6 \
    --no-wait
```
# Enable cluster autoscale
```
az aks nodepool update \
  --resource-group lulcStaging \
  --cluster-name lulcStagingAks3 \
  --name nodepool1 \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 8
```
# Update cluster autoscale on an node pool (if needed to change min / max)
```
az aks nodepool update \
  --resource-group lulcStaging \
  --cluster-name lulcStagingAks2 \
  --name nodepool1 \
  --update-cluster-autoscaler \
  --min-count 3 \
  --max-count 5
```

# Add the AKS specialized GPU image support (one time)

```
az feature register --name GPUDedicatedVHDPreview --namespace Microsoft.ContainerService
```

## Check the status
```
az feature list -o table --query "[?contains(name, 'Microsoft.ContainerService/GPUDedicatedVHDPreview')].{Name:name,State:properties.state}"
```

## Refresh the registration
```
az provider register --namespace Microsoft.ContainerService
```

## Use the AKS specialized GPU image on a cluster
```
az aks nodepool add --name gpu --cluster-name lulcStagingAks2 --resource-group lulcStaging --node-vm-size Standard_NC6 --node-count 1 --aks-custom-headers UseGPUDedicatedVHD=true
```

## Create and Configure Application Gateway for Ingress

Enable `IngressApplicationGatewayAddon` feature (needed to be done only once per subscription):

    az feature register --name AKS-IngressApplicationGatewayAddon --namespace microsoft.containerservice

To check if feature registration is complete:

    az feature list -o table --query "[?contains(name, 'microsoft.containerservice/AKS-IngressApplicationGatewayAddon')].{Name:name,State:properties.state}"


Once feature is registered, you need to run:

    az provider register --namespace Microsoft.ContainerService

Create public IP address, Virtual Network and Application Gateway:

```
az network public-ip create -n lulcStagingPublicIp3 -g lulcStaging --allocation-method Static --sku Standard
az network vnet create -n lulcStagingVnet3 -g lulcStaging --address-prefix 11.0.0.0/8 --subnet-name lulcStagingSubnet --subnet-prefix 11.1.0.0/16 
az network application-gateway create -n lulcStagingApplicationGateway3 -l westeurope -g lulcStaging --sku Standard_v2 --public-ip-address lulcStagingPublicIp3 --vnet-name lulcStagingVnet --subnet lulcStagingSubnet
```

Peer Application Gateway and cluster networks:

```
nodeResourceGroup=$(az aks show -n lulcStagingAks3 -g lulcStaging -o tsv --query "nodeResourceGroup")

aksVnetName=$(az network vnet list -g $nodeResourceGroup -o tsv --query "[0].name")

aksVnetId=$(az network vnet show -n $aksVnetName -g $nodeResourceGroup -o tsv --query "id")

az network vnet peering create -n lulcStagingAppGWtoAKSVnetPeering3 -g lulcStaging --vnet-name lulcStagingVnet3 --remote-vnet $aksVnetId --allow-vnet-access

appGWVnetId=$(az network vnet show -n lulcStagingVnet3 -g lulcStaging -o tsv --query "id")

az network vnet peering create -n lulcStagingAKStoAppGWVnetPeering3 -g $nodeResourceGroup --vnet-name $aksVnetName --remote-vnet $appGWVnetId --allow-vnet-access

```
## Create custom HTTP metric
### Create service principal
```
az ad sp create-for-rbac -n "azure-k8s-metric-adapter-sp" --role "Monitoring Reader"
```

Supply these as Github Secrets