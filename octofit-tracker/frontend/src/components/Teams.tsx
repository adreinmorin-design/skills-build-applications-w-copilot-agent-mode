import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type TeamRecord = {
  _id?: string;
  name: string;
  mascot?: string;
  members?: string[];
};

export default function Teams() {
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadTeams() {
      try {
        const data = await getJson<{ teams: TeamRecord[] }>('/api/teams');
        if (!cancelled) {
          setTeams(data.teams ?? []);
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load teams.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTeams();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <CapabilityCard title="Teams" description="Manage teams and members." loading={loading} error={error}>
      {teams.length === 0 && !loading && !error ? <p>No teams</p> : null}
      {teams.length > 0 ? (
        <ul className="list-group list-group-flush">
          {teams.map((team, index) => (
            <li key={team._id ?? `${team.name}-${index}`} className="list-group-item">
              <strong>{team.name}</strong> ({team.mascot ?? 'Mascot'})
              <div>{(team.members ?? []).join(', ') || 'No members'}</div>
            </li>
          ))}
        </ul>
      ) : null}
    </CapabilityCard>
  );
}
