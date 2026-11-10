import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type WorkoutSuggestion = {
  title: string;
  focus?: string;
  reason?: string;
};

export default function Workouts() {
  const userEmail = 'mona@example.com';
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadSuggestions() {
      try {
        const data = await getJson<{ suggestions: WorkoutSuggestion[] }>(`/api/workouts/suggestions/${encodeURIComponent(userEmail)}`);
        if (!cancelled) {
          setSuggestions(data.suggestions ?? []);
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load workout suggestions.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSuggestions();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns." loading={loading} error={error}>
      {suggestions.length === 0 && !loading && !error ? <p>No workout suggestions</p> : null}
      {suggestions.length > 0 ? (
        <ul className="list-group list-group-flush">
          {suggestions.map((suggestion, index) => (
            <li key={`${suggestion.title}-${index}`} className="list-group-item">
              <strong>{suggestion.title}</strong>
              {suggestion.focus ? <div>{suggestion.focus}</div> : null}
              {suggestion.reason ? <small>{suggestion.reason}</small> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </CapabilityCard>
  );
}
