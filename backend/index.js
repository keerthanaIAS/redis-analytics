const express = require("express");
const cors = require("cors");

const redis = require("./redis");

const app = express();

app.use(cors());
app.use(express.json());

// =========================
// HEALTH & MONITORING
// =========================

app.get("/health", async (req, res) => {
    const pong = await redis.ping();
    res.json({ pong });
});

app.get("/info", async (req, res) => {
    const info = await redis.info();
    res.send({ info });
});

app.get("/clients", async (req, res) => {
    const clients = await redis.client("list");
    res.send(clients);
});

app.get("/slowlog", async (req, res) => {
    const log = await redis.slowlog("get");
    res.json(log);
});

app.get("/sentinel", async (req, res) => {
    try {
        // Check if Redis is in Sentinel mode
        const info = await redis.info();

        if (info.includes("redis_mode:sentinel")) {
            const master = await redis.sentinel("master", "mymaster");
            const replicas = await redis.sentinel("replicas", "mymaster");
            res.json({ master, replicas });
        } else {
            res.json({
                message: "Redis Sentinel not configured",
                note: "This Redis instance is running in standalone mode. Sentinel features are only available when Redis is configured as a Sentinel.",
                current_mode: "standalone"
            });
        }
    } catch (err) {
        res.json({
            error: "Sentinel not available",
            message: err.message,
            suggestion: "This feature requires Redis Sentinel configuration. Check your redis.conf or remove sentinel endpoints."
        });
    }
});

// =========================
// BASIC STRING OPERATIONS
// =========================

app.post("/set", async (req, res) => {
    const { key, value } = req.body;
    await redis.set(key, value);
    res.json({ success: true, message: "saved" });
});

app.get("/get/:key", async (req, res) => {
    const { key } = req.params;
    const value = await redis.get(key);
    res.json({ success: true, value });
});

app.get("/keys", async (req, res) => {
    const keys = await redis.keys("*");
    res.json({ keys });
});

app.delete("/delete/:key", async (req, res) => {
    const { key } = req.params;
    await redis.del(key);
    res.json({ success: true });
});

// =========================
// KEY EXISTENCE & TTL
// =========================

app.get("/exists/:key", async (req, res) => {
    const exists = await redis.exists(req.params.key);
    res.json({ exists: exists === 1 });
});

app.post("/expire", async (req, res) => {
    const { key, ttl } = req.body;
    await redis.expire(key, ttl);
    res.json({ success: true });
});

app.get("/ttl/:key", async (req, res) => {
    const ttl = await redis.ttl(req.params.key);
    res.json({ ttl });
});

// =========================
// GETSET OPERATION
// =========================

app.post("/getset", async (req, res) => {
    const { key, value } = req.body;
    const old = await redis.getset(key, value);
    res.json({ old });
});

// =========================
// TTL SAVE (SET WITH EXPIRE)
// =========================

app.post("/set-expire", async (req, res) => {
    const { key, value, ttl } = req.body;
    await redis.set(key, value, "EX", ttl);
    res.json({ success: true });
});

// =========================
// COUNTER OPERATIONS
// =========================

app.post("/increment/:key", async (req, res) => {
    const value = await redis.incr(req.params.key);
    res.json({ value });
});

app.post("/incrby/:key", async (req, res) => {
    const { value } = req.body;
    const result = await redis.incrby(req.params.key, value);
    res.json({ result });
});

app.post("/decrby/:key", async (req, res) => {
    const { value } = req.body;
    const result = await redis.decrby(req.params.key, value);
    res.json({ result });
});

// =========================
// HASH OPERATIONS
// =========================

app.post("/user", async (req, res) => {
    const { id, name, email } = req.body;
    await redis.hset(`user:${id}`, { name, email });
    res.json({ success: true });
});

app.get("/user/:id", async (req, res) => {
    const data = await redis.hgetall(`user:${req.params.id}`);
    res.json(data);
});

app.get("/user/:id/:field", async (req, res) => {
    const value = await redis.hget(`user:${req.params.id}`, req.params.field);
    res.json({ value });
});

app.delete("/user/:id/:field", async (req, res) => {
    await redis.hdel(`user:${req.params.id}`, req.params.field);
    res.json({ success: true });
});

