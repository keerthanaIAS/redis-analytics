PHASE 1 — Redis Master:-
Install
brew install redis

# Create master config:
redis/master.conf:
port 6379

bind 0.0.0.0

protected-mode no

requirepass app-pass

appendonly yes
*Start master:*
redis-server redis/master.conf
Test
redis-cli -p 6379

Then:
AUTH app-pass
Output:
OK
----------
PING
Output:
PONG

PHASE 2 — Redis Replica:-
redis/replica.conf
port 6380

bind 0.0.0.0

protected-mode no

requirepass app-pass

masterauth app-pass

replicaof 127.0.0.1 6379
*Start replica:*
redis-server redis/replica.conf
Verify
redis-cli -p 6380

Then:
AUTH app-pass
Output:
OK
----------
INFO replication
Should show:
role:slave

PHASE 3 — Redis Sentinel:-
redis/sentinel.conf
port 26379

sentinel monitor mymaster 127.0.0.1 6379 1

sentinel auth-pass mymaster app-pass

sentinel down-after-milliseconds mymaster 5000

sentinel failover-timeout mymaster 10000
*Start sentinel:*
redis-server redis/sentinel.conf --sentinel



# 1. Why three config files?

You created:

```txt
master.conf
replica.conf
sentinel.conf
```

These are NOT random.

Each process has a completely different responsibility.

---

# 2. master.conf → Main database server

Example:

```conf
port 6379
requirepass app-pass
appendonly yes
```

## What it does

This is the actual writable Redis database.

Responsibilities:

* accepts writes
* stores data
* sends replication stream
* persists data to disk

Your app mainly talks here.

Flow:

```txt
Node.js App
    ↓
Redis Master (6379)
```

---

## Important configs

### `port 6379`

Redis listens on port 6379.

---

### `requirepass app-pass`

Enables password auth for default Redis user.

Without this:

* anyone can connect
* anyone can delete data

Very dangerous.

---

### `appendonly yes`

Enables AOF persistence.

Without it:

* restart can lose data

With it:

* every write gets logged

Redis can recover after crash.

---

# 3. replica.conf → Backup replica server

Example:

```conf
port 6380

replicaof 127.0.0.1 6379

masterauth app-pass

requirepass replica-pass
```

---

## What replica does

Replica continuously copies master memory.

Flow:

```txt
Master Redis
    ↓ replication stream
Replica Redis
```

Purpose:

* backup
* read scaling
* failover candidate

---

## Important configs

### `replicaof 127.0.0.1 6379`

Tells Redis:

> "I am NOT master. Copy data from master."

Without this:

* it becomes standalone Redis

---

### `masterauth app-pass`

Replica authenticates to master.

Because master has password.

Without this:

* replication fails

Common beginner mistake.

---

### `requirepass replica-pass`

Password for clients connecting TO replica.

This is separate from master password.

---

# 4. sentinel.conf → Monitoring + failover brain

Example:

```conf
port 26379

sentinel monitor mymaster 127.0.0.1 6379 1

sentinel auth-pass mymaster app-pass
```

---

## What Sentinel does

Sentinel is NOT a database.

It is:

* monitor
* observer
* failover controller

Responsibilities:

* watches master
* checks heartbeat
* detects crashes
* promotes replica → master

---

## Why needed?

Because replication alone is useless during failure.

Without Sentinel:

```txt
Master dies
↓
Replica still replica
↓
Writes fail
↓
Application down
```

With Sentinel:

```txt
Master dies
↓
Sentinel detects failure
↓
Replica promoted automatically
↓
System survives
```

That is actual HA (high availability).

---

# 5. How username/password works in Redis

You used:

```conf
requirepass app-pass
```

This is OLD Redis authentication style.

Internally Redis creates:

```txt
default user
password = app-pass
```

So when you do:

```bash
AUTH app-pass
```

You authenticate as:

```txt
default user
```

---

# 6. Modern Redis ACL (real username support)

Redis 6+ supports actual users.

Example:

```conf
user admin on >admin-pass allcommands allkeys
user readonly on >read-pass +get +info ~*
```

Now login becomes:

```bash
AUTH admin admin-pass
```

Meaning:

* username = admin
* password = admin-pass

---

## Why ACL matters

You can create:

* readonly users
* admin users
* cache-only users
* restricted apps

Production systems use ACL heavily.

---

# 7. IP whitelisting

---

## `listeners` vs `advertised.listeners` equivalent in Redis

