import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Settings, Save } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground text-sm">
          Configure application defaults, notification channels, and workspace settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workspace Profile</CardTitle>
          <CardDescription>General settings for Softvence Project Management</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Organization Name</label>
            <Input defaultValue="Softvence Technologies" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Support Contact Email</label>
            <Input defaultValue="support@softvence.com" />
          </div>
          <Button size="sm">
            <Save className="mr-2 size-4" /> Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
