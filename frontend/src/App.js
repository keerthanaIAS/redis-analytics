import { useState, useEffect } from "react";

function App() {
  // =========================
  // STATE VARIABLES
  // =========================

  // String Operations
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [searchKey, setSearchKey] = useState("");
  const [redisValue, setRedisValue] = useState("");
  const [keys, setKeys] = useState([]);

  // TTL Operations
  const [ttlKey, setTtlKey] = useState("");
  const [ttlValue, setTtlValue] = useState("");
  const [ttl, setTtl] = useState(60);

  // Counter Operations
  const [counterKey, setCounterKey] = useState("views");
  const [counterValue, setCounterValue] = useState(0);

  // Hash Operations
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userData, setUserData] = useState(null);

  // Queue Operations
  const [orderName, setOrderName] = useState("");
  const [queueResult, setQueueResult] = useState("");

  // Set Operations
  const [tag, setTag] = useState("");
  const [tags, setTags] = useState([]);

  // Leaderboard Operations
  const [leaderUser, setLeaderUser] = useState("");
  const [leaderScore, setLeaderScore] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);

  // Pub/Sub Operations
  const [message, setMessage] = useState("");

  // Rate Limiter
  const [rateResult, setRateResult] = useState("");

  // EXISTS / TTL / GETSET
  const [existsKey, setExistsKey] = useState("");
  const [existsResult, setExistsResult] = useState(null);
  const [expireKey, setExpireKey] = useState("");
  const [expireTTL, setExpireTTL] = useState("");
  const [ttlCheckKey, setTtlCheckKey] = useState("");
  const [ttlValue1, setTtlValue1] = useState(null);
  const [getSetKey, setGetSetKey] = useState("");
  const [getSetValue, setGetSetValue] = useState("");
  const [oldValue, setOldValue] = useState("");

  // INCRBY / DECRBY
  const [counterKey2, setCounterKey2] = useState("");
  const [counterInc, setCounterInc] = useState(1);
  const [counterDec, setCounterDec] = useState(1);
  const [counterResult, setCounterResult] = useState(null);

  // Hash Field Operations
  const [field, setField] = useState("");
  const [fieldValue, setFieldValue] = useState("");
  const [fieldResult, setFieldResult] = useState("");
  const [fieldExists, setFieldExists] = useState(null);

  // Blocking Queue
  const [blockResult, setBlockResult] = useState(null);

  // Set Advanced Operations
  const [checkTag, setCheckTag] = useState("");
  const [tagExists, setTagExists] = useState(null);

  // Sorted Set Operations
  const [rankUser, setRankUser] = useState("");
  const [rank, setRank] = useState(null);

  // Stream Operations
  const [streamMsg, setStreamMsg] = useState("");
  const [streamData, setStreamData] = useState(null);

  // System Monitoring
  const [health, setHealth] = useState(null);
  const [info, setInfo] = useState("");
  const [sentinel, setSentinel] = useState(null);
  const [clients, setClients] = useState("");
  const [slowlog, setSlowlog] = useState([]);

  // Session
  const [sessionToken, setSessionToken] = useState("");
  const [sessionUserId, setSessionUserId] = useState("");
  const [sessionResult, setSessionResult] = useState("");

  const API = "http://localhost:4000";

  // =========================
  // SYSTEM MONITORING
  // =========================

  async function getHealth() {
    const res = await fetch(`${API}/health`);
    const data = await res.json();
    setHealth(data);
  }

  async function getInfo() {
    const res = await fetch(`${API}/info`);
    const data = await res.json();
    setInfo(data.info);
  }

  async function getSentinel() {
    try {
      const res = await fetch(`${API}/sentinel`);
      const data = await res.json();

      if (data.error) {
        setSentinel({
          status: "Not Available",
          message: data.message,
          suggestion: data.suggestion
        });
      } else {
        setSentinel(data);
      }
    } catch (error) {
      setSentinel({
        error: "Failed to fetch Sentinel status",
        details: error.message
      });
    }
  }

  async function getClients() {
    const res = await fetch(`${API}/clients`);
    const data = await res.text();
    setClients(data);
  }

  async function getSlowlog() {
    const res = await fetch(`${API}/slowlog`);
    const data = await res.json();
    setSlowlog(data);
  }

  // =========================
  // STRING OPERATIONS
  // =========================

  async function saveRedis() {
    await fetch(`${API}/set`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value })
    });
    loadKeys();
    setKey("");
    setValue("");
  }

  async function getRedis() {
    const res = await fetch(`${API}/get/${searchKey}`);
    const data = await res.json();
    setRedisValue(data.value);
  }

  async function loadKeys() {
    const res = await fetch(`${API}/keys`);
    const data = await res.json();
    setKeys(data.keys);
  }

  async function deleteKey(k) {
    await fetch(`${API}/delete/${k}`, { method: "DELETE" });
    loadKeys();
  }

  // =========================
  // TTL OPERATIONS
  // =========================

  async function saveWithTTL() {
    await fetch(`${API}/set-expire`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: ttlKey, value: ttlValue, ttl: Number(ttl) })
    });
    alert("TTL Saved");
    setTtlKey("");
    setTtlValue("");
    setTtl(60);
  }

  // =========================
  // EXISTS / TTL / GETSET
  // =========================

  async function checkExists() {
    const res = await fetch(`${API}/exists/${existsKey}`);
    const data = await res.json();
    setExistsResult(data.exists);
  }

  async function setExpire() {
    await fetch(`${API}/expire`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: expireKey, ttl: Number(expireTTL) })
    });
    alert(`Expire set for ${expireKey}`);
  }

  async function checkTTL() {
    const res = await fetch(`${API}/ttl/${ttlCheckKey}`);
    const data = await res.json();
    setTtlValue1(data.ttl);
  }

  async function doGetSet() {
    const res = await fetch(`${API}/getset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: getSetKey, value: getSetValue })
    });
    const data = await res.json();
    setOldValue(data.old);
  }

  // =========================
  // COUNTER OPERATIONS
  // =========================

  async function incrementCounter() {
    const res = await fetch(`${API}/increment/${counterKey}`, { method: "POST" });
    const data = await res.json();
    setCounterValue(data.value);
  }

  async function incrBy() {
    const res = await fetch(`${API}/incrby/${counterKey2}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: Number(counterInc) })
    });
    const data = await res.json();
    setCounterResult(data.result);
  }

  async function decrBy() {
    const res = await fetch(`${API}/decrby/${counterKey2}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: Number(counterDec) })
    });
    const data = await res.json();
    setCounterResult(data.result);
  }

  // =========================
  // HASH OPERATIONS
  // =========================

  async function createUser() {
    await fetch(`${API}/user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, name: userName, email: userEmail })
    });
    alert("User Saved");
    setUserId("");
    setUserName("");
    setUserEmail("");
  }

  async function getUser() {
    const res = await fetch(`${API}/user/${userId}`);
    const data = await res.json();
    setUserData(data);
  }

  async function getField() {
    const res = await fetch(`${API}/user/${userId}/${field}`);
    const data = await res.json();
    setFieldResult(data.value);
  }

  async function updateField() {
    await fetch(`${API}/user/${userId}/field`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, value: fieldValue })
    });
    alert("Field updated");
  }

  async function deleteField() {
    await fetch(`${API}/user/${userId}/${field}`, { method: "DELETE" });
    alert("Field deleted");
  }

  async function checkFieldExists() {
    const res = await fetch(`${API}/user/${userId}/exists/${field}`);
    const data = await res.json();
    setFieldExists(data.exists);
  }

  // =========================
  // QUEUE OPERATIONS
  // =========================

  async function pushQueue() {
    await fetch(`${API}/queue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: orderName })
    });
    setOrderName("");
  }

  async function popQueue() {
    const res = await fetch(`${API}/queue`);
    const data = await res.json();
    setQueueResult(data.order);
  }

  async function blockPop() {
    const res = await fetch(`${API}/queue/block`);
    const data = await res.json();
    setBlockResult(data.result);
  }

  // =========================
  // SET OPERATIONS
  // =========================

  async function addTag() {
    await fetch(`${API}/tag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag })
    });
    setTag("");
    loadTags();
  }

  async function loadTags() {
    const res = await fetch(`${API}/tag`);
    const data = await res.json();
    setTags(data);
  }

  async function checkTagExists() {
    const res = await fetch(`${API}/tag/exists/${checkTag}`);
    const data = await res.json();
    setTagExists(data.exists);
  }

  async function removeTag() {
    await fetch(`${API}/tag/${checkTag}`, { method: "DELETE" });
    loadTags();
    setCheckTag("");
  }

  // =========================
  // LEADERBOARD OPERATIONS
  // =========================

  async function addScore() {
    await fetch(`${API}/leaderboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: leaderUser, score: Number(leaderScore) })
    });
    setLeaderUser("");
    setLeaderScore("");
    loadLeaderboard();
  }

  async function loadLeaderboard() {
    const res = await fetch(`${API}/leaderboard`);
    const data = await res.json();
    setLeaderboard(data);
  }

  async function incrScore() {
    const res = await fetch(`${API}/leaderboard/incr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: rankUser, score: 1 })
    });
    const data = await res.json();
    alert(`New score: ${data.result}`);
    loadLeaderboard();
  }

  async function getRank() {
    const res = await fetch(`${API}/leaderboard/rank/${rankUser}`);
    const data = await res.json();
    setRank(data.rank);
  }

  // =========================
  // PUB/SUB OPERATIONS
  // =========================

  async function publishMessage() {
    await fetch(`${API}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });
    setMessage("");
    alert("Message published");
  }

  // =========================
  // SESSION OPERATIONS
  // =========================

  async function createSession() {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: sessionUserId })
    });
    const data = await res.json();
    setSessionToken(data.token);
    alert(`Session created: ${data.token}`);
  }

  async function checkSession() {
    const res = await fetch(`${API}/session/${sessionToken}`);
    const data = await res.json();
    setSessionResult(data.user);
  }

  // =========================
  // RATE LIMITER
  // =========================

  async function testRateLimit() {
    const res = await fetch(`${API}/limited`);
    const data = await res.json();
    setRateResult(JSON.stringify(data, null, 2));
  }

  // =========================
  // STREAM OPERATIONS
  // =========================

  async function addStream() {
    await fetch(`${API}/stream/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: streamMsg })
    });
    setStreamMsg("");
    alert("Event added to stream");
  }

  async function readStream() {
    const res = await fetch(`${API}/stream/read`);
    const data = await res.json();
    setStreamData(data.data);
  }

  // =========================
  // USE EFFECT
  // =========================

  useEffect(() => {
    loadKeys();
    loadTags();
    loadLeaderboard();
  }, []);

  // =========================
  // RENDER
  // =========================

  return (
    <div style={{ padding: 30, fontFamily: "Arial, sans-serif", maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ color: "#dc2626", borderBottom: "2px solid #dc2626", paddingBottom: 10 }}>
        🚀 Redis Dashboard
      </h1>

      {/* ========================= */}
      {/* SYSTEM MONITORING */}
      {/* ========================= */}
      <section style={{ marginTop: 30, background: "#f3f4f6", padding: 20, borderRadius: 8 }}>
        <h2 style={{ color: "#374151", marginTop: 0 }}>📊 System Monitoring</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={getHealth} style={buttonStyle}>Health Check</button>
          <button onClick={getInfo} style={buttonStyle}>Redis Info</button>
          <button onClick={getClients} style={buttonStyle}>Client List</button>
          <button onClick={getSlowlog} style={buttonStyle}>Slow Log</button>
          <button onClick={getSentinel} style={buttonStyle}>Sentinel Status</button>
        </div>
        {health && <pre style={preStyle}>{JSON.stringify(health, null, 2)}</pre>}
        {info && <pre style={preStyle}>{info.substring(0, 500)}...</pre>}
        {clients && <pre style={preStyle}>{clients}</pre>}
        {slowlog.length > 0 && <pre style={preStyle}>{JSON.stringify(slowlog, null, 2)}</pre>}
        {sentinel && <pre style={preStyle}>{JSON.stringify(sentinel, null, 2)}</pre>}
      </section>

      {/* ========================= */}
      {/* CORE KEY-VALUE OPERATIONS */}
      {/* ========================= */}
      <section style={sectionStyle}>
        <h2>🔑 Core Key-Value Operations</h2>

        {/* Set/Get/Delete */}
        <div style={groupStyle}>
          <h3>Basic CRUD</h3>
          <input placeholder="Key" value={key} onChange={(e) => setKey(e.target.value)} style={inputStyle} />
          <input placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} style={inputStyle} />
          <button onClick={saveRedis} style={buttonStyle}>Save</button>

          <div style={{ marginTop: 10 }}>
            <input placeholder="Search Key" value={searchKey} onChange={(e) => setSearchKey(e.target.value)} style={inputStyle} />
            <button onClick={getRedis} style={buttonStyle}>Get</button>
            <p><strong>Value:</strong> {redisValue}</p>
          </div>

          <div>
            <h4>All Keys:</h4>
            {keys.map((k) => (
              <div key={k} style={{ margin: "5px 0" }}>
                <code>{k}</code>
                <button onClick={() => deleteKey(k)} style={{ marginLeft: 10, ...smallButtonStyle }}>Delete</button>
              </div>
            ))}
          </div>
        </div>

        {/* EXISTS / EXPIRE / TTL / GETSET */}
        <div style={groupStyle}>
          <h3>Key Management</h3>
          <div>
            <input placeholder="Check exists" value={existsKey} onChange={(e) => setExistsKey(e.target.value)} style={inputStyle} />
            <button onClick={checkExists} style={buttonStyle}>EXISTS</button>
            <span style={{ marginLeft: 10 }}>Result: {String(existsResult)}</span>
          </div>

          <div style={{ marginTop: 10 }}>
            <input placeholder="Key for expire" value={expireKey} onChange={(e) => setExpireKey(e.target.value)} style={inputStyle} />
            <input type="number" placeholder="TTL (seconds)" value={expireTTL} onChange={(e) => setExpireTTL(e.target.value)} style={{ ...inputStyle, width: 100 }} />
            <button onClick={setExpire} style={buttonStyle}>EXPIRE</button>
          </div>

          <div style={{ marginTop: 10 }}>
            <input placeholder="Check TTL" value={ttlCheckKey} onChange={(e) => setTtlCheckKey(e.target.value)} style={inputStyle} />
            <button onClick={checkTTL} style={buttonStyle}>TTL</button>
            <span style={{ marginLeft: 10 }}>TTL: {ttlValue1} seconds</span>
          </div>

          <div style={{ marginTop: 10 }}>
            <input placeholder="GETSET key" value={getSetKey} onChange={(e) => setGetSetKey(e.target.value)} style={inputStyle} />
            <input placeholder="New value" value={getSetValue} onChange={(e) => setGetSetValue(e.target.value)} style={inputStyle} />
            <button onClick={doGetSet} style={buttonStyle}>GETSET</button>
            <p>Old value: {oldValue}</p>
          </div>
        </div>
      </section>

      {/* ========================= */}
      {/* TTL SAVE */}
      {/* ========================= */}
      <section style={sectionStyle}>
        <h2>⏱️ Save with TTL</h2>
        <input placeholder="Key" value={ttlKey} onChange={(e) => setTtlKey(e.target.value)} style={inputStyle} />
        <input placeholder="Value" value={ttlValue} onChange={(e) => setTtlValue(e.target.value)} style={inputStyle} />
        <input type="number" placeholder="TTL (seconds)" value={ttl} onChange={(e) => setTtl(e.target.value)} style={{ ...inputStyle, width: 100 }} />
        <button onClick={saveWithTTL} style={buttonStyle}>Save with TTL</button>
      </section>

      {/* ========================= */}
      {/* COUNTERS */}
      {/* ========================= */}
      <section style={sectionStyle}>
        <h2>🔢 Counters</h2>

        <div style={groupStyle}>
          <h3>Simple Counter</h3>
          <button onClick={incrementCounter} style={buttonStyle}>Increment {counterKey}</button>
          <h3>Value: {counterValue}</h3>
        </div>

        <div style={groupStyle}>
          <h3>Advanced Counter (INCRBY/DECRBY)</h3>
          <input placeholder="Counter key" value={counterKey2} onChange={(e) => setCounterKey2(e.target.value)} style={inputStyle} />
          <div>
            <input type="number" placeholder="Increment by" value={counterInc} onChange={(e) => setCounterInc(e.target.value)} style={{ ...inputStyle, width: 100 }} />
            <button onClick={incrBy} style={buttonStyle}>INCRBY</button>
          </div>
          <div>
            <input type="number" placeholder="Decrement by" value={counterDec} onChange={(e) => setCounterDec(e.target.value)} style={{ ...inputStyle, width: 100 }} />
            <button onClick={decrBy} style={buttonStyle}>DECRBY</button>
          </div>
          <p><strong>Result:</strong> {counterResult}</p>
        </div>
      </section>

      {/* ========================= */}
      {/* HASH OPERATIONS */}
      {/* ========================= */}
      <section style={sectionStyle}>
        <h2>🏷️ Hash Operations (User Store)</h2>

        <div style={groupStyle}>
          <h3>Create/Get User</h3>
          <input placeholder="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} style={inputStyle} />
          <input placeholder="Name" value={userName} onChange={(e) => setUserName(e.target.value)} style={inputStyle} />
          <input placeholder="Email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} style={inputStyle} />
          <button onClick={createUser} style={buttonStyle}>Save User</button>
          <button onClick={getUser} style={buttonStyle}>Get User</button>
          <pre style={preStyle}>{JSON.stringify(userData, null, 2)}</pre>
        </div>

        <div style={groupStyle}>
          <h3>Field Operations</h3>
          <input placeholder="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} style={inputStyle} />
          <input placeholder="Field name" value={field} onChange={(e) => setField(e.target.value)} style={inputStyle} />
          <input placeholder="Field value" value={fieldValue} onChange={(e) => setFieldValue(e.target.value)} style={inputStyle} />
          <div>
            <button onClick={getField} style={buttonStyle}>GET Field</button>
            <button onClick={updateField} style={buttonStyle}>SET Field</button>
            <button onClick={deleteField} style={buttonStyle}>DELETE Field</button>
            <button onClick={checkFieldExists} style={buttonStyle}>EXISTS Field</button>
          </div>
          <p>Field Value: {fieldResult}</p>
          <p>Field Exists: {String(fieldExists)}</p>
        </div>
      </section>

      {/* ========================= */}
      {/* QUEUE OPERATIONS */}
      {/* ========================= */}
      <section style={sectionStyle}>
        <h2>📋 Queue Operations</h2>

        <div style={groupStyle}>
          <h3>Simple Queue</h3>
          <input placeholder="Order name" value={orderName} onChange={(e) => setOrderName(e.target.value)} style={inputStyle} />
          <button onClick={pushQueue} style={buttonStyle}>Push to Queue</button>
          <button onClick={popQueue} style={buttonStyle}>Pop from Queue</button>
          <p>Popped: {queueResult}</p>
        </div>

        <div style={groupStyle}>
          <h3>Blocking Queue (BLPOP)</h3>
          <button onClick={blockPop} style={buttonStyle}>Wait for Job (10s timeout)</button>
          <pre style={preStyle}>{JSON.stringify(blockResult, null, 2)}</pre>
        </div>
      </section>

      {/* ========================= */}
      {/* SET OPERATIONS */}
      {/* ========================= */}
      <section style={sectionStyle}>
        <h2>🔖 Set Operations (Tags)</h2>

        <div style={groupStyle}>
          <input placeholder="Tag name" value={tag} onChange={(e) => setTag(e.target.value)} style={inputStyle} />
          <button onClick={addTag} style={buttonStyle}>Add Tag</button>
          <button onClick={loadTags} style={buttonStyle}>Load All Tags</button>
          <pre style={preStyle}>{JSON.stringify(tags, null, 2)}</pre>
        </div>

        <div style={groupStyle}>
          <h3>Check/Remove Tag</h3>
          <input placeholder="Tag to check/remove" value={checkTag} onChange={(e) => setCheckTag(e.target.value)} style={inputStyle} />
          <button onClick={checkTagExists} style={buttonStyle}>Check Exists</button>
          <button onClick={removeTag} style={buttonStyle}>Remove Tag</button>
          <p>Exists: {String(tagExists)}</p>
        </div>
      </section>

      {/* ========================= */}
      {/* LEADERBOARD */}
      {/* ========================= */}
      <section style={sectionStyle}>
        <h2>🏆 Leaderboard (Sorted Sets)</h2>

        <div style={groupStyle}>
          <h3>Add Score</h3>
          <input placeholder="User" value={leaderUser} onChange={(e) => setLeaderUser(e.target.value)} style={inputStyle} />
          <input type="number" placeholder="Score" value={leaderScore} onChange={(e) => setLeaderScore(e.target.value)} style={inputStyle} />
          <button onClick={addScore} style={buttonStyle}>Add Score</button>
          <button onClick={loadLeaderboard} style={buttonStyle}>Refresh</button>
          <pre style={preStyle}>{JSON.stringify(leaderboard, null, 2)}</pre>
        </div>

        <div style={groupStyle}>
          <h3>Rank & Increment</h3>
          <input placeholder="User" value={rankUser} onChange={(e) => setRankUser(e.target.value)} style={inputStyle} />
          <button onClick={getRank} style={buttonStyle}>Get Rank</button>
          <button onClick={incrScore} style={buttonStyle}>Increment Score by 1</button>
          <p><strong>Rank:</strong> {rank}</p>
        </div>
      </section>

      {/* ========================= */}
      {/* PUB/SUB */}
      {/* ========================= */}
      <section style={sectionStyle}>
        <h2>📢 Pub/Sub</h2>
        <input placeholder="Message to publish" value={message} onChange={(e) => setMessage(e.target.value)} style={{ ...inputStyle, width: "60%" }} />
        <button onClick={publishMessage} style={buttonStyle}>Publish to 'chat' channel</button>
        <p style={{ color: "#6b7280", fontSize: 14 }}>Note: Check server console for received messages</p>
      </section>

      {/* ========================= */}
      {/* SESSION STORE */}
      {/* ========================= */}
      <section style={sectionStyle}>
        <h2>🔐 Session Store</h2>
        <div style={groupStyle}>
          <input placeholder="User ID" value={sessionUserId} onChange={(e) => setSessionUserId(e.target.value)} style={inputStyle} />
          <button onClick={createSession} style={buttonStyle}>Create Session</button>
          <p><strong>Token:</strong> {sessionToken}</p>
        </div>
        <div style={groupStyle}>
          <input placeholder="Session Token" value={sessionToken} onChange={(e) => setSessionToken(e.target.value)} style={{ ...inputStyle, width: "60%" }} />
          <button onClick={checkSession} style={buttonStyle}>Validate Session</button>
          <p><strong>User ID:</strong> {sessionResult}</p>
        </div>
      </section>

      {/* ========================= */}
      {/* RATE LIMITER */}
      {/* ========================= */}
      <section style={sectionStyle}>
        <h2>🚦 Rate Limiter</h2>
        <button onClick={testRateLimit} style={buttonStyle}>Test Rate Limited Endpoint</button>
        <pre style={preStyle}>{rateResult}</pre>
      </section>

      {/* ========================= */}
      {/* STREAMS */}
      {/* ========================= */}
      <section style={sectionStyle}>
        <h2>📡 Streams (Kafka-like)</h2>
        <input placeholder="Message" value={streamMsg} onChange={(e) => setStreamMsg(e.target.value)} style={{ ...inputStyle, width: "60%" }} />
        <button onClick={addStream} style={buttonStyle}>Add to Stream</button>
        <button onClick={readStream} style={buttonStyle}>Read Stream</button>
        <pre style={preStyle}>{JSON.stringify(streamData, null, 2)}</pre>
      </section>
    </div>
  );
}

// =========================
// STYLES
// =========================

const buttonStyle = {
  backgroundColor: "#dc2626",
  color: "white",
  border: "none",
  padding: "8px 16px",
  margin: "4px",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "14px"
};

const smallButtonStyle = {
  backgroundColor: "#ef4444",
  color: "white",
  border: "none",
  padding: "4px 8px",
  margin: "2px",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "12px"
};

const inputStyle = {
  padding: "8px",
  margin: "4px",
  border: "1px solid #d1d5db",
  borderRadius: "4px",
  fontSize: "14px"
};

const sectionStyle = {
  marginTop: 30,
  background: "#f9fafb",
  padding: 20,
  borderRadius: 8,
  border: "1px solid #e5e7eb"
};

const groupStyle = {
  marginBottom: 20,
  padding: 15,
  background: "white",
  borderRadius: 6,
  border: "1px solid #e5e7eb"
};

const preStyle = {
  background: "#1f2937",
  color: "#e5e7eb",
  padding: 10,
  borderRadius: 4,
  overflowX: "auto",
  fontSize: 12,
  marginTop: 10
};

export default App;