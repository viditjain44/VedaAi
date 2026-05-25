import AppShell from '@/components/layout/AppShell';
import AssignmentDetail from '@/components/assignment/AssignmentDetail';

export default function AssignmentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <AppShell>
      <AssignmentDetail id={params.id} />
    </AppShell>
  );
}
