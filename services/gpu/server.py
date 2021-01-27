#! /usr/bin/env python
# -*- coding: utf-8 -*-
# vim:fenc=utf-8
# pylint: disable=E1137,E1136,E0110,E1101
import argparse
import base64
import json
import logging
import os

import sys
import time

import cv2
import fiona
import fiona.transform
import numpy as np
import rasterio
import rasterio.warp

LOGGER = logging.getLogger("server")

from web_tool.DataLoader import warp_data_to_3857, crop_data_by_extent, crop_data_by_geometry, get_area_from_geometry
from web_tool.Datasets import load_datasets
DATALOADERS = load_datasets()

from web_tool.Utils import setup_logging, get_random_string, class_prediction_to_img
from web_tool import ROOT_DIR
from web_tool.Session import manage_session_folders, SESSION_FOLDER
from web_tool.SessionHandler import SessionHandler
from web_tool.Checkpoints import Checkpoints
SESSION_HANDLER = None

import bottle
bottle.TEMPLATE_PATH.insert(0, "./" + ROOT_DIR + "/views") # let bottle know where we are storing the template files
import cheroot.wsgi
import beaker.middleware

def create_session():
    bottle.response.content_type = 'application/json'
    data = bottle.request.json

    SESSION_HANDLER.create_session(bottle.request.session.id, data["dataset"], data["model"], data["checkpoint"])

    bottle.response.status = 200
    return json.dumps(data)

def retrain_model():
    bottle.response.content_type = 'application/json'
    data = bottle.request.json

    result = SESSION_HANDLER.get_session(bottle.request.session.id).model.retrain(**data["retrainArgs"])

    bottle.response.status = 200 if result["success"] else 500
    return json.dumps(result)


def record_correction():
    bottle.response.content_type = 'application/json'
    data = bottle.request.json
    current_session = SESSION_HANDLER.get_session(bottle.request.session.id)

    lon, lat = data["point"]["x"], data["point"]["y"]
    class_list = data["classes"]
    name_list = [item["name"] for item in class_list]
    color_list = [item["color"] for item in class_list]
    class_idx = data["value"] # what we want to switch the class to
    origin_crs = data["point"]["crs"]
    model_idx = data["modelIdx"]

    # load the current predicted patches crs and transform
    data_crs = current_session.latest_input_raster.crs
    data_transform = current_session.latest_input_raster.transform

    x, y = fiona.transform.transform(origin_crs, data_crs, [lon], [lat])
    x = x[0]
    y = y[0]

    dst_col, dst_row = (~data_transform) * (x,y)
    dst_row = int(np.floor(dst_row))
    dst_col = int(np.floor(dst_col))

    result = current_session.model.add_sample_point(dst_row, dst_col, class_idx)

    bottle.response.status = 200 if result["success"] else 500
    return json.dumps(result)


def pred_patch():
    bottle.response.content_type = 'application/json'
    data = bottle.request.json
    current_session = SESSION_HANDLER.get_session(bottle.request.session.id)

    current_session.add_entry(data) # record this interaction

    # Inputs
    extent = data["extent"]
    dataset = data["dataset"]
    class_list = data["classes"]
    name_list = [item["name"] for item in class_list]
    color_list = [item["color"] for item in class_list]

    if dataset not in DATALOADERS:
        raise ValueError("Dataset doesn't seem to be valid, do the datasets in js/tile_layers.js correspond to those in TileLayers.py")
    else:
        current_data_loader = DATALOADERS[dataset]

    input_raster = current_data_loader.get_data_from_extent(extent)
    current_session.latest_input_raster = input_raster

    output_raster = current_session.pred_patch(input_raster) # run inference
    warped_output_raster = warp_data_to_3857(output_raster) # warp output to 3857
    cropped_warped_output_raster = crop_data_by_extent(warped_output_raster, extent) # crop to the desired result

    if cropped_warped_output_raster.shape[2] > len(color_list):
       LOGGER.warning("The number of output channels is larger than the given color list, cropping output to number of colors (you probably don't want this to happen")
       cropped_warped_output_raster.data = cropped_warped_output_raster.data[:,:,:len(color_list)]


    # Create color versions of predictions
    img_soft = class_prediction_to_img(cropped_warped_output_raster.data, False, color_list)
    img_soft = cv2.imencode(".png", cv2.cvtColor(img_soft, cv2.COLOR_RGB2BGR))[1].tostring()
    img_soft = base64.b64encode(img_soft).decode("utf-8")
    data["output_soft"] = img_soft

    img_hard = class_prediction_to_img(cropped_warped_output_raster.data, True, color_list)
    img_hard = cv2.imencode(".png", cv2.cvtColor(img_hard, cv2.COLOR_RGB2BGR))[1].tostring()
    img_hard = base64.b64encode(img_hard).decode("utf-8")
    data["output_hard"] = img_hard

    bottle.response.status = 200
    return json.dumps(data)


