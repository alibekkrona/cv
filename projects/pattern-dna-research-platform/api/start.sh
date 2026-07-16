#!/bin/sh
set -eu

python api/bootstrap.py
exec gunicorn --bind 0.0.0.0:8000 --workers 2 --threads 4 api.app:app