Redis mainly uses:

```conf
bind 127.0.0.1 10.55.66.132
```

Meaning:

```txt
ONLY these IPs can connect
```

---

## Example

### Bad:

```conf
bind 0.0.0.0
```

Means:

* whole internet can hit Redis

Extremely dangerous.

Bots scan Redis ports continuously.

---

### Good:

```conf
bind 127.0.0.1 10.55.66.132
```

Means:

* only local machine
* only LAN IP

allowed.

---

# 8. Real architecture companies use

Production:

```txt
App Servers
      ↓
Redis Sentinel Cluster
      ↓
Redis Master
      ↓
Redis Replicas
```

Usually:

* 1 master
* 2+ replicas
* 3 sentinels

Why 3?

* quorum voting
* avoid false failover

---

Right now you have:

* master
* replica
* sentinel
* auth

Now you need to simulate failures.

---

# CURRENT ARCHITECTURE

You should have:

```txt id="hyqg1r"
Master    → 6379
Replica   → 6380
Sentinel  → 26379
```

Verify all first.

---

# VERIFY MASTER

Terminal 1:

```bash id="w6tvql"
redis-cli -p 6379
```

Then:

```bash id="3k7m4z"
AUTH app-pass
PING
```

Expected:

```txt id="jlwmph"
PONG
```

---

# VERIFY REPLICA

Terminal 2:

```bash id="bgibis"
redis-cli -p 6380
```

Then:

```bash id="m0dm5u"
AUTH replica-pass
INFO replication
```

Expected:

```txt id="8d8e22"
role:slave
```

(or `role:replica` in newer Redis)

---

# VERIFY SENTINEL

Terminal 3:

```bash id="0v9k06"
redis-cli -p 26379
```

Then:

```bash id="uj9cjc"
SENTINEL masters
```

You should see:

* master name
* IP
* port
* status

---

# TEST REPLICATION

Inside master:

```bash id="9cnx22"
SET user "keerthana"
```

Inside replica:

```bash id="88af5w"
GET user
```

Expected:

```txt id="b8wh03"
"keerthana"
```

That proves replication.

---

# NEGATIVE SCENARIO — WRONG PASSWORD

This teaches auth failure.

Inside replica config:

```conf id="1fskq7"
masterauth WRONGPASS
```

Restart replica.

Now check:

```bash id="h3iv8t"
INFO replication
```

You’ll see:

* replication broken
* cannot sync

Because replica cannot authenticate to master.

This is one of the MOST common production issues.

---

# NEGATIVE SCENARIO — MASTER DOWN

This is the real HA test.

Find master PID:

```bash id="u6saz8"
lsof -i :6379
```

Kill it:

```bash id="3gr6m9"
kill -9 <PID>
```

Example:

```bash id="r8b47g"
kill -9 19975
```

Now wait 10–15 seconds.

Then inside Sentinel:

```bash id="y2xg6s"
SENTINEL masters
```

You should see:

* old master marked down

Then:

```bash id="2k5n7x"
SENTINEL replicas mymaster
```

One replica should become:

* master

---

# VERIFY FAILOVER

Connect to replica:

```bash id="h98h58"
redis-cli -p 6380
AUTH replica-pass
INFO replication
```

Expected now:

```txt id="luwqjl"
role:master
```

That means Sentinel promoted replica automatically.

This is the entire purpose of Sentinel.

---

# NEGATIVE SCENARIO — SENTINEL DOWN

Kill Sentinel:

```bash id="w76onm"
lsof -i :26379
kill -9 <pid>
```

Now:

* replication still works
* BUT no failover monitoring

If master dies now:

* nobody promotes replica

System becomes partially dead.

---

# NEGATIVE SCENARIO — REPLICA DOWN

Kill replica:

```bash id="x8q7n2"
lsof -i :6380
kill -9 <pid>
```

Now:

* master still works
* but HA gone
* no backup exists

Danger:
if master crashes now → total data loss risk.

---

# NEGATIVE SCENARIO — NO PERSISTENCE

Inside master.conf:

```conf id="dd4iq9"
appendonly no
```

Restart Redis.

Now:

```bash id="v27oyf"
SET money 1000
```

Kill Redis brutally:

```bash id="bx2utg"
kill -9 <pid>
```

Restart.

Now:

```bash id="m9vvbz"
GET money
```

Possibly gone.

That teaches:

* memory-only risk
* why persistence matters

---

