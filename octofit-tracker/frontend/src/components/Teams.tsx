import { type FormEvent, useEffect, useState } from 'react';
import { getJson, postJson } from '../api/client.js';
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
  const [name, setName] = useState('');
  const [mascot, setMascot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function loadTeams() {
    try {
      const data = await getJson<{ teams: TeamRecord[] }>('/api/teams');
      setTeams(data.teams ?? []);
    } catch {
      setError('Unable to load teams.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTeams();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError('');
    setSuccessMessage('');

    const trimmedName = name.trim();
    const trimmedMascot = mascot.trim();
    if (!trimmedName || !trimmedMascot) {
      setSubmitError('Team name and mascot are required.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await postJson<{ team: TeamRecord }>('/api/teams', {
        name: trimmedName,
        mascot: trimmedMascot,
        members: [],
      });
      setTeams((current) => [created.team, ...current]);
      setName('');
      setMascot('');
      setSuccessMessage('Team created successfully.');
    } catch (caughtError) {
      setSubmitError(caughtError instanceof Error ? caughtError.message : 'Unable to create team.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CapabilityCard title="Teams" description="Manage teams and members." loading={loading} error={error}>
      <form onSubmit={handleSubmit} className="row g-2 mb-3">
        <div className="col-md-5">
          <label htmlFor="team-name" className="form-label">Team name</label>
          <input id="team-name" className="form-control" value={name} onChange={(event) => setName(event.target.value)} disabled={submitting} />
        </div>
        <div className="col-md-5">
          <label htmlFor="team-mascot" className="form-label">Mascot</label>
          <input id="team-mascot" className="form-control" value={mascot} onChange={(event) => setMascot(event.target.value)} disabled={submitting} />
        </div>
        <div className="col-md-2 d-flex align-items-end">
          <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
            {submitting ? 'Saving...' : 'Add team'}
          </button>
        </div>
      </form>
      {submitError ? <p className="text-danger">{submitError}</p> : null}
      {successMessage ? <p className="text-success">{successMessage}</p> : null}
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
