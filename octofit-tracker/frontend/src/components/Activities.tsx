import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type ActivityRecord = {
  _id?: string;
  type: string;
  minutes: number;
  points: number;
};

export default function Activities() {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadActivities() {
      try {
        const data = await getJson<{ activities: ActivityRecord[] }>('/api/activities');
        if (!cancelled) {
          setActivities(data.activities ?? []);
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load activities.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadActivities();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <CapabilityCard title="Activities" description="Track student activity minutes and points." loading={loading} error={error}>
      {activities.length === 0 && !loading && !error ? <p>No activities</p> : null}
      {activities.length > 0 ? (
        <ul className="list-group list-group-flush">
          {activities.map((activity, index) => (
            <li key={activity._id ?? `${activity.type}-${index}`} className="list-group-item">
              {activity.type} · {activity.minutes} min · {activity.points} pts
            </li>
          ))}
        </ul>
      ) : null}
    </CapabilityCard>
  );
}