def pred_tile():
    bottle.response.content_type = 'application/json'
    data = bottle.request.json
    current_session = SESSION_HANDLER.get_session(bottle.request.session.id)

    current_session.add_entry(data) # record this interaction

    # Inputs
    geom = data["polygon"]
    class_list = data["classes"]
    name_list = [item["name"] for item in class_list]
    color_list = [item["color"] for item in class_list]
    dataset = data["dataset"]
    zone_layer_name = data["zoneLayerName"]
    model_idx = data["modelIdx"]

    if dataset not in DATALOADERS:
        raise ValueError("Dataset doesn't seem to be valid, do the datasets in js/tile_layers.js correspond to those in TileLayers.py")
    else:
        current_data_loader = DATALOADERS[dataset]

    try:
        input_raster = current_data_loader.get_data_from_geometry(geom["geometry"])
        shape_area = get_area_from_geometry(geom["geometry"])
    except NotImplementedError as e: # Example of how to handle errors from the rest of the server
        bottle.response.status = 400
        return json.dumps({"error": "Cannot currently download imagery with 'Basemap' based datasets"})

    output_raster = current_session.pred_tile(input_raster)
    if output_raster.shape[2] > len(color_list):
       LOGGER.warning("The number of output channels is larger than the given color list, cropping output to number of colors (you probably don't want this to happen")
       output_raster.data = output_raster.data[:,:,:len(color_list)]

    output_hard = output_raster.data.argmax(axis=2)
    nodata_mask = np.sum(input_raster.data == 0, axis=2) == input_raster.shape[2]
    output_hard[nodata_mask] = 255
    class_vals, class_counts = np.unique(output_hard[~nodata_mask], return_counts=True)

    img_hard = class_prediction_to_img(output_raster.data, True, color_list)
    img_hard = cv2.cvtColor(img_hard, cv2.COLOR_RGB2BGRA)
    img_hard[nodata_mask] = [0,0,0,0]

    # replace the output predictions with our image data because we are too lazy to make a new InMemoryRaster
    output_raster.data = img_hard
    output_raster.shape = img_hard.shape

    warped_output_raster = warp_data_to_3857(output_raster) # warp output to 3857
    cropped_warped_output_raster = crop_data_by_geometry(warped_output_raster, geom["geometry"], "epsg:4326") # crop to the desired shape
    img_hard = cropped_warped_output_raster.data

    tmp_id = get_random_string(8)
    cv2.imwrite("tmp/downloads/%s.png" % (tmp_id), img_hard)
    data["downloadPNG"] = "tmp/downloads/%s.png" % (tmp_id)

    new_profile = {}
    new_profile['driver'] = 'GTiff'
    new_profile['dtype'] = 'uint8'
    new_profile['compress'] = "lzw"
    new_profile['count'] = 1
    new_profile['transform'] = output_raster.transform
    new_profile['height'] = output_hard.shape[0]
    new_profile['width'] = output_hard.shape[1]
    new_profile['nodata'] = 255
    with rasterio.open("tmp/downloads/%s.tif" % (tmp_id), 'w', **new_profile) as f:
        f.write(output_hard.astype(np.uint8), 1)
    data["downloadTIFF"] = "tmp/downloads/%s.tif" % (tmp_id)


    data["classStatistics"] = []

    f = open("tmp/downloads/%s.txt" % (tmp_id), "w")
    f.write("Class id\tClass name\tPercent area\tArea (km^2)\n")
    for i in range(len(class_vals)):
        pct_area = (class_counts[i] / np.sum(class_counts))
        if shape_area is not None:
            real_area = shape_area * pct_area
        else:
            real_area = -1
        f.write("%d\t%s\t%0.4f%%\t%0.4f\n" % (class_vals[i], name_list[class_vals[i]], pct_area*100, real_area))
        data["classStatistics"].append({
            "Class ID": int(class_vals[i]),
            "Class Name": name_list[class_vals[i]],
            "Percent Area": float(pct_area),
            "Area (km2)": float(real_area)
        })
    f.close()
    data["downloadStatistics"] = "tmp/downloads/%s.txt" % (tmp_id)

    bottle.response.status = 200
    return json.dumps(data)

