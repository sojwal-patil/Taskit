import { Suspense } from 'react';
import { GoalWorkspaceView } from '@/components/GoalWorkspaceView';

interface PageProps {
  params: Promise<{ id: string }>;
}


async function GoalWorkspaceContent({ params }: PageProps) {
  const { id } = await params;
  return <GoalWorkspaceView goalId={id} />;
}

export default function GoalWorkspacePage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center text-sm">
          Loading workspace...
        </div>
      }
    >
      <GoalWorkspaceContent params={params} />
    </Suspense>
  );
}
