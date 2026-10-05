import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@whitraworks/ui';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Workspace Settings
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Configure business profile, timezone, operational currency, and address (Task 5.3).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Profile</CardTitle>
          <CardDescription>
            General workspace configuration and metadata editing will be populated in Task 5.3.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Workspace settings form configured in Task 5.3.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