def download_all():
    bottle.response.content_type = 'application/json'
    data = bottle.request.json
    current_session = SESSION_HANDLER.get_session(bottle.request.session.id)

    bottle.response.status = 200
    return json.dumps(data)

def get_input():
    bottle.response.content_type = 'application/json'
    data = bottle.request.json
    current_session = SESSION_HANDLER.get_session(bottle.request.session.id)

    current_session.add_entry(data) # record this interaction

    # Inputs
    extent = data["extent"]
    dataset = data["dataset"]

    if dataset not in DATALOADERS:
        raise ValueError("Dataset doesn't seem to be valid, please check Datasets.py")
    else:
        current_data_loader = DATALOADERS[dataset]

    input_raster = current_data_loader.get_data_from_extent(extent)
    warped_output_raster = warp_data_to_3857(input_raster) # warp image to 3857
    cropped_warped_output_raster = crop_data_by_extent(warped_output_raster, extent) # crop to the desired extent

    img = cropped_warped_output_raster.data[:,:,:3].copy().astype(np.uint8) # keep the RGB channels to save as a color image
    img = cv2.imencode(".png", cv2.cvtColor(img, cv2.COLOR_RGB2BGR))[1].tostring()
    img = base64.b64encode(img).decode("utf-8")
    data["input_img"] = img

    bottle.response.status = 200
    return json.dumps(data)


#---------------------------------------------------------------------------------------
# Checkpoint handling endpoints
#---------------------------------------------------------------------------------------

def checkpoint_wrapper(disable_checkpoints):
    def create_checkpoint():
        bottle.response.content_type = 'application/json'
        data = bottle.request.json

        if disable_checkpoints:
            result = {
                "success": False,
                "message": "Saving checkpoints is disabled on the server"
            }
        else:
            result = SESSION_HANDLER.get_session(bottle.request.session.id).create_checkpoint(data["dataset"], data["model"], data["checkpointName"], data["classes"])

        bottle.response.status = 200 if result["success"] else 500
        return json.dumps(result)
    return create_checkpoint

def get_checkpoints():
    checkpoints = Checkpoints.list_checkpoints()
    return json.dumps(checkpoints, indent=2)

#---------------------------------------------------------------------------------------
# Static file serving endpoints
#---------------------------------------------------------------------------------------

def get_basemap_data(filepath):
    return bottle.static_file(filepath, root="/data/basemaps/")

def get_zone_data(filepath):
    return bottle.static_file(filepath, root="./data/zones/")

def get_downloads(filepath):
    return bottle.static_file(filepath, root="/tmp/downloads/")

def get_everything_else(filepath):
    return bottle.static_file(filepath, root="./" + ROOT_DIR + "/")


#---------------------------------------------------------------------------------------
#---------------------------------------------------------------------------------------

def main():

    # API paths
    app.route('/predPatch', method="POST", callback=pred_patch)
    app.route('/predTile', method="POST", callback=pred_tile)
    app.route('/downloadAll', method="POST", callback=download_all)
    app.route('/getInput', method="POST", callback=get_input)
    app.route('/recordCorrection', method="POST", callback=record_correction)
    app.route('/retrainModel', method="POST", callback=retrain_model)

    # Checkpoints
    app.route("/createCheckpoint", method="POST", callback=checkpoint_wrapper(args.disable_checkpoints))
    app.route("/getCheckpoints", method="GET", callback=get_checkpoints)

    # Content paths
    app.route("/", method="GET", callback=get_landing_page)
    app.route("/data/basemaps/<filepath:re:.*>", method="GET", callback=get_basemap_data)
    app.route("/data/zones/<filepath:re:.*>", method="GET", callback=get_zone_data)
    app.route("/tmp/downloads/<filepath:re:.*>", method="GET", callback=get_downloads)
    app.route("/<filepath:re:.*>", method="GET", callback=get_everything_else)

