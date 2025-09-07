import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function TasksPage() {
  const session = await getSession();
  if (!session?.user?.email) {
    redirect('/register');
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Tasks</h1>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Tasks View</h2>
          <p className="text-gray-600 mb-6">
            This is a placeholder for the Tasks page. Here you'll be able to view and manage all tasks across different checklist items.
          </p>
          <div className="text-sm text-gray-500">
            Coming soon...
          </div>
        </div>
      </div>
    </div>
  );
}
