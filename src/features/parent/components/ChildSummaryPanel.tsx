/**
 * ChildSummaryPanel — Display child profile info
 */

import type { ChildProfile } from "../types/parent-dashboard.types";

interface ChildSummaryPanelProps {
  child: ChildProfile;
}

export function ChildSummaryPanel({ child }: ChildSummaryPanelProps) {
  return (
    <div className="rounded-lg border border-border-subtle bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-text-primary">
        Student Profile
      </h2>
      <div className="space-y-3">
        <div>
          <span className="text-sm text-text-muted">Name</span>
          <div className="font-medium text-text-primary">{child.full_name}</div>
        </div>
        <div>
          <span className="text-sm text-text-muted">Year Level</span>
          <div className="font-medium text-text-primary">
            Year {child.year_level}
          </div>
        </div>
        <div>
          <span className="text-sm text-text-muted">Email</span>
          <div className="text-sm text-text-primary">{child.email}</div>
        </div>
      </div>
    </div>
  );
}
