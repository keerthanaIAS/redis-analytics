import { useEffect, useState } from "react";

const API = "http://localhost:4000";

export default function App() {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [searchKey, setSearchKey] = useState("");
  const [result, setResult] = useState("");
  const [keys, setKeys] = useState([]);

  const [counterKey, setCounterKey] = useState("hits");
  const [counterValue, setCounterValue] = useState(0);

  const [ttlKey, setTtlKey] = useState("");
  const [ttlValue, setTtlValue] = useState("");
  const [ttl, setTtl] = useState(10);

  const [hashId, setHashId] = useState("");
  const [hashName, setHashName] = useState("");
  const [hashEmail, setHashEmail] = useState("");

  const [queueData, setQueueData] = useState("");

  const [tag, setTag] = useState("");

  const [leaderUser, setLeaderUser] = useState("");
  const [leaderScore, setLeaderScore] = useState("");

  const [pubMsg, setPubMsg] = useState("");

  async function refreshKeys() {
    const res = await fetch(`${API}/keys`);
    const data = await res.json();
    setKeys(data.keys);
  }

  async function save() {
    await fetch(`${API}/set`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value })
    });
    refreshKeys();
  }

  async function getValue() {
    const res = await fetch(`${API}/get/${searchKey}`);
    const data = await res.json();
    setResult(data.value);
  }

  async function increment() {
    const res = await fetch(`${API}/increment/${counterKey}`, {
      method: "POST"
    });
    const data = await res.json();
    setCounterValue(data.value);
  }

  async function setExpire() {
    await fetch(`${API}/set-expire`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: ttlKey,
        value: ttlValue,
        ttl: Number(ttl)
      })
    });
  }

  async function createUser() {
    await fetch(`${API}/user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: hashId,
        name: hashName,
        email: hashEmail
      })
    });
  }

  async function pushQueue() {
    await fetch(`${API}/queue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: queueData })
    });
  }

  async function addTag() {
    await fetch(`${API}/tag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag })
    });
  }

  async function addLeaderboard() {
    await fetch(`${API}/leaderboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user: leaderUser,
        score: Number(leaderScore)
      })
    });
  }

  async function publish() {
    await fetch(`${API}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: pubMsg })
    });
  }

  useEffect(() => {
    refreshKeys();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Redis Full Dashboard</h1>

      <h3>SET / GET</h3>
      <input placeholder="key" onChange={e => setKey(e.target.value)} />
      <input placeholder="value" onChange={e => setValue(e.target.value)} />
      <button onClick={save}>Save</button>

      <br /><br />

      <input placeholder="search key" onChange={e => setSearchKey(e.target.value)} />
      <button onClick={getValue}>Get</button>
      <div>Result: {result}</div>

      <h3>Keys</h3>
      {keys.map(k => <div key={k}>{k}</div>)}

      <hr />

      <h3>Counter</h3>
      <button onClick={increment}>Increment</button>
      <div>{counterValue}</div>

      <hr />

      <h3>TTL</h3>
      <input placeholder="key" onChange={e => setTtlKey(e.target.value)} />
      <input placeholder="value" onChange={e => setTtlValue(e.target.value)} />
      <input placeholder="ttl" onChange={e => setTtl(e.target.value)} />
      <button onClick={setExpire}>Set Expiry</button>

      <hr />

      <h3>Hash User</h3>
      <input placeholder="id" onChange={e => setHashId(e.target.value)} />
      <input placeholder="name" onChange={e => setHashName(e.target.value)} />
      <input placeholder="email" onChange={e => setHashEmail(e.target.value)} />
      <button onClick={createUser}>Create</button>

      <hr />

      <h3>Queue</h3>
      <input onChange={e => setQueueData(e.target.value)} />
      <button onClick={pushQueue}>Push</button>

      <hr />

      <h3>Tags</h3>
      <input onChange={e => setTag(e.target.value)} />
      <button onClick={addTag}>Add</button>

      <hr />

      <h3>Leaderboard</h3>
      <input placeholder="user" onChange={e => setLeaderUser(e.target.value)} />
      <input placeholder="score" onChange={e => setLeaderScore(e.target.value)} />
      <button onClick={addLeaderboard}>Add</button>

      <hr />

      <h3>Pub/Sub (Publish only)</h3>
      <input onChange={e => setPubMsg(e.target.value)} />
      <button onClick={publish}>Send</button>
    </div>
  );
}