# IP WHITELISTING TEST

Right now you probably have:

```conf id="g9hclg"
bind 127.0.0.1
```

Meaning:

* only local machine allowed

---

## TEST LAN ACCESS

Change:

```conf id="t42cgl"
bind 127.0.0.1 10.55.66.132
```

Now restart Redis.

Now devices in same WiFi can connect using:

```bash id="5u5lj1"
redis-cli -h 10.55.66.132 -p 6379
```

WITHOUT that bind:

* connection refused

That is primitive IP whitelisting.

---

# HOW TO SEE ACTIVE CLIENTS

Inside Redis:

```bash id="4fysux"
CLIENT LIST
```

Shows:

* client IPs
* ports
* commands
* idle time

Useful for debugging.

---

*Manual switch process:*

# Current

```text id="pf7b9d"
6380 = master
6379 = replica
```

# Make 6379 master again

Connect to 6379:

```bash id="5q38js"
redis-cli -p 6379
AUTH replica-pass
```

Run:

```bash id="c6t10t"
REPLICAOF NO ONE
```

Now `6379` becomes master.

Verify:

```bash id="0tix1i"
INFO replication
```

Expected:

```text id="knm4q9"
role:master
```

# Now convert 6380 into replica

Connect:

```bash id="90gjlwm"
redis-cli -p 6380
AUTH replica-pass
```

Run:

```bash id="3pj7i6"
REPLICAOF 127.0.0.1 6379
```

Now 6380 becomes replica of 6379.

Verify:

```bash id="gxgqkt"
INFO replication
```

Expected:

```text id="1vb2yw"
role:slave
master_host:127.0.0.1
master_port:6379
```

Then Sentinel eventually updates topology.


*SENTINEL DOWN*:
Kill Sentinel:
lsof -i :26379
kill -9 <pid>

Now:
replication still works
BUT no failover monitoring

If master dies now:
nobody promotes replica

*REPLICA DOWN*:
Kill replica:
lsof -i :6380
kill -9 <pid>
Now:
master still works
but HA gone
no backup exists
Danger:
if master crashes now → total data loss risk.



*Your config currently means*:

```conf id="v4w8cb"
bind 127.0.0.1 10.55.66.125
```

Redis will accept connections only from:

* localhost
* interface/IP `10.55.66.125`

Now how to check your current setup:

# 1. Check Redis listening interfaces

Run:

```bash id="vbjlwm"
lsof -i :6379
```

Expected something like:

```text id="gtyy2m"
TCP 127.0.0.1:6379 (LISTEN)
TCP 10.55.66.125:6379 (LISTEN)
```

or:

```text id="h2t7v1"
*:6379
```

If you see `*`, Redis is exposed everywhere.

---

# 2. Check bind config from Redis itself

Connect:

```bash id="q4d81p"
redis-cli
AUTH app-pass
```

Then:

```bash id="wjlwm2"
CONFIG GET bind
```

Expected:

```text id="8ozl44"
127.0.0.1 10.55.66.125
```

---

# 3. Test unauthorized connection

From another machine on same network:

```bash id="qf1jlwm"
redis-cli -h YOUR_IP -p 6379
```

If password required:

```text id="jlwm5m"
NOAUTH Authentication required
```

That means auth works.

Then try:

```bash id="jlwm7x"
AUTH wrongpass
```

Expected:

```text id="z17gjl"
ERR invalid password
```

Then:

```bash id="jlwm9n"
AUTH app-pass
PING
```

Expected:

```text id="jlwmc2"
PONG
```

---

BIND: IP binding is the process of associating your server with a specific network interface (IP address).

---

# 1. CONFIG-LEVEL IP WHITELISTING

This controls:

> who can physically connect to Redis.

Inside:

```txt id="3t8y4r"
redis/master.conf
```

Add:

```conf id="k7waz5"
bind 127.0.0.1 10.55.66.132

protected-mode yes

requirepass app-pass
```

---

# WHAT THIS DOES

## `bind`

```conf id="4nuh9y"
bind 127.0.0.1 10.55.66.132
```

Means ONLY:

* localhost
* your LAN IP

can connect.

Any other IP:

* connection refused

---

## `protected-mode yes`

Extra Redis safety layer.

If Redis accidentally exposed:

* Redis blocks unsafe remote access.

Without this:

* Redis may become internet-accessible.

---

# RESTART REDIS

After config change:

```bash id="t1ruyu"
kill -9 <redis-master-pid>
```

