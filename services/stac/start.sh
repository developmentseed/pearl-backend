#!/bin/bash

uvicorn api.app:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*'
