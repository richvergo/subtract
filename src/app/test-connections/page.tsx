import ConnectionTester from '@/app/components/ConnectionTester'

export default function TestConnectionsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <ConnectionTester />
      </div>
    </div>
  )
}

