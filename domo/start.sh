#!/bin/bash
cd "$(dirname "$0")/backend"

echo "=========================================="
echo "  WMS - Starting..."
echo "=========================================="

echo "Installing dependencies..."
pip install -r requirements.txt

echo ""
echo "Initializing database..."
python init_db.py

echo ""
echo "Starting server..."
echo "  URL: http://localhost:5000"
echo "=========================================="

python app.py
