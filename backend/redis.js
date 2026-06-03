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
    natMap: (key) => {
        console.log("natMap lookup:", key);

        return {
            "172.18.0.3:6379": { host: "127.0.0.1", port: 6379 },
            "172.18.0.7:6380": { host: "127.0.0.1", port: 6380 },
            "172.18.0.6:6381": { host: "127.0.0.1", port: 6381 }
        }[key];
    }
    // When you stop and restart all Redis containers, Docker may assign new internal network IPs (172.18.x.x), 
    // so the old IPs (e.g., 172.18.0.3, 172.18.0.6, 172.18.0.8) can change to new ones (e.g., 172.18.0.5, 172.18.0.3, 172.18.0.7).
    //  natMap: {
    //     "172.18.0.5:6379": { host: "127.0.0.1", port: 6379 },  // redis-master
    //     "172.18.0.3:6379": { host: "127.0.0.1", port: 6380 },  // redis-replica-1
    //     "172.18.0.7:6379": { host: "127.0.0.1", port: 6381 },  // redis-replica-2
    // }
});

//"172.18.0.0/16": { host: "127.0.0.1" } -> means "for any IP in the range 172.18.x.x, map it to localhost", 
// but ioredis natMap does not support CIDR ranges (/16), so this entry is ignored and does nothing.

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