Then:

```bash id="m20gcx"
redis-server redis/master.conf
```

---

# TEST ACCESS

From SAME machine:

```bash id="1m2d7d"
redis-cli -h 127.0.0.1 -p 6379
```

Works.

Now:

```bash id="0hlyr2"
redis-cli -h 10.55.66.132 -p 6379
```

Works.

Now try invalid IP:

```bash id="0tnr8d"
redis-cli -h 192.168.1.50 -p 6379
```

Fails.

That is config-level whitelisting.

---

-----------------*while try code wise redis setup when you get this*:--------------------------------

keerthana@Keerthanas-MacBook-Air redis-analytics % redis-cli
127.0.0.1:6379> AUTH app-pass
(error) ERR AUTH <password> called without any password configured for the default user. Are you sure your configuration is correct?
127.0.0.1:6379> AUTH default app-pass ---> use this
OK

*code wise running terminal*: open the file path then give redis-server:
*without password*:
keerthana@Keerthanas-MacBook-Air redis-analytics % redis-server
*with password*:
keerthana@Keerthanas-MacBook-Air redis-analytics % redis-server --requirepass app-pass
28425:C 29 May 2026 16:43:38.544 * oO0OoO0OoO0Oo Redis is starting oO0OoO0OoO0Oo
28425:C 29 May 2026 16:43:38.544 * Redis version=8.2.0, bits=64, commit=00000000, modified=1, pid=28425, just started
28425:C 29 May 2026 16:43:38.544 * Configuration loaded
28425:M 29 May 2026 16:43:38.545 * Increased maximum number of open files to 10032 (it was originally set to 2560).
28425:M 29 May 2026 16:43:38.545 * monotonic clock: POSIX clock_gettime
                _._                                                  
           _.-``__ ''-._                                             
      _.-``    `.  `_.  ''-._           Redis Open Source            
  .-`` .-```.  ```\/    _.,_ ''-._      8.2.0 (00000000/1) 64 bit
 (    '      ,       .-`  | `,    )     Running in standalone mode
 |`-._`-...-` __...-.``-._|'` _.-'|     Port: 6379
 |    `-._   `._    /     _.-'    |     PID: 28425
  `-._    `-._  `-./  _.-'    _.-'                                   
 |`-._`-._    `-.__.-'    _.-'_.-'|                                  
 |    `-._`-._        _.-'_.-'    |           https://redis.io       
  `-._    `-._`-.__.-'_.-'    _.-'                                   
 |`-._`-._    `-.__.-'    _.-'_.-'|                                  
 |    `-._`-._        _.-'_.-'    |                                  
  `-._    `-._`-.__.-'_.-'    _.-'                                   
      `-._    `-.__.-'    _.-'                                       
          `-._        _.-'                                           
              `-.__.-'                                               

28425:M 29 May 2026 16:43:38.546 # WARNING: The TCP backlog setting of 511 cannot be enforced because kern.ipc.somaxconn is set to the lower value of 128.
28425:M 29 May 2026 16:43:38.546 * Server initialized
28425:M 29 May 2026 16:43:38.548 * Loading RDB produced by version 8.2.0
28425:M 29 May 2026 16:43:38.548 * RDB age 3 seconds
28425:M 29 May 2026 16:43:38.548 * RDB memory usage when created 0.77 Mb
28425:M 29 May 2026 16:43:38.548 * Done loading RDB, keys loaded: 2, keys expired: 0.
28425:M 29 May 2026 16:43:38.548 * DB loaded from disk: 0.001 seconds
28425:M 29 May 2026 16:43:38.548 * Ready to accept connections tcp

*ip wise cli command*:
redis-server --bind 127.0.0.1 10.55.66.132 --protected-mode no
*Start Redis with BOTH password + IP whitelist*:
redis-server \
  --bind 127.0.0.1 10.55.66.132 \
  --protected-mode no \
  --requirepass app-pass

*Stop Redis started manually*:
Find PID:
lsof -i :6379
Kill it:
kill -9 19975

*Replica WITHOUT config file*:
Master:
redis-server \
  --port 6379 \
  --requirepass app-pass

Replica:
redis-server \
  --port 6380 \
  --replicaof 127.0.0.1 6379 \
  --masterauth app-pass

## Test:

Master:
redis-cli -p 6379
AUTH app-pass
SET name keerthana

Replica:
redis-cli -p 6380
GET name

*Sentinel WITHOUT config file*:
This is where many people get confused.
Sentinel CANNOT fully run without a config file because Sentinel writes state changes dynamically.
Minimal file needed.

Create:
touch sentinel.conf

Add:
port 26379

sentinel monitor mymaster 127.0.0.1 6379 1
sentinel auth-pass mymaster app-pass

Run:
redis-server sentinel.conf --sentinel

*What IP whitelist REALLY means*:
This line:
bind 127.0.0.1 10.55.66.132
means:
ONLY accept connections arriving on these interfaces.
This is primitive network restriction.

*Why username didn’t exist earlier*:
You used:
AUTH app-pass

and it worked only after requirepass.
Because:
*old Redis auth model = password only
*default user automatically created internally
No username needed.

*Username-based auth (ACL)*:
Modern Redis supports users.

Run Redis:
redis-server

Then:
redis-cli

Create user:
ACL SETUSER appuser on >app-pass allcommands allkeys

Now login:
AUTH appuser app-pass

Now:
username exists
password exists
permissions possible

Example restricted user:
ACL SETUSER readonly on >1234 +get ~*

Can only GET keys.
Cannot SET.

*Negative scenarios you MUST test*:

Scenario 1 — Wrong password
AUTH wrong-pass
Expected:
WRONGPASS invalid username-password pair

Scenario 2 — Replica down
Kill replica:
kill -9 <replica-pid>
Master should still work.

Scenario 3 — Master down
Kill master:
kill -9 <master-pid>
Replica becomes stale unless Sentinel promotes it.

Scenario 4 — No bind
Remove bind.
Redis exposed publicly.
Hackers scan internet continuously for open Redis.
This is how crypto-mining infections happen.

Scenario 5 — protected-mode yes
External machine cannot connect.

-----------------*docker wise*:--------------------------------

You should learn Redis Sentinel in Docker now.
It removes your Mac process chaos.

Right now you are manually:

* starting master
* starting replica
* starting sentinel
* killing PIDs

That teaches basics, but Docker teaches actual infra behavior.

Use this structure:

```txt
redis-docker/
 ├── docker-compose.yml
 ├── master/
 │    └── redis.conf
 ├── replica/
 │    └── redis.conf
 └── sentinel/
      └── sentinel.conf
```

---

# STEP 1 — Create project

```bash
mkdir redis-docker
cd redis-docker

mkdir master replica sentinel
touch docker-compose.yml

touch master/redis.conf
touch replica/redis.conf
touch sentinel/sentinel.conf
```

---

# STEP 2 — master redis.conf

`master/redis.conf`

```conf
port 6379

bind 0.0.0.0

protected-mode no

requirepass app-pass

appendonly yes
```

---

# STEP 3 — replica redis.conf

`replica/redis.conf`

```conf
port 6380

bind 0.0.0.0

protected-mode no

replicaof redis-master 6379

masterauth app-pass

requirepass app-pass

appendonly yes
```

Critical understanding:

```txt
replicaof redis-master 6379
```

Docker containers talk using service names.

NOT localhost.

Most beginners fail here.

---

# STEP 4 — sentinel.conf

`sentinel/sentinel.conf`

```conf
port 26379

bind 0.0.0.0

protected-mode no

sentinel monitor mymaster redis-master 6379 1

sentinel auth-pass mymaster app-pass

sentinel down-after-milliseconds mymaster 5000

sentinel failover-timeout mymaster 10000
```

---

# STEP 5 — docker-compose.yml

```yaml
version: '3.9'

services:

  redis-master:
    image: redis:7
    container_name: redis-master
    command: redis-server /usr/local/etc/redis/redis.conf
    volumes:
      - ./master/redis.conf:/usr/local/etc/redis/redis.conf
    ports:
      - "6379:6379"

  redis-replica:
    image: redis:7
    container_name: redis-replica
    command: redis-server /usr/local/etc/redis/redis.conf
    volumes:
      - ./replica/redis.conf:/usr/local/etc/redis/redis.conf
    ports:
      - "6380:6380"
    depends_on:
      - redis-master

  redis-sentinel:
    image: redis:7
    container_name: redis-sentinel
    command: redis-server /usr/local/etc/redis/sentinel.conf --sentinel
    volumes:
      - ./sentinel/sentinel.conf:/usr/local/etc/redis/sentinel.conf
    ports:
      - "26379:26379"
    depends_on:
      - redis-master
```

---

# STEP 6 — Start everything

```bash
docker compose up
```

You should see:

```txt
redis-master
redis-replica
redis-sentinel
```

running.

---

# STEP 7 — Verify master

Open new terminal:

```bash
docker exec -it redis-master redis-cli
```

Then:

```bash
AUTH app-pass

SET name keerthana

GET name
```

---

# STEP 8 — Verify replica

```bash
docker exec -it redis-replica redis-cli -p 6380
```

Then:

```bash
AUTH app-pass

GET name
```

You should see:

```txt
"keerthana"
```

because replication works.

Your logs already proved it:
MASTER <-> REPLICA sync: Finished with success

---

# STEP 9 — Verify replication role

Inside replica:

```bash
INFO replication
```

You should see:

```txt
role:slave
master_host:redis-master
```

---

# STEP 10 — Verify sentinel

```bash
docker exec -it redis-sentinel redis-cli -p 26379
```

Then:

```bash
SENTINEL masters
```

You should see:

* mymaster
* redis-master
* 6379

---

# STEP 11 — REAL FAILOVER TEST

This is the important part.

Kill master:

```bash
docker stop redis-master
```

Wait 5-10 seconds.

Now:

```bash
docker logs redis-sentinel
```

You will see:

```txt
+sdown master mymaster
+switch-master
```

Meaning:

* sentinel detected failure
* replica promoted to master

This is actual Redis HA learning.

---

# What you will finally understand

## Without Sentinel

```txt
App -> Fixed Redis IP
```

Master dies:

* app crashes
* manual intervention

---

## With Sentinel

```txt
App -> Sentinel -> Current Master
```

Master dies:

* sentinel promotes replica
* app reconnects automatically

---

*sentinal connection issue from docker*:
keerthana@Keerthanas-MacBook-Air redis-docker % docker inspect redis-sentinel | grep redis-docker_default
            "NetworkMode": "redis-docker_default",
                "redis-docker_default": {
keerthana@Keerthanas-MacBook-Air redis-docker % docker rm redis-sentinel
redis-sentinel
keerthana@Keerthanas-MacBook-Air redis-docker % docker run -d \
  --name redis-sentinel \
  --network redis-docker_default \
  -p 26379:26379 \
  redis:7 redis-server /sentinel.conf --sentinel
f992f1ee01a3a26d3f44f77dee77ef4051512f41ad14d40750316e61cdd9c983
keerthana@Keerthanas-MacBook-Air redis-docker % docker exec -it redis-sentinel sh
Error response from daemon: container f992f1ee01a3a26d3f44f77dee77ef4051512f41ad14d40750316e61cdd9c983 is not running
keerthana@Keerthanas-MacBook-Air redis-docker % docker rm redis-sentinel
redis-sentinel
keerthana@Keerthanas-MacBook-Air redis-docker % docker run -d \
  --name redis-sentinel \
  --network redis-docker_default \
  -p 26379:26379 \
  -v $(pwd)/sentinel.conf:/sentinel.conf \
  redis:7 \
  redis-server /sentinel.conf --sentinel
d59cc9ffac6c16e2073408bb50eb1e5061988daab6f5d01200d8dbb2647e4bf9
keerthana@Keerthanas-MacBook-Air redis-docker % docker ps
CONTAINER ID   IMAGE     COMMAND                  CREATED          STATUS         PORTS                                             NAMES
d59cc9ffac6c   redis:7   "docker-entrypoint.s…"   4 seconds ago    Up 4 seconds   0.0.0.0:26379->26379/tcp, [::]:26379->26379/tcp   redis-sentinel
c997bf2b4f2b   redis:7   "docker-entrypoint.s…"   2 minutes ago    Up 2 minutes   6379/tcp                                          dreamy_margulis
2804482618fa   redis:7   "docker-entrypoint.s…"   3 minutes ago    Up 3 minutes   6379/tcp                                          funny_wiles
3767fef76a26   redis:7   "docker-entrypoint.s…"   25 minutes ago   Up 2 minutes   0.0.0.0:6380->6380/tcp, [::]:6380->6380/tcp       redis-replica
91b0dc429f35   redis:7   "docker-entrypoint.s…"   25 minutes ago   Up 2 minutes   0.0.0.0:6379->6379/tcp, [::]:6379->6379/tcp       redis-master
keerthana@Keerthanas-MacBook-Air redis-docker % docker logs -f redis-sentinel
1:X 29 May 2026 12:08:01.289 * oO0OoO0OoO0Oo Redis is starting oO0OoO0OoO0Oo
1:X 29 May 2026 12:08:01.289 * Redis version=7.4.9, bits=64, commit=00000000, modified=0, pid=1, just started
1:X 29 May 2026 12:08:01.289 * Configuration loaded
1:X 29 May 2026 12:08:01.290 * monotonic clock: POSIX clock_gettime
1:X 29 May 2026 12:08:01.291 * Running mode=sentinel, port=26379.
1:X 29 May 2026 12:08:01.292 # WARNING: Sentinel was not able to save the new configuration on disk!!!: Is a directory
1:X 29 May 2026 12:08:01.292 * Sentinel ID is 4d5c2653cef8b074b86c5face3c8cfaf62f11b4c
^C%                                                                                                                             
keerthana@Keerthanas-MacBook-Air redis-docker % redis-cli -p 26379 SENTINEL masters
(empty array)
keerthana@Keerthanas-MacBook-Air redis-docker % docker exec -it redis-sentinel sh
# getent hosts redis-master
172.20.0.2      redis-master
# 

--------------

The key error is:-
-----------------
error while creating mount source path
'/host_mnt/Users/keerthana/.Trash/redis-docker/master/redis.conf'

operation not permitted

Fix
Move the project out of .Trash.

For example:
mkdir -p ~/Desktop/redis-docker
cp -R ~/.Trash/redis-docker/* ~/Desktop/redis-docker/
cd ~/Desktop/redis-docker

Then start again:-
docker compose down -v
docker compose up -d

why sentinel monitor mymaster redis-master 6379 1 this not worked in redis docker? : -
------------------------------------------------------------------------------------
Because there were actually **two different problems** mixed together.

### What should normally happen

Inside a Docker Compose network, this is valid:

```conf
sentinel monitor mymaster redis-master 6379 1
```
because Docker DNS automatically resolves:

```text
redis-master  --> container IP
```
So Sentinel should be able to find `redis-master`.

---

### What happened in your case

Your Sentinel started with:

```text
Failed to resolve hostname 'redis-master'
Can't resolve instance hostname
```

This means when Sentinel started, Docker DNS lookup for `redis-master` failed.

The evidence is here:

```bash
docker network inspect redis-docker_redis-net
```

showed only:

```text
redis-master
redis-replica
```

but **no sentinel container attached**.

Since Sentinel was crashing during startup, it never successfully joined the network.

So Sentinel tried:

```text
resolve(redis-master)
```
before it was properly attached / before Docker DNS was available to it.

Result:
```text
Can't resolve instance hostname
```

---

### Why IP worked
When you changed:
```conf
sentinel monitor mymaster redis-master 6379 1
```
to
```conf
sentinel monitor mymaster 172.21.0.2 6379 1
```
no DNS lookup was needed.

Sentinel directly connected to:
```text
172.21.0.2:6379
```
and started successfully.

That's why logs changed to:
```text
+monitor master mymaster 172.21.0.2 6379
+slave slave 172.21.0.3:6380
```

---
### Another thing I noticed
You added:
```yaml
container_name: redis-master
hostname: redis-master
```
later.

Without `container_name`, Compose creates:
```text
redis-docker-redis-master-1
```
and normally provides `redis-master` as a network alias.
That usually works.
But Docker DNS can be flaky when containers are repeatedly recreated while one service keeps crashing during startup.

---
### How I would verify the real cause
Run:
```bash
docker compose up -d
docker exec -it redis-master sh
```
Then from inside the master container:
```bash
getent hosts redis-master
```
If you get:
```text
172.21.0.x redis-master
```
Docker DNS is working.
If not:
```text
not found
```
then the network alias isn't being created correctly.
---

### For learning Redis Sentinel
Use hostname:
```conf
sentinel monitor mymaster redis-master 6379 1
```
That's the correct Docker Compose approach.

Using:
```conf
sentinel monitor mymaster 172.21.0.2 6379 1
```
*works for a demo*, but the IP changes whenever the containers are recreated, so it's not how Sentinel is normally deployed.

*So need to change ip to actual redis-master in sentinel:*
Correct. Using the IP is only a workaround. In a real Docker deployment, you should use:
```conf
sentinel monitor mymaster redis-master 6379 1
```
The fact that it failed means there is still a Docker networking/DNS issue in your setup.

For this to work, all three containers must be on the same Docker network:
```bash
docker network inspect redis-docker_redis-net
```

You should see:
```text
redis-master
redis-replica
redis-sentinel
```
inside the `Containers` section.

Earlier, your inspect output showed only:
```text
redis-master
redis-replica
```
and Sentinel was crashing immediately. Since it crashed during startup, it never fully joined the network, so DNS lookup for `redis-master` failed.
---------start here----------
To test Docker DNS directly, start a temporary container on the same network:
```bash
docker run --rm -it \
  --network redis-docker_redis-net \
  redis:7 sh
```

Inside it run:
```bash
getent hosts redis-master
```

Expected:
```text
172.21.0.x redis-master
```
If that works, Docker DNS is fine.

Then change Sentinel back to:
```conf
port 26379

sentinel resolve-hostnames yes
sentinel monitor mymaster redis-master 6379 1
sentinel auth-pass mymaster app-pass
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 10000
```

and recreate:
```bash
docker compose down -v
docker compose up -d --force-recreate
```
----------end here------------------

## clean docker down:

docker compose down -v                     
docker rm -f redis-replica1 redis-replica2 2>/dev/null
docker network prune -f
docker compose up -d


## negative senario commands:

keerthana@Keerthanas-MacBook-Air redis-docker-2R-3S % docker ps
CONTAINER ID   IMAGE                                   COMMAND                  CREATED          STATUS                             PORTS                                             NAMES
71b8d52ed128   redis:7                                 "docker-entrypoint.s…"   39 seconds ago   Up 37 seconds                      0.0.0.0:26380->26379/tcp, [::]:26380->26379/tcp   sentinel-2
5c9e74584d57   redis:7                                 "docker-entrypoint.s…"   39 seconds ago   Up 37 seconds                      0.0.0.0:6381->6379/tcp, [::]:6381->6379/tcp       redis-replica-2
355d313013aa   redis:7                                 "docker-entrypoint.s…"   39 seconds ago   Up 37 seconds                      0.0.0.0:26381->26379/tcp, [::]:26381->26379/tcp   sentinel-3
f05da65eec5e   redis:7                                 "docker-entrypoint.s…"   39 seconds ago   Up 37 seconds                      0.0.0.0:6380->6379/tcp, [::]:6380->6379/tcp       redis-replica-1
a20cbacfe919   redis:7                                 "docker-entrypoint.s…"   39 seconds ago   Up 37 seconds                      0.0.0.0:26379->26379/tcp, [::]:26379->26379/tcp   sentinel-1
60f0ddf03d04   redis:7                                 "docker-entrypoint.s…"   39 seconds ago   Up 37 seconds                      0.0.0.0:6379->6379/tcp, [::]:6379->6379/tcp       redis-master
b26222089adf   rediscommander/redis-commander:latest   "/usr/bin/dumb-init …"   39 seconds ago   Up 37 seconds (health: starting)   0.0.0.0:8081->8081/tcp, [::]:8081->8081/tcp       redis-ui
keerthana@Keerthanas-MacBook-Air redis-docker-2R-3S % docker exec sentinel-1 redis-cli -p 26379 ping
PONG
keerthana@Keerthanas-MacBook-Air redis-docker-2R-3S % docker exec sentinel-1 redis-cli -p 26379 -c
keerthana@Keerthanas-MacBook-Air redis-docker-2R-3S % docker stop redis-master
redis-master
keerthana@Keerthanas-MacBook-Air redis-docker-2R-3S % sleep 15
keerthana@Keerthanas-MacBook-Air redis-docker-2R-3S % docker exec redis-replica-1 redis-cli INFO replication | grep role
docker exec redis-replica-2 redis-cli INFO replication | grep role
role:slave
role:master
keerthana@Keerthanas-MacBook-Air redis-docker-2R-3S % docker exec sentinel-1 redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster 
172.18.0.5
6379
keerthana@Keerthanas-MacBook-Air redis-docker-2R-3S % docker exec redis-replica-1 redis-cli SET after_failover "Working on new master" 2>/dev/null || docker exec redis-replica-2 redis-cli SET after_failover "Working on new master"
READONLY You can't write against a read only replica.

keerthana@Keerthanas-MacBook-Air redis-docker-2R-3S % docker start redis-master
redis-master
keerthana@Keerthanas-MacBook-Air redis-docker-2R-3S % sleep 5
docker exec redis-master redis-cli INFO replication | grep role
role:slave
keerthana@Keerthanas-MacBook-Air redis-docker-2R-3S % 