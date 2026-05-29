import { useEffect, useState } from "react";

function App() {

  const [hits, setHits] = useState(0);

  const [analytics, setAnalytics] = useState(null);

  async function loadHits() {

    const res = await fetch("http://localhost:4000/hit");

    const data = await res.json();

    setHits(data.total);
  }

  async function loadAnalytics() {

    const res = await fetch("http://localhost:4000/analytics");

    const data = await res.json();

    setAnalytics(data);
  }

  useEffect(() => {

    loadHits();

    loadAnalytics();

  }, []);

  return (
    <div style={{ padding: 40 }}>

      <h1>Redis Analytics Dashboard</h1>

      <h2>Total Hits: {hits}</h2>

      <pre>
        {JSON.stringify(analytics, null, 2)}
      </pre>

    </div>
  );
}

export default App;