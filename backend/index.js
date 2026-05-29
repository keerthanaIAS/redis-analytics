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


// API hit counter
app.get("/hit", async (req, res) => {

    const total = await redis.incr("api:hits");

    res.json({
        total
    });
});


// online users
app.post("/online/:userId", async (req, res) => {

    const { userId } = req.params;

    await redis.set(
        `online:${userId}`,
        "ONLINE",
        "EX",
        30
    );

    res.json({
        message: "user online"
    });
});


// get online users count
app.get("/online-count", async (req, res) => {

    const keys = await redis.keys("online:*");

    res.json({
        users: keys.length
    });
});


// cache example
app.get("/analytics", async (req, res) => {

    const cached = await redis.get("analytics");

    if (cached) {

        return res.json({
            source: "CACHE",
            data: JSON.parse(cached)
        });
    }

    // fake expensive calculation
    await new Promise(r => setTimeout(r, 3000));

    const analytics = {
        users: Math.floor(Math.random() * 1000),
        revenue: Math.floor(Math.random() * 10000)
    };

    await redis.set(
        "analytics",
        JSON.stringify(analytics),
        "EX",
        20
    );

    res.json({
        source: "FRESH",
        data: analytics
    });
});

// code wise setup redis set and get
// app.get("/set", async (req, res) => {
//     await redis.set("name", "keerthana");
//     res.json({ success: true, message: "saved" });
// });
// app.get("/get", async (req, res) => {
//     const data = await redis.get("name");
//     res.json({ success: true, data });
// });

app.listen(4000, () => {
    console.log("server running 4000");
});