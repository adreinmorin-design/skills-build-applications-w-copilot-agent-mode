import type { ReactNode } from 'react';

type Props = {
  title: string;
  description: string;
  loading?: boolean;
  error?: string;
  children?: ReactNode;
};

export function CapabilityCard({ title, description, loading = false, error, children }: Props) {
  return (
    <section className="card h-100 shadow-sm border-0">
      <div className="card-body">
        <h2 className="h4 mb-2">{title}</h2>
        <p className="text-muted">{description}</p>
        {loading && <p role="status" className="text-primary">Loading...</p>}
        {error && <p role="alert" className="text-danger fw-semibold">{error}</p>}
        <div className="mt-3">{children}</div>
      </div>
    </section>
  );
}
