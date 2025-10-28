import { useEffect, useState } from "react";
import { fetchLeaderboard } from "@/lib/contract";

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    const load = async () => {
      const data = await fetchLeaderboard();
      setLeaders(data);
    };
    load();
  }, []);

  return (
    <div className="bg-gray-900 text-white p-6 rounded-2xl">
      <h2 className="text-xl font-bold mb-4">Leaderboard</h2>
      {leaders.length === 0 ? (
        <p>No winners yet.</p>
      ) : (
        <ul className="space-y-2">
          {leaders.map((entry, i) => (
            <li key={i} className="flex justify-between">
              <span>{entry.player.value}</span>
              <span>{entry.wins.value} wins</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
