#!/bin/bash

uvicorn api.app:app --host 0.0.0.0 --port 2002 --proxy-headers --forwarded-allow-ips='*'
