FROM ubuntu:18.04

RUN apt-get update
RUN apt-get install -y wget unzip curl gnupg \
    apt-transport-https \
    jq \
    python3-pip

# Install Terraform 1.0.2

ARG BUILDARCH
RUN echo "Building for $BUILDARCH"
RUN wget -O terraform.zip https://releases.hashicorp.com/terraform/1.0.2/terraform_1.0.2_linux_amd64.zip
# RUN wget -O terraform.zip https://releases.hashicorp.com/terraform/1.0.2/terraform_1.0.2_linux_arm64.zip


RUN unzip terraform.zip
RUN mv terraform /usr/local/bin

# Upgrade pip
RUN pip3 install -U pip

# Install azure client
RUN pip3 install azure-cli

WORKDIR /opt/src
