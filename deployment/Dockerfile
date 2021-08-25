FROM ubuntu:18.04

RUN apt-get update
RUN apt-get install -y wget unzip curl gnupg \
    apt-transport-https \
    jq \
    python3-pip

# Install Terraform 1.0.2

ARG BUILDARCH
RUN echo "Building for $BUILDARCH"
RUN wget -O https://releases.hashicorp.com/terraform/1.0.2/terraform_1.0.2_linux_amd64.zip
# RUN wget -O terraform.zip https://releases.hashicorp.com/terraform/1.0.2/terraform_1.0.2_linux_arm64.zip


RUN unzip terraform.zip
RUN mv terraform /usr/local/bin

# Install kubectl

RUN curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add -
RUN echo "deb https://apt.kubernetes.io/ kubernetes-xenial main" | tee -a /etc/apt/sources.list.d/kubernetes.list
RUN apt-get update
RUN apt-get install -y kubectl

# Install Helm

RUN curl https://baltocdn.com/helm/signing.asc |  apt-key add -
RUN echo "deb https://baltocdn.com/helm/stable/debian/ all main" | tee /etc/apt/sources.list.d/helm-stable-debian.list
RUN apt-get update
RUN apt-get install helm=3.5.0-1


# RUN curl -sL https://aka.ms/InstallAzureCLIDeb | bash

# Install Jinja
RUN pip3 install --upgrade pip
RUN pip3 install Jinja2

# Install azure client
RUN pip3 install azure-cli

WORKDIR /opt/src
