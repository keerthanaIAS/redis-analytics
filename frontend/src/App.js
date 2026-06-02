import { useState, useEffect } from "react";

function App() {

  // String
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [searchKey, setSearchKey] = useState("");
  const [redisValue, setRedisValue] = useState("");
  const [keys, setKeys] = useState([]);

  // TTL
  const [ttlKey, setTtlKey] = useState("");
  const [ttlValue, setTtlValue] = useState("");
  const [ttl, setTtl] = useState(60);

  // Counter
  const [counterKey, setCounterKey] = useState("views");
  const [counterValue, setCounterValue] = useState(0);

  // Hash
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userData, setUserData] = useState(null);

  // Queue
  const [orderName, setOrderName] = useState("");
  const [queueResult, setQueueResult] = useState("");

  // Set
  const [tag, setTag] = useState("");
  const [tags, setTags] = useState([]);

  // Leaderboard
  const [leaderUser, setLeaderUser] = useState("");
  const [leaderScore, setLeaderScore] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);

  // Pub/Sub
  const [message, setMessage] = useState("");

  // Rate limiter
  const [rateResult, setRateResult] = useState("");

  const [health, setHealth] = useState(null);
  const [info, setInfo] = useState("");
  const [sentinel, setSentinel] = useState(null);
  const API = "http://localhost:4000"

  // Health
  async function getHealth() {
    const res = await fetch(`${API}/health`);
    const data = await res.json();
    setHealth(data);
  }

  // Info
  async function getInfo() {
    const res = await fetch(`${API}/info`);
    const data = await res.json();
    setInfo(data.info);
  }

  // Sentinel
  async function getSentinel() {
    const res = await fetch(`${API}/sentinel`);
    const data = await res.json();
    setSentinel(data);
  }

  // =========================
  // STRING
  // =========================

  async function saveRedis() {
    await fetch("http://localhost:4000/set", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ key, value })
    });

    loadKeys();
  }

  async function getRedis() {
    const res = await fetch(
      `http://localhost:4000/get/${searchKey}`
    );

    const data = await res.json();

    setRedisValue(data.value);
  }

  async function loadKeys() {
    const res = await fetch(
      "http://localhost:4000/keys"
    );

    const data = await res.json();

    setKeys(data.keys);
  }

  async function deleteKey(k) {
    await fetch(
      `http://localhost:4000/delete/${k}`,
      {
        method: "DELETE"
      }
    );

    loadKeys();
  }

  // =========================
  // TTL
  // =========================

  async function saveWithTTL() {
    await fetch(
      "http://localhost:4000/set-expire",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          key: ttlKey,
          value: ttlValue,
          ttl
        })
      }
    );

    alert("TTL Saved");
  }

  // =========================
  // COUNTER
  // =========================

  async function incrementCounter() {
    const res = await fetch(
      `http://localhost:4000/increment/${counterKey}`,
      {
        method: "POST"
      }
    );

    const data = await res.json();

    setCounterValue(data.value);
  }

  // =========================
  // HASH
  // =========================

  async function createUser() {
    await fetch(
      "http://localhost:4000/user",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          id: userId,
          name: userName,
          email: userEmail
        })
      }
    );

    alert("User Saved");
  }

  async function getUser() {
    const res = await fetch(
      `http://localhost:4000/user/${userId}`
    );

    const data = await res.json();

    setUserData(data);
  }

  // =========================
  // QUEUE
  // =========================

  async function pushQueue() {
    await fetch(
      "http://localhost:4000/queue",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          order: orderName
        })
      }
    );
  }

  async function popQueue() {
    const res = await fetch(
      "http://localhost:4000/queue"
    );

    const data = await res.json();

    setQueueResult(data.order);
  }

  // =========================
  // SET
  // =========================

  async function addTag() {
    await fetch(
      "http://localhost:4000/tag",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          tag
        })
      }
    );
  }

  async function loadTags() {
    const res = await fetch(
      "http://localhost:4000/tag"
    );

    const data = await res.json();

    setTags(data);
  }

  // =========================
  // LEADERBOARD
  // =========================

  async function addScore() {
    await fetch(
      "http://localhost:4000/leaderboard",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          user: leaderUser,
          score: Number(leaderScore)
        })
      }
    );
  }

  async function loadLeaderboard() {
    const res = await fetch(
      "http://localhost:4000/leaderboard"
    );

    const data = await res.json();

    setLeaderboard(data);
  }

  // =========================
  // PUB SUB
  // =========================

  async function publishMessage() {
    await fetch(
      "http://localhost:4000/publish",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          message
        })
      }
    );
  }

  // =========================
  // RATE LIMIT
  // =========================

  async function testRateLimit() {
    const res = await fetch(
      "http://localhost:4000/limited"
    );

    const data = await res.json();

    setRateResult(
      JSON.stringify(data)
    );
  }

  useEffect(() => {
    loadKeys();
    loadTags();
    loadLeaderboard();
  }, []);

  return (
    <div style={{ padding: 30 }}>

      <h1>Redis Dashboard</h1>

      <hr />

      <h2>Strings</h2>

      <input
        placeholder="key"
        onChange={(e) =>
          setKey(e.target.value)
        }
      />

      <input
        placeholder="value"
        onChange={(e) =>
          setValue(e.target.value)
        }
      />

      <button onClick={saveRedis}>
        Save
      </button>

      <br /><br />

      <input
        placeholder="search key"
        onChange={(e) =>
          setSearchKey(
            e.target.value
          )
        }
      />

      <button onClick={getRedis}>
        Get
      </button>

      <p>{redisValue}</p>

      {keys.map((k) => (
        <div key={k}>
          {k}

          <button
            onClick={() =>
              deleteKey(k)
            }
          >
            Delete
          </button>
        </div>
      ))}

      <hr />

      <h2>TTL</h2>

      <input
        placeholder="key"
        onChange={(e) =>
          setTtlKey(
            e.target.value
          )
        }
      />

      <input
        placeholder="value"
        onChange={(e) =>
          setTtlValue(
            e.target.value
          )
        }
      />

      <input
        type="number"
        placeholder="ttl"
        onChange={(e) =>
          setTtl(
            e.target.value
          )
        }
      />

      <button onClick={saveWithTTL}>
        Save TTL
      </button>

      <hr />

      <h2>Counter</h2>

      <button
        onClick={incrementCounter}
      >
        Increment
      </button>

      <h3>{counterValue}</h3>

      <hr />

      <h2>Hash</h2>

      <input
        placeholder="id"
        onChange={(e) =>
          setUserId(
            e.target.value
          )
        }
      />

      <input
        placeholder="name"
        onChange={(e) =>
          setUserName(
            e.target.value
          )
        }
      />

      <input
        placeholder="email"
        onChange={(e) =>
          setUserEmail(
            e.target.value
          )
        }
      />

      <button onClick={createUser}>
        Save User
      </button>

      <button onClick={getUser}>
        Get User
      </button>

      <pre>
        {JSON.stringify(
          userData,
          null,
          2
        )}
      </pre>

      <hr />

      <h2>Queue</h2>

      <input
        placeholder="order"
        onChange={(e) =>
          setOrderName(
            e.target.value
          )
        }
      />

      <button onClick={pushQueue}>
        Push
      </button>

      <button onClick={popQueue}>
        Pop
      </button>

      <p>{queueResult}</p>

      <hr />

      <h2>Set</h2>

      <input
        placeholder="tag"
        onChange={(e) =>
          setTag(
            e.target.value
          )
        }
      />

      <button onClick={addTag}>
        Add Tag
      </button>
      <button onClick={loadTags}>
        Get User
      </button>

      <pre>
        {JSON.stringify(
          tags,
          null,
          2
        )}
      </pre>

      <hr />

      <h2>Leaderboard</h2>

      <input
        placeholder="user"
        onChange={(e) =>
          setLeaderUser(
            e.target.value
          )
        }
      />

      <input
        placeholder="score"
        onChange={(e) =>
          setLeaderScore(
            e.target.value
          )
        }
      />

      <button onClick={addScore}>
        Add Score
      </button>

      <button
        onClick={loadLeaderboard}
      >
        Refresh
      </button>

      <pre>
        {JSON.stringify(
          leaderboard,
          null,
          2
        )}
      </pre>

      <hr />

      <h2>Pub/Sub</h2>

      <input
        placeholder="message"
        onChange={(e) =>
          setMessage(
            e.target.value
          )
        }
      />

      <button
        onClick={publishMessage}
      >
        Publish
      </button>

      <hr />

      <h2>Rate Limiter</h2>

      <button
        onClick={testRateLimit}
      >
        Hit API
      </button>

      <pre>{rateResult}</pre>

      <hr />

      <h3>System Health</h3>
      <button onClick={getHealth}>Check Health</button>
      <pre>{JSON.stringify(health, null, 2)}</pre>

      <h3>Redis Info</h3>
      <button onClick={getInfo}>Get Info</button>
      <pre>{info}</pre>

      <h3>Sentinel Status</h3>
      <button onClick={getSentinel}>Get Sentinel Data</button>
      <pre>{JSON.stringify(sentinel, null, 2)}</pre>

    </div>
  );
}

export default App;