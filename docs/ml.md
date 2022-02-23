# Machine Learning for PEARL

PEARL's Machine Learning pipeline was orginally developed by Microsoft researcher's Caleb Robinson, Nebojsa Jojic and Kolya Malkin. Development Seed team expanded on this foundation to improve the pipeline and training data management. We are working on making the ML pipeline and training scripts open shortly.

## Training data
We worked closely with University of Vermont Spatial Analysis Laboratory and have used a variety of regional datasets for the models that currently available on PEARL. The east coast model uses training data from Chespeake Conservancy.

The LULC data from these sources are first aligned with NAIP imagery tiles or when they are vectors we rasterize before aligning for every AOI. Finally tiled labels are produced for training.

## Model training

We use Azure ML service to training PEARL models. We have 3 PyTorch based Semantic Segmenation models ready for LULC model training — FCN, UNet and DeepLabV3+.

We have seed data for each model so during retraining the user doesn’t have to add samples for each class, so we can use the weights/biases from the retraining logistic regression sklearn model to update the weights/biases of the deep learning model and then run inference on the GPU 
