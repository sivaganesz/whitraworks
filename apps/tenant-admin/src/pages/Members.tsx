import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@whitraworks/ui';

export function MembersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Members & Invitations
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Manage workspace team members, role assignments, and pending invitations (Task 5.4).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Directory</CardTitle>
          <CardDescription>
            Active members and role allocations will be populated in Task 5.4.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Member management and invitation dispatching configured in Task 5.4.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
