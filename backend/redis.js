const Redis = require("ioredis");

const redis = new Redis({
    // code wise setup
    // host: "10.55.66.132",
    // port: 6379,
    // password: "app-pass"
    // config wise setup and for docker wise too
    sentinels: [
        { host: "127.0.0.1", port: 26379 }
    ],
    name: "mymaster",
    password: "app-pass"
});

redis.on("connect", () => {
    console.log("Redis connected");
});

redis.on("reconnecting", () => {
    console.log("Redis reconnecting...");
});

redis.on("error", (err) => {
    console.log("Redis error", err.message);
});

module.exports = redis;