import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DocumentsPage() {
  const session = await getSession();
  if (!session?.user?.email) {
    redirect('/register');
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Documents</h1>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Documents</h2>
          <p className="text-gray-600 mb-6">
            This is a placeholder for the Documents page. Here you'll be able to manage and organize your documents related to checklist items.
          </p>
          <div className="text-sm text-gray-500">
            Coming soon...
          </div>
        </div>
      </div>
    </div>
  );
}
