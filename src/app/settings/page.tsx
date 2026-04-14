import AppLayout from '@/components/AppLayout';
import SettingsClient from './components/SettingsClient';

export default function SettingsPage() {
  return (
    <AppLayout dotVariant="settings">
      <SettingsClient />
    </AppLayout>
  );
}
