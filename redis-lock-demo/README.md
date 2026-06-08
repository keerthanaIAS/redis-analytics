## What is a Distributed Lock?
Problem: Multiple servers trying to update the same data at the same time

Server A: Read count=10 → Add 1 → Write count=11
Server B: Read count=10 → Add 1 → Write count=11  ❌ Lost update!

Lock Solution:
Server A: GET LOCK ✅ → Read count=10 → Add 1 → Write count=11 → RELEASE LOCK
Server B: GET LOCK ❌ (waiting) → Then reads count=11 → Add 1 → Write count=12 ✅

# Reset counter
curl http://localhost:3001/reset

# Send 3 simultaneous requests WITH lock
curl http://localhost:3001/increment/with-lock &
curl http://localhost:3002/increment/with-lock &
curl http://localhost:3003/increment/with-lock &
wait

# Check result - should be 3
curl http://localhost:3001/counter

(Simple Summary)
#	Concept	                              What It Means
1	Race Condition	                  Two things trying to update the same data at the same time = data loss
2	Distributed Lock	              A "key" that only one server can hold at a time
3	Atomic Operation	              Redis built-in commands that are automatically safe
4	Lock with Queue	                  Requests wait their turn instead of failing

## The Core Problem:-
Without Lock (Your /increment/no-lock):
Time    Server A              Server B              Counter Value
─────────────────────────────────────────────────────────────────
t1      Read counter = 0                            
t2                            Read counter = 0        
t3      Add 1 → write 1                            
t4                            Add 1 → write 1          
t5                                                   ❌ Counter = 1 (Lost 1!)
When multiple servers read THEN write, updates get lost!

With Lock (Your /increment/with-lock):
Time    Server A              Server B              Lock Status
─────────────────────────────────────────────────────────────────
t1      GET LOCK ✅                                  Lock: A
t2      Read counter = 0      Tries lock ❌          Lock: A (B waits)
t3      Add 1 → write 1       Still waiting          Lock: A
t4      Release lock          GET LOCK ✅            Lock: B
t5                            Read counter = 1       
t6                            Add 1 → write 2        
t7                            Release lock           Lock: free
                                                      ✅ Counter = 2
Lock makes them take turns - no data loss!

## The 3 Approaches Learned
// 1️⃣ RACE CONDITION (Broken)
// ❌ Read, then write = lost updates
app.get('/increment/no-lock')

// 2️⃣ DISTRIBUTED LOCK (Fixed)
// ✅ Wait your turn, all succeed
app.get('/increment/with-lock')

// 3️⃣ ATOMIC (Best when possible)
// ⚡ Redis INCR does it in one step
await redisClient.incr('counter')

## Key Code Patterns Learned
1. Lock Acquisition Pattern
// Try to get lock, return null if failed
async function acquireLock(lockName, timeoutSeconds) {
    const acquired = await redisClient.setNX(lockKey, lockValue);
    if (acquired) {
        await redisClient.expire(lockKey, timeoutSeconds);
        return lockValue;
    }
    return null;
}
2. Wait with Backoff Pattern
// Keep trying with increasing delays
async function waitForLock(lockName) {
    while (timeNotExpired) {
        const lock = await acquireLock();
        if (lock) return lock;
        await sleep(increasingDelay); // 50ms, 100ms, 200ms...
    }
}
3. Safe Release Pattern
// Only release if YOU own the lock
async function releaseLock(lockName, lockValue) {
    // Lua script ensures we don't delete someone else's lock
    if (currentLock === myLockValue) {
        delete lock;
    }
}
4. Try-Finally Pattern (CRITICAL!)
try {
    await doWork();  // Do the protected work
} finally {
    await releaseLock();  // ALWAYS release, even if error!
}

Real-World Scenarios Where You'll Use This:-
-------------------------------------------
Scenario	                             Why You Need Lock
Bank Transfer	              Check balance, then deduct - can't have two withdrawals at once
Inventory	                  Check stock, then reduce - can't oversell
Booking System	              Check availability, then book - no double booking
Counter/Likes	              Read count, increment, write - no lost likes
File Processing	              Read file, process, write - no corrupted data

1. What is a race condition?
When two operations read then write the same data simultaneously, causing lost updates

2. How does a distributed lock work?
Using Redis SETNX (set if not exists) - only one server can "own" the key at a time

3. Why do we need exponential backoff?
So waiting requests don't all retry at the same time (avoids "thundering herd")

4. Why use Lua script for release?
To ensure we only release locks we own (atomic check-and-delete)

5. What's the try-finally pattern?
Always release locks even if your code crashes, or use expiry as backup

Q1: What happens if you forget to release a lock?
A: Next request waits forever OR until expiry (10 seconds)

Q2: Why do we need Math.random() in lock value?
A: So two instances don't accidentally use same lock identifier

Q3: What if lock expires while you're working?
A: Another request could get the lock - use watchdog pattern for long operations

Q4: Why is atomic better than lock?
A: No waiting, no lock management, just one Redis command

