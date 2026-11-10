import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type LeaderboardRow = {
  teamName: string;
  totalPoints: number;
  rank: number;
};

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadLeaderboard() {
      try {
        const data = await getJson<{ leaderboard: LeaderboardRow[] }>('/api/leaderboard');
        if (!cancelled) {
          setLeaderboard(data.leaderboard ?? []);
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load leaderboard.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadLeaderboard();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <CapabilityCard title="Leaderboard" description="Compare team point totals." loading={loading} error={error}>
      {leaderboard.length === 0 && !loading && !error ? <p>No leaderboard</p> : null}
      {leaderboard.length > 0 ? (
        <ol className="mb-0 ps-3">
          {leaderboard.map((entry) => (
            <li key={`${entry.teamName}-${entry.rank}`}>
              {entry.teamName} — {entry.totalPoints} pts (rank {entry.rank})
            </li>
          ))}
        </ol>
      ) : null}
    </CapabilityCard>
  );
}
