const express = require('express');
const redis = require('redis');

const app = express();
const PORT = process.env.PORT || 3000;
const INSTANCE = process.env.INSTANCE_NAME || 'unknown';

// Connect to Redis
const redisClient = redis.createClient({
    url: 'redis://redis:6379'
});

redisClient.on('error', (err) => console.error('Redis Error:', err));
redisClient.on('connect', () => console.log(`${INSTANCE}: Connected to Redis`));

// Wait for connection
(async () => {
    await redisClient.connect();
})();

// ============ LOCK IMPLEMENTATION ============

// Acquire a lock
async function acquireLock(lockName, timeoutSeconds = 10) {
    const lockKey = `lock:${lockName}`;
    const lockValue = `${INSTANCE}-${Date.now()}-${Math.random()}`; // Added random for uniqueness

    // SET NX = Only set if Not eXists
    // SET PX = Expiry in milliseconds
    const acquired = await redisClient.setNX(lockKey, lockValue);

    if (acquired) {
        // Set expiry so lock auto-releases if app crashes
        await redisClient.expire(lockKey, timeoutSeconds);
        return lockValue;
    }

    return null;
}

// Release a lock
async function releaseLock(lockName, lockValue) {
    const lockKey = `lock:${lockName}`;

    // Lua script to ensure we only release OUR lock
    const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
    `;

    const result = await redisClient.eval(script, {
        keys: [lockKey],
        arguments: [lockValue]
    });

    return result === 1;
}

// Wait for lock (handles race conditions properly)
async function waitForLock(lockName, timeoutSeconds = 5, maxWaitMs = 10000) {
    const startTime = Date.now();
    let attempt = 0;

    while (Date.now() - startTime < maxWaitMs) {
        const lockValue = await acquireLock(lockName, timeoutSeconds);
        if (lockValue) return lockValue;

        attempt++;
        // Exponential backoff: 50ms, 100ms, 200ms, 400ms...
        const waitTime = Math.min(50 * Math.pow(2, attempt), 1000);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    return null; // Timed out
}

// ============ COUNTER EXAMPLE ============

const COUNTER_KEY = 'counter:total';
const QUEUE_LOCK = 'counter-queue';

// API: Get current counter value
app.get('/counter', async (req, res) => {
    const value = await redisClient.get(COUNTER_KEY);
    res.json({
        instance: INSTANCE,
        counter: parseInt(value) || 0
    });
});

// API: Race condition demo (BROKEN - shows the problem)
app.get('/increment/race-condition', async (req, res) => {
    const startTime = Date.now();

    // Read current value
    let value = await redisClient.get(COUNTER_KEY);
    let current = parseInt(value) || 0;

    // Simulate processing time (makes race condition worse)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Write new value
    const newValue = current + 1;
    await redisClient.set(COUNTER_KEY, newValue);

    res.json({
        instance: INSTANCE,
        scenario: 'RACE CONDITION - This will lose updates!',
        oldValue: current,
        newValue: newValue,
        timeMs: Date.now() - startTime
    });
});

// Increment counter WITHOUT lock (race condition demo)
app.get('/increment/no-lock', async (req, res) => {
    const startTime = Date.now();

    // READ
    let value = await redisClient.get(COUNTER_KEY);
    let current = parseInt(value) || 0;

    // SIMULATE WORK (makes race condition more likely)
    await new Promise(resolve => setTimeout(resolve, 100));

    // WRITE
    const newValue = current + 1;
    await redisClient.set(COUNTER_KEY, newValue);

    res.json({
        instance: INSTANCE,
        method: 'NO LOCK',
        oldValue: current,
        newValue: newValue,
        timeMs: Date.now() - startTime
    });
});

// Increment counter WITH lock (safe)
app.get('/increment/with-lock', async (req, res) => {
    const startTime = Date.now();

    // WAIT for lock (don't reject!)
    const lockValue = await waitForLock(QUEUE_LOCK, 5, 10000);

    if (!lockValue) {
        return res.status(423).json({
            instance: INSTANCE,
            error: 'LOCKED - Another instance is updating',
            message: 'Try again in a moment'
        });
    }

    try {
        // We have the lock
        let value = await redisClient.get(COUNTER_KEY);
        let current = parseInt(value) || 0;

        // Simulate work (lock prevents race condition)
        await new Promise(resolve => setTimeout(resolve, 100));

        const newValue = current + 1;
        await redisClient.set(COUNTER_KEY, newValue);

        res.json({
            instance: INSTANCE,
            method: 'LOCK PROTECTED - No race condition!',
            lockValue: lockValue.substring(0, 20) + '...',
            oldValue: current,
            newValue: newValue,
            timeMs: Date.now() - startTime
        });

    } finally {
        // ALWAYS release the lock
        await releaseLock(QUEUE_LOCK, lockValue);
    }
});

// Atomic Redis operation (alternative without lock)
app.get('/increment/atomic', async (req, res) => {
    // Redis INCR is atomic - no lock needed!
    const newValue = await redisClient.incr(COUNTER_KEY);
    
    res.json({
        instance: INSTANCE,
        scenario: 'ATOMIC - Redis handles it natively',
        method: 'Redis INCR command',
        newValue: newValue
    });
});

// Reset counter
app.get('/reset', async (req, res) => {
    await redisClient.set(COUNTER_KEY, 0);
    res.json({ message: 'Counter reset to 0', instance: INSTANCE });
});

// Get lock status (debugging)
app.get('/lock-status', async (req, res) => {
    const lockKey = `lock:${QUEUE_LOCK}`;
    const currentLock = await redisClient.get(lockKey);

    res.json({
        lockName: QUEUE_LOCK,
        currentlyLocked: !!currentLock,
        lockedBy: currentLock,
        ttl: currentLock ? await redisClient.ttl(lockKey) : 0
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        instance: INSTANCE,
        status: 'healthy',
        redis: redisClient.isOpen
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`${INSTANCE}: Running on http://localhost:${PORT}`);
    console.log(`${INSTANCE}: Endpoints:`);
    console.log(`  GET  /counter          - View counter`);
    console.log(`  GET  /increment/no-lock   - Race condition demo`);
    console.log(`  GET  /increment/with-lock - Safe with lock`);
    console.log(`  GET  /reset           - Reset counter`);
});