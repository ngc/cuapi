#!/bin/bash

# Function to start Minikube
start_minikube() {
  echo "Starting Minikube..."
  minikube start
  if [ $? -ne 0 ]; then
    echo "Failed to start Minikube."
    exit 1
  fi
  echo "Minikube started successfully."
}

# Function to start Minikube dashboard
start_dashboard() {
  echo "Starting Minikube dashboard..."
  minikube dashboard --url &
  DASHBOARD_PID=$!
  if [ $? -ne 0 ]; then
    echo "Failed to start Minikube dashboard."
    exit 1
  fi
  echo "Minikube dashboard started successfully with PID $DASHBOARD_PID."
}

# Function to start Minikube tunnel
start_tunnel() {
  echo "Starting Minikube tunnel..."
  minikube tunnel &
  TUNNEL_PID=$!
  if [ $? -ne 0 ]; then
    echo "Failed to start Minikube tunnel."
    exit 1
  fi
  echo "Minikube tunnel started successfully with PID $TUNNEL_PID."
}

# Start Minikube
start_minikube

# Start Minikube dashboard in the background
start_dashboard

# Start Minikube tunnel in the background
start_tunnel

# Wait for background processes to finish
wait $DASHBOARD_PID $TUNNEL_PID

echo "All processes started successfully."