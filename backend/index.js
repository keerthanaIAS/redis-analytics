const express = require("express");
const cors = require("cors");

const redis = require("./redis");

const app = express();

app.use(cors());
app.use(express.json());

// code wise setup for ip whitelisting
// Allowed IP whitelist 
// const allowedIPs = ["::1", "127.0.0.1", "::ffff:127.0.0.1", "::ffff:10.55.66.132"];
// Middleware 
// app.use((req, res, next) => {
//     const clientIP = req.ip; console.log("Incoming IP:", clientIP);
//     if (!allowedIPs.includes(clientIP)) {
//         return res.status(403).json({ success: false, message: "IP not allowed" });
//     }
//     next();
// });

// code wise setup redis set and get
// app.get("/set", async (req, res) => {
//     await redis.set("name", "keerthana");
//     res.json({ success: true, message: "saved" });
// });
// app.get("/get", async (req, res) => {
//     const data = await redis.get("name");
//     res.json({ success: true, data });
// });

// basic redis commands
app.post("/set", async (req, res) => {
    const { key, value } = req.body;

    await redis.set(key, value);

    res.json({
        success: true,
        message: "saved"
    });
});

app.get("/get/:key", async (req, res) => {

    const { key } = req.params;

    const value = await redis.get(key);

    res.json({
        success: true,
        value
    });
});

app.get("/keys", async (req, res) => {

    const keys = await redis.keys("*");

    res.json({
        keys
    });
});

app.delete("/delete/:key", async (req, res) => {

    const { key } = req.params;

    await redis.del(key);

    res.json({
        success: true
    });
});

// intermediate redis commands:

// Expiry (TTL)
// Use case:
// OTP
// Session
// Cache
app.post("/set-expire", async (req, res) => {

    const { key, value, ttl } = req.body;

    await redis.set(
        key,
        value,
        "EX",
        ttl
    );

    res.json({
        success: true
    });
});

// Counter
// Use case:
// API hits
// Likes
// Page views
app.post("/increment/:key", async (req, res) => {

    const value = await redis.incr(
        req.params.key
    );

    res.json({
        value
    });
});

// Hash
// stored object-like data.
// Redis:
// HSET user:1 name keerthana email abc@gmail.com
// HGETALL user:1
app.post("/user", async (req, res) => {

    const { id, name, email } = req.body;

    await redis.hset(
        `user:${id}`,
        {
            name,
            email
        }
    );

    res.json({
        success: true
    });
});
app.get("/user/:id", async (req, res) => {

    const data = await redis.hgetall(
        `user:${req.params.id}`
    );

    res.json(data);
});

// List
// Queue implementation.
// Push
// Use case:
// Jobs
// Notifications
// Queue systems
// Redis:
// LPUSH orders order1
// LPUSH orders order2
// RPOP orders
app.post("/queue", async (req, res) => {

    await redis.lpush(
        "orders",
        JSON.stringify(req.body)
    );

    res.json({
        success: true
    });
});
// Pop
app.get("/queue", async (req, res) => {

    const order =
        await redis.rpop("orders");

    res.json({
        order
    });
});

// Set
// Unique values only.
// Add
// Redis:
// SADD tags redis
// SADD tags kafka
// SADD tags redis
// SMEMBERS tags
// Result:
// redis
// kafka
// * Duplicate ignored.
app.post("/tag", async (req, res) => {

    await redis.sadd(
        "tags",
        req.body.tag
    );

    res.json({
        success: true
    });
});
app.get("/tag", async (req, res) => {

    const tags =
        await redis.smembers("tags");

    res.json(tags);
});

// Sorted Set
// Leaderboard.
// 1. Add Score
// 2. Top Users
// Redis:
// ZADD leaderboard 100 keerthana
// ZADD leaderboard 200 ram
// ZREVRANGE leaderboard 0 9 WITHSCORES
// Use case:
// Gaming
// Rankings
// Rewards
app.post("/leaderboard", async (req, res) => {

    const { user, score } = req.body;

    await redis.zadd(
        "leaderboard",
        Number(score),
        user
    );

    res.json({
        success: true 
    });
});
app.get("/leaderboard", async (req, res) => {

    const data =
        await redis.zrevrange( // get the higher socre first
            "leaderboard",
            0,
            9,
            "WITHSCORES"
        );

    res.json(data);
});

// Pub/Sub
// 1. Publisher
// 2. Subscriber
// Use case:
// Chat
// Live updates
app.post("/publish", async (req, res) => {

    await redis.publish(
        "chat",
        req.body.message
    );

    res.json({
        success: true
    });
});
const subscriber = redis.duplicate();
(async () => {
    await subscriber.subscribe(
        "chat",
        (message) => {
            console.log(message);
        }
    );
})

// Session Store
// Use case:
// Authentication
// 1. Login
app.post("/login", async (req, res) => {

    const { userId } = req.body;

    const token =
        Math.random().toString(36);

    await redis.set(
        `session:${token}`,
        userId,
        "EX",
        3600
    );

    res.json({
        token
    });
});
// 2. Check
app.get("/session/:token", async (req, res) => {

    const user =
        await redis.get(
            `session:${req.params.token}`
        );

    res.json({
        user
    });
});

// Rate Limiter
// Use case:
// DDoS protection
// API protection
app.get("/limited", async (req, res) => {

    const ip = req.ip;

    const key = `rate:${ip}`;

    const count =
        await redis.incr(key);

    if (count === 1) {
        await redis.expire(
            key,
            60
        );
    }

    if (count > 5) {
        return res.status(429)
            .json({
                message:
                    "Too many requests"
            });
    }

    res.json({
        count
    });
});

// Monitoring Redis
app.get("/info", async (req, res) => {

    const info = await redis.info();

    res.send(info);
});


app.listen(4000, () => {
    console.log("server running 4000");
});