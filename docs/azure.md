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

## Find ACR credentials for Helm ImagePullSecrets

* Resource Group > ACR > Access Keys > Enable Admin user
* Copy username and password into Github secrets