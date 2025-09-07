'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ChevronDown, Building2 } from 'lucide-react';

interface Entity {
  id: string;
  name: string;
  role: string;
}

export default function EntitySwitcher() {
  const { data: session, update } = useSession();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [activeEntity, setActiveEntity] = useState<Entity | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize entities from session
  useEffect(() => {
    if (session?.user?.memberships) {
      const userEntities = session.user.memberships.map(m => ({
        id: m.entity.id,
        name: m.entity.name,
        role: m.role,
      }));
      setEntities(userEntities);

      // Set active entity from session
      if (session.user.activeEntityId) {
        const active = userEntities.find(e => e.id === session.user.activeEntityId);
        if (active) {
          setActiveEntity(active);
        }
      } else if (userEntities.length > 0) {
        setActiveEntity(userEntities[0]);
      }
    }
  }, [session]);

  const handleEntitySwitch = async (entity: Entity) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/switch-entity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entityId: entity.id }),
      });

      if (response.ok) {
        setActiveEntity(entity);
        // Update the session to reflect the new active entity
        await update({
          ...session,
          user: {
            ...session?.user,
            activeEntityId: entity.id,
          },
        });
        setIsOpen(false);
      } else {
        console.error('Failed to switch entity');
      }
    } catch (error) {
      console.error('Error switching entity:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!session || entities.length === 0) {
    return null;
  }

  if (entities.length === 1) {
    return (
      <div className="px-3 py-2">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Building2 className="w-4 h-4" />
          <span className="truncate">{entities[0].name}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-2">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading}
          className="w-full flex items-center justify-between space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <div className="flex items-center space-x-2 min-w-0">
            <Building2 className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">
              {activeEntity?.name || 'Select Entity'}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <div className="py-1">
              {entities.map((entity) => (
                <button
                  key={entity.id}
                  onClick={() => handleEntitySwitch(entity)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                    activeEntity?.id === entity.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <Building2 className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{entity.name}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    entity.role === 'ADMIN' 
                      ? 'bg-red-100 text-red-700' 
                      : entity.role === 'MANAGER'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {entity.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
