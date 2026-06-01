const Redis = require("ioredis");

const redis = new Redis({
    // code wise setup
    // host: "10.55.66.132",
    // port: 6379,
    // password: "app-pass"
    // config wise setup
    // sentinels: [
    //     { host: "127.0.0.1", port: 26379 }
    // ],
    // name: "mymaster",
    // password: "app-pass",
    // docker setup
    // host: "127.0.0.1",
    // port: 6379,
    // password: "app-pass"
    // S3 setup
    sentinels: [
        { host: "sentinel1", port: 26379 },
        { host: "sentinel2", port: 26379 },
        { host: "sentinel3", port: 26379 }
    ],
    name: "mymaster"
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