## with lock Lock Lifecycle
┌─────────────────────────────────────────────────────────────────┐
│                    LOCK LIFECYCLE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. SETNX creates lock          ──→ Lock exists                 │
│                                                                 │
│  2. code runs                   ──→ Lock still exists           │
│                                                                 │
│  3. Two ways lock can be removed:                               │
│     a) You call releaseLock()   ──→ Lock deleted immediately    │
│     b) Timeout expires          ──→ Redis auto-deletes          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
Scenario 1: 
await acquireLock();     // SETNX creates lock
try {
    await doWork();      // Lock held during work
} finally {
    await releaseLock(); // EXPLICITLY deletes lock
}
Scenario 2:Crash (Auto-expiry saves you)
await acquireLock();     // SETNX creates lock with 10 sec expiry
// CRASH - releaseLock() never called
// After 10 seconds: Redis AUTO-DELETES the lock
// Other requests can now get the lock
Scenario 3: Forgot to Release
await acquireLock();     // SETNX creates lock
await doWork();          // Work done
// Forgot to call releaseLock()!
// Lock stays until timeout expires (wasting time)

*Code Shows Both Mechanisms*
// 1. SETNX creates lock WITH EXPIRY
async function acquireLock(lockName, timeoutSeconds = 10) {
    const acquired = await redisClient.setNX(lockKey, lockValue);
    
    if (acquired) {
        // ✅ CRITICAL: Set expiry as backup!
        await redisClient.expire(lockKey, timeoutSeconds);
        return lockValue;
    }
    return null;
}

// 2. Explicit release (normal path)
async function releaseLock(lockName, lockValue) {
    // Deletes lock IMMEDIATELY
    // Only if we still own it
}

// 3. In your API:
app.get('/increment/with-lock', async (req, res) => {
    const lockValue = await waitForLock(QUEUE_LOCK, 5, 10000);
    //                                        ↑ timeoutSeconds = 5
    
    try {
        // Work here - lock is held
        await doWork();
    } finally {
        await releaseLock(QUEUE_LOCK, lockValue);  // ← Explicit release
    }
});

*Visual Timeline*
Time ──────────────────────────────────────────────────────────────►

WITH EXPLICIT RELEASE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SETNX     Work starts    Work ends    Release Lock
  │           │              │             │
  ▼           ▼              ▼             ▼
[LOCK] [=====WORK=====] [LOCK]      [NO LOCK]
         Lock held during work only


WITHOUT EXPLICIT RELEASE (Timeout only):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SETNX     Work starts    Work ends    10 sec timeout
  │           │              │             │
  ▼           ▼              ▼             ▼
[LOCK] [=====WORK=====] [LOCK IDLE....] [NO LOCK]
         ^              ^
         |              Lock stays unnecessarily!
         Work done, but lock wasted 10 seconds

*Remember* : 
SETNX Doesn't auto-release, need to call release lock,
What if my app crashes? ans: Timeout auto-releases after N seconds,
What if I forget releaseLock()? ans: Lock stays until timeout - BAD!,
Can lock expire while I'm working? ans: Yes! Set timeout longer than max work time,
How long should timeout be? ans: Slightly longer than max expected work time

## try-finally Pattern
// ✅ ALWAYS use try-finally
const lock = await acquireLock();
try {
    await doWork();  // Could crash here!
} finally {
    await releaseLock();  // ALWAYS runs, even on crash
}

// ❌ NEVER do this
const lock = await acquireLock();
await doWork();
await releaseLock();  // If doWork() crashes, lock never released!

## The Four Commands
Command	               What it does	                        When to use
---------           ------------------                  ----------------------------------
SETNX	             Set if Not eXists	                   Creating locks
EXPIRE	             Set time-to-live on a key	           Auto-cleanup, crash protection
EVAL (Lua)	         Run atomic script	                   Check-then-delete operations
INCR	             Atomic increment	                   Counters, likes, views

1. SETNX - Create Lock (One-time set)
// Only succeeds if lock doesn't exist
const acquired = await redisClient.setNX('lock:account', 'server-1');
// Returns: 1 (true) if created, 0 (false) if already exists
Use when: You need exclusive access to a resource

2. EXPIRE - Set Timeout (Auto-cleanup)
// Lock will auto-delete after 10 seconds
await redisClient.expire('lock:account', 10);
Use when: You want automatic cleanup (crash protection)

3. EVAL (Lua) - Atomic Check + Delete
// This runs as ONE atomic operation in Redis
const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
    else
        return 0
    end
`;
Why need this? Without Lua, you'd have a race condition in your RELEASE code!
// ❌ WITHOUT Lua - Race condition in release!
const current = await redisClient.get(lockKey);  // Step 1
if (current === myLockValue) {                   // Step 2
    await redisClient.del(lockKey);              // Step 3
}
// Between Step 1 and 3, lock could expire and someone else gets it!
// ✅ WITH Lua - Atomic, no race condition!
await redisClient.eval(script, {...}); // All steps happen atomically

4. INCR - Atomic Increment
// One Redis command = One atomic operation
const newValue = await redisClient.incr('counter');
Why no lock needed? Redis does READ+ADD+WRITE in ONE step internally.

Do you need to lock a resource for multiple operations?
                    │
                    ▼
         ┌─────────────────────┐
         │   YES → Use SETNX   │
         │   + EXPIRE + EVAL   │
         └─────────────────────┘
                    │
                    ▼
         Is it just a counter (add/subtract)?
                    │
                    ▼
         ┌─────────────────────┐
         │   YES → Use INCR    │
         │   (No lock needed)  │
         └─────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     WHEN TO USE WHAT                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ONE Redis command?           → Use that command (INCR)     │
│                                                             │
│  Multiple commands?           → Use LOCK (SETNX + EVAL)     │
│                                                             │
│  Need auto-cleanup?           → Use EXPIRE                  │
│                                                             │
│  Complex multi-step operation → Use EVAL (Lua script)       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

## One line:
SETNX creates lock, EXPIRE auto-deletes after timeout as backup, and EVAL safely checks + deletes only if lock still belongs to you
