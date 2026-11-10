import { type FormEvent, useEffect, useState } from 'react';
import { getJson, postJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type ActivityRecord = {
  _id?: string;
  user?: string;
  team?: string;
  type: string;
  minutes: number;
  points: number;
};

export default function Activities() {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [type, setType] = useState('run');
  const [minutes, setMinutes] = useState('30');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function loadActivities() {
    try {
      const data = await getJson<{ activities: ActivityRecord[] }>('/api/activities');
      setActivities(data.activities ?? []);
    } catch {
      setError('Unable to load activities.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadActivities();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError('');
    setSuccessMessage('');

    const trimmedUserId = userId.trim();
    const trimmedTeamId = teamId.trim();
    const minutesValue = Number(minutes);
    if (!trimmedUserId || !trimmedTeamId || !type || !Number.isFinite(minutesValue) || minutesValue <= 0) {
      setSubmitError('User ID, team ID, type, and minutes are required.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await postJson<{ activity: ActivityRecord }>('/api/activities', {
        userId: trimmedUserId,
        teamId: trimmedTeamId,
        type,
        minutes: minutesValue,
      });
      setActivities((current) => [created.activity, ...current]);
      setUserId('');
      setTeamId('');
      setType('run');
      setMinutes('30');
      setSuccessMessage('Activity added successfully.');
    } catch (caughtError) {
      setSubmitError(caughtError instanceof Error ? caughtError.message : 'Unable to add activity.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CapabilityCard title="Activities" description="Track student activity minutes and points." loading={loading} error={error}>
      <form onSubmit={handleSubmit} className="row g-2 mb-3">
        <div className="col-md-3">
          <label htmlFor="activity-user" className="form-label">User ID</label>
          <input id="activity-user" className="form-control" value={userId} onChange={(event) => setUserId(event.target.value)} disabled={submitting} />
        </div>
        <div className="col-md-3">
          <label htmlFor="activity-team" className="form-label">Team ID</label>
          <input id="activity-team" className="form-control" value={teamId} onChange={(event) => setTeamId(event.target.value)} disabled={submitting} />
        </div>
        <div className="col-md-2">
          <label htmlFor="activity-type" className="form-label">Type</label>
          <select id="activity-type" className="form-select" value={type} onChange={(event) => setType(event.target.value)} disabled={submitting}>
            <option value="run">run</option>
            <option value="cycle">cycle</option>
            <option value="strength">strength</option>
            <option value="walk">walk</option>
          </select>
        </div>
        <div className="col-md-2">
          <label htmlFor="activity-minutes" className="form-label">Minutes</label>
          <input id="activity-minutes" type="number" min="1" step="1" className="form-control" value={minutes} onChange={(event) => setMinutes(event.target.value)} disabled={submitting} />
        </div>
        <div className="col-md-2 d-flex align-items-end">
          <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
            {submitting ? 'Saving...' : 'Add activity'}
          </button>
        </div>
      </form>
      {submitError ? <p className="text-danger">{submitError}</p> : null}
      {successMessage ? <p className="text-success">{successMessage}</p> : null}
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
