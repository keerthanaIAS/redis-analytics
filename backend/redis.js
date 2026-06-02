const Redis = require("ioredis");

const redis = new Redis({
    // ------code wise setup------
    // host: "10.55.66.132",
    // port: 6379,
    // password: "app-pass"
    // -----config wise S1 setup------
    // sentinels: [
    //     { host: "127.0.0.1", port: 26379 }
    // ],
    // name: "mymaster",
    // password: "app-pass",
    // docker setup
    // host: "127.0.0.1",
    // port: 6379,
    // password: "app-pass"
    // ----S3 setup-----
    sentinels: [
        { host: "127.0.0.1", port: 26379 },
        { host: "127.0.0.1", port: 26380 },
        { host: "127.0.0.1", port: 26381 }
    ],
    name: "mymaster",
    // if the config sentinal file have redis-master uncommand this for local redis connectivity / in config sentinel file use 127.0.0.1 instead redis-master
    // natMap: {
    //     "172.18.0.3:6379": {
    //         host: "127.0.0.1",
    //         port: 6379
    //     }
    // }
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