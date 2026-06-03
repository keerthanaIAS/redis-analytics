# Redis Sentinel Setup with Docker + Node.js (ioredis)

## Overview

This project demonstrates a **high availability Redis architecture** using:

* Redis Master + Replicas
* Redis Sentinel for failover management
* Docker for containerized infrastructure
* Node.js (ioredis) for client connectivity
* `natMap` handling for local development

The goal is to ensure Redis continues working even when the master node fails, without manual intervention.

---

## Architecture

Node.js App
    ↓
Redis Sentinel (26379, 26380, 26381)
    ↓
Current Master (dynamic)
    ↓
Replicas (automatic sync)


Sentinel continuously monitors Redis nodes and automatically promotes a replica to master when failure is detected.

---

## Docker Setup

### Redis Nodes

* Master: Redis container (port 6379)
* Replicas: Redis containers (port 6379 internally, exposed via different host ports if needed)

### Sentinel Nodes

* Multiple Sentinel containers (26379–26381)

---

## Key Concept: Failover

When the master fails:

1. Sentinel detects failure
2. One replica is promoted to master
3. All other replicas reconfigure automatically
4. Client reconnects to new master via Sentinel

---

## Node.js Client (ioredis)

### Production Setup (Recommended)

const Redis = require("ioredis");

const redis = new Redis({
  sentinels: [
    { host: "redis-sentinel-1", port: 26379 },
    { host: "redis-sentinel-2", port: 26379 },
    { host: "redis-sentinel-3", port: 26379 }
  ],
  name: "mymaster",
  role: "master"
});

### Why no `natMap` in production?

In production (Docker/Kubernetes):

* All services are in the same network
* Sentinel returns reachable service names (not host IPs)
* No IP translation is required

---

## Local Development Setup

When running Docker on a local machine:

* Sentinel returns container IPs (172.18.x.x)
* These IPs are not accessible from host OS
* So we map them using `natMap`

natMap: {
  "172.18.0.3:6379": { host: "127.0.0.1", port: 6379 },
  "172.18.0.6:6380": { host: "127.0.0.1", port: 6380 },
  "172.18.0.5:6381": { host: "127.0.0.1", port: 6381 }
}

---

## Key Learnings

### 1. Sentinel does NOT connect to a fixed master

It dynamically resolves the current master.

### 2. IP addresses inside Docker are ephemeral

* `172.18.x.x` changes after container restart
* Never hardcode Docker IPs in production

### 3. Ports must be consistent across system

* Redis: 6379 (or custom, but must be consistent everywhere)
* Sentinel: 26379

### 4. Failover is automatic

No manual intervention is needed if Sentinel is configured correctly.

---

## Common Issues Solved

* Connection reset after failover
* NAT mapping mismatch in local environment
* Sentinel unreachable due to wrong hostname
* Replica not promoted due to misconfiguration
* Docker IP changes breaking static configs

---

## Conclusion

This setup ensures:

* High availability (HA)
* Automatic failover
* Zero manual master switching
* Production-ready Redis architecture

---