app.get("/user/:id/exists/:field", async (req, res) => {
    const exists = await redis.hexists(`user:${req.params.id}`, req.params.field);
    res.json({ exists });
});

// =========================
// LIST / QUEUE OPERATIONS
// =========================

app.post("/queue", async (req, res) => {
    await redis.lpush("orders", JSON.stringify(req.body));
    res.json({ success: true });
});

app.get("/queue", async (req, res) => {
    const order = await redis.rpop("orders");
    res.json({ order: order ? JSON.parse(order) : null });
});

app.get("/queue/block", async (req, res) => {
    const result = await redis.blpop("orders", 10);
    res.json({ result: result ? { key: result[0], value: JSON.parse(result[1]) } : null });
});

// =========================
// SET OPERATIONS
// =========================

app.post("/tag", async (req, res) => {
    await redis.sadd("tags", req.body.tag);
    res.json({ success: true });
});

app.get("/tag", async (req, res) => {
    const tags = await redis.smembers("tags");
    res.json(tags);
});

app.get("/tag/exists/:tag", async (req, res) => {
    const exists = await redis.sismember("tags", req.params.tag);
    res.json({ exists: exists === 1 });
});

app.delete("/tag/:tag", async (req, res) => {
    await redis.srem("tags", req.params.tag);
    res.json({ success: true });
});

// =========================
// SORTED SET / LEADERBOARD
// =========================

app.post("/leaderboard", async (req, res) => {
    const { user, score } = req.body;
    await redis.zadd("leaderboard", Number(score), user);
    res.json({ success: true });
});

app.get("/leaderboard", async (req, res) => {
    const data = await redis.zrevrange("leaderboard", 0, 9, "WITHSCORES");
    // Format as array of objects
    const formatted = [];
    for (let i = 0; i < data.length; i += 2) {
        formatted.push({ user: data[i], score: parseInt(data[i + 1]) });
    }
    res.json(formatted);
});

app.post("/leaderboard/incr", async (req, res) => {
    const { user, score } = req.body;
    const result = await redis.zincrby("leaderboard", score, user);
    res.json({ result });
});

app.get("/leaderboard/rank/:user", async (req, res) => {
    const rank = await redis.zrank("leaderboard", req.params.user);
    res.json({ rank: rank !== null ? rank + 1 : null });
});

// =========================
// PUB/SUB
// =========================

app.post("/publish", async (req, res) => {
    await redis.publish("chat", req.body.message);
    res.json({ success: true });
});

// Subscriber setup
const subscriber = redis.duplicate();
(async () => {
    await subscriber.subscribe("chat", (message) => {
        console.log("Received message:", message);
    });
})();

// =========================
// SESSION STORE
// =========================

app.post("/login", async (req, res) => {
    const { userId } = req.body;
    const token = Math.random().toString(36).substring(2, 15);
    await redis.set(`session:${token}`, userId, "EX", 3600);
    res.json({ token });
});

app.get("/session/:token", async (req, res) => {
    const user = await redis.get(`session:${req.params.token}`);
    res.json({ user });
});

// =========================
// RATE LIMITER
// =========================

app.get("/limited", async (req, res) => {
    const ip = req.ip;
    const key = `rate:${ip}`;
    const count = await redis.incr(key);

    if (count === 1) {
        await redis.expire(key, 60);
    }

    if (count > 5) {
        return res.status(429).json({
            message: "Too many requests",
            limit: 5,
            remaining: 0,
            reset: 60
        });
    }

    res.json({
        count,
        limit: 5,
        remaining: 5 - count,
        reset: 60
    });
});

// =========================
// STREAMS (Kafka-like)
// =========================

app.post("/stream/add", async (req, res) => {
    const { message } = req.body;
    const id = await redis.xadd("events", "*", "msg", message);
    res.json({ id });
});

app.get("/stream/read", async (req, res) => {
    const data = await redis.xread("STREAMS", "events", "0");
    // Format the response
    let formatted = [];
    if (data && data.length > 0) {
        const stream = data[0];
        const messages = stream[1];
        formatted = messages.map(msg => ({
            id: msg[0],
            message: msg[1][1] // msg field value
        }));
    }
    res.json({ data: formatted });
});

// =========================
// SERVER START
// =========================

app.listen(4000, () => {
    console.log("Server running on port 4000");
});