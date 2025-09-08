'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StatusBadge from './StatusBadge';
import StatusSelect from './StatusSelect';

interface Task {
  id: string;
  title: string;
  assignee: string | null;
  dueDate: string | null;
  status: string;
  notes: string | null;
}

interface ChecklistItem {
  id: string;
  title: string;
  assignee: string | null;
  dueDate: string | null;
  status: string;
  tasks: Task[];
  isComplete: boolean;
}

interface Month {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
}

interface Summary {
  totalTasks: number;
  completedTasks: number;
  remainingTasks: number;
  overdueTasks: number;
  completionPercentage: number;
}

interface DashboardData {
  month: Month | null;
  checklistItems: ChecklistItem[];
  summary: Summary;
  availableMonths: string[];
}

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface DashboardContentProps {
  initialData: DashboardData;
}

export default function EnhancedDashboardContent({ initialData }: DashboardContentProps) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [selectedMonth, setSelectedMonth] = useState<string>(data.month?.label || '');
  const [loading, setLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editingItemData, setEditingItemData] = useState<{
    title: string;
    assignee: string;
    dueDate: string;
    status: string;
  }>({ title: '', assignee: '', dueDate: '', status: 'NOT_STARTED' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemAssignee, setNewItemAssignee] = useState('');
  const [newItemDueDate, setNewItemDueDate] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const router = useRouter();

  // Fetch team members when component loads
  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    setLoadingTeamMembers(true);
    try {
      const response = await fetch('/api/team-members');
      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }
      const teamData = await response.json();
      setTeamMembers(teamData.teamMembers);
    } catch (error) {
      console.error('Error fetching team members:', error);
      alert('Failed to load team members. Please try again.');
    } finally {
      setLoadingTeamMembers(false);
    }
  };

  const fetchMonthData = async (monthLabel: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard?month=${encodeURIComponent(monthLabel)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch month data');
      }
      const monthData = await response.json();
      setData(monthData);
      setSelectedMonth(monthLabel);
    } catch (error) {
      console.error('Error fetching month data:', error);
      alert('Failed to load month data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (monthLabel: string) => {
    if (monthLabel !== selectedMonth) {
      fetchMonthData(monthLabel);
    }
  };

  const toggleItemExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString();
  };

  const isOverdue = (dueDate: string | null, status: string) => {
    if (!dueDate || status === 'DONE') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dueDate) < today;
  };

  const getTeamMemberName = (assigneeId: string | null) => {
    if (!assigneeId) return 'Unassigned';
    const member = teamMembers.find(m => m.id === assigneeId);
    return member ? member.name : 'Unknown';
  };


  const createChecklistItem = async () => {
    if (!newItemTitle.trim() || !data.month) return;

    try {
      const response = await fetch('/api/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newItemTitle,
          assignee: newItemAssignee || null,
          dueDate: newItemDueDate || null,
          monthId: data.month.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create checklist item');
      }

      // Reset form
      setNewItemTitle('');
      setNewItemAssignee('');
      setNewItemDueDate('');
      setShowAddForm(false);

      // Refresh data
      await fetchMonthData(selectedMonth);
    } catch (error) {
      console.error('Error creating checklist item:', error);
      alert('Failed to create checklist item. Please try again.');
    }
  };

  const startEditingItem = (item: ChecklistItem) => {
    setEditingItem(item.id);
    setEditingItemData({
      title: item.title,
      assignee: item.assignee || '',
      dueDate: item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : '',
      status: item.status
    });
  };

  const cancelEditingItem = () => {
    setEditingItem(null);
    setEditingItemData({ title: '', assignee: '', dueDate: '', status: 'NOT_STARTED' });
  };

  const saveEditingItem = async () => {
    if (!editingItem) return;

    try {
      const response = await fetch(`/api/checklist/${editingItem}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingItemData.title,
          assignee: editingItemData.assignee || null,
          dueDate: editingItemData.dueDate || null,
          status: editingItemData.status
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update checklist item');
      }

      // Refresh data
      await fetchMonthData(selectedMonth);
      setEditingItem(null);
      setEditingItemData({ title: '', assignee: '', dueDate: '', status: 'NOT_STARTED' });
    } catch (error) {
      console.error('Error updating checklist item:', error);
      alert('Failed to update checklist item. Please try again.');
    }
  };

  const quickStatusChange = async (itemId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/checklist/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }

      // Refresh data
      await fetchMonthData(selectedMonth);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const updateChecklistItem = async (itemId: string, updates: any) => {
    try {
      const response = await fetch(`/api/checklist/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update checklist item');
      }

      // Refresh data
      await fetchMonthData(selectedMonth);
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating checklist item:', error);
      alert('Failed to update checklist item. Please try again.');
    }
  };

  const deleteChecklistItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this checklist item?')) return;

    try {
      const response = await fetch(`/api/checklist/${itemId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete checklist item');
      }

      // Refresh data
      await fetchMonthData(selectedMonth);
    } catch (error) {
      console.error('Error deleting checklist item:', error);
      alert('Failed to delete checklist item. Please try again.');
    }
  };

  const updateTask = async (taskId: string, updates: any) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      // Refresh data
      await fetchMonthData(selectedMonth);
      setEditingTask(null);
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task. Please try again.');
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      // Refresh data
      await fetchMonthData(selectedMonth);
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task. Please try again.');
    }
  };

  if (!data.month) {
    return (
      <div className="p-8 text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Your Checklist!</h1>
        <p className="text-gray-600 mb-8">Start by adding your first checklist item to get organized.</p>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Your First Checklist Item
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header with Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Checklist Dashboard</h1>
          <p className="text-gray-600 mt-1">
            {data.month.label} - {new Date(data.month.startDate).toLocaleDateString()} to {new Date(data.month.endDate).toLocaleDateString()}
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-4 items-end">
          <div>
            <label htmlFor="month-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select Month
            </label>
            <select
              id="month-select"
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              disabled={loading}
              className="block w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {data.availableMonths.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>
          
        </div>
      </div>

      {/* Progress Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold">{data.summary.completionPercentage}%</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Complete</p>
              <p className="text-2xl font-semibold text-gray-900">{data.summary.completionPercentage}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600 font-semibold">{data.summary.remainingTasks}</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Remaining</p>
              <p className="text-2xl font-semibold text-gray-900">{data.summary.remainingTasks}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-semibold">{data.summary.overdueTasks}</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Overdue</p>
              <p className="text-2xl font-semibold text-gray-900">{data.summary.overdueTasks}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-semibold">{data.summary.completedTasks}</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">{data.summary.completedTasks}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Checklist Item Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Checklist Item</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter checklist item title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
              <select
                value={newItemAssignee}
                onChange={(e) => setNewItemAssignee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={loadingTeamMembers}
              >
                <option value="">Select team member...</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={newItemDueDate}
                onChange={(e) => setNewItemDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={createChecklistItem}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                Add Item
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checklist Items Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Checklist Items</h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            + Add Checklist Item
          </button>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        ) : data.checklistItems.length === 0 ? (
          <div className="p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No checklist items yet</h3>
            <p className="text-gray-500 mb-6">Start by adding your first checklist item to get organized.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Your First Checklist Item
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assignee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tasks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.checklistItems.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-4 w-4 mr-3">
                            {item.isComplete ? (
                              <div className="h-4 w-4 bg-green-500 rounded-full flex items-center justify-center">
                                <svg className="h-2 w-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            ) : (
                              <div className="h-4 w-4 border-2 border-gray-300 rounded-full"></div>
                            )}
                          </div>
                          {editingItem === item.id ? (
                            <input
                              type="text"
                              value={editingItemData.title}
                              onChange={(e) => setEditingItemData(prev => ({ ...prev, title: e.target.value }))}
                              className="text-sm font-medium text-gray-900 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          ) : (
                            <div className="text-sm font-medium text-gray-900">{item.title}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {editingItem === item.id ? (
                          <select
                            value={editingItemData.assignee}
                            onChange={(e) => setEditingItemData(prev => ({ ...prev, assignee: e.target.value }))}
                            className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Unassigned</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name} ({member.role})
                              </option>
                            ))}
                          </select>
                        ) : (
                          getTeamMemberName(item.assignee)
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {editingItem === item.id ? (
                          <input
                            type="date"
                            value={editingItemData.dueDate}
                            onChange={(e) => setEditingItemData(prev => ({ ...prev, dueDate: e.target.value }))}
                            className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <span className={isOverdue(item.dueDate, item.status) ? 'text-red-600 font-medium' : ''}>
                            {formatDate(item.dueDate)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingItem === item.id ? (
                          <select
                            value={editingItemData.status}
                            onChange={(e) => setEditingItemData(prev => ({ ...prev, status: e.target.value }))}
                            className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="NOT_STARTED">Not Started</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="DONE">Done</option>
                          </select>
                        ) : (
                          <StatusBadge status={item.status} />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.tasks.length} task{item.tasks.length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          {editingItem === item.id ? (
                            <>
                              <button
                                onClick={saveEditingItem}
                                className="text-green-600 hover:text-green-900"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEditingItem}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => toggleItemExpansion(item.id)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                {expandedItems.has(item.id) ? 'Hide' : 'Show'}
                              </button>
                              <select
                                value={item.status}
                                onChange={(e) => quickStatusChange(item.id, e.target.value)}
                                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="NOT_STARTED">Not Started</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="DONE">Done</option>
                              </select>
                              <button
                                onClick={() => startEditingItem(item)}
                                className="text-yellow-600 hover:text-yellow-900"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteChecklistItem(item.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    
                    {expandedItems.has(item.id) && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-4">
                            <h4 className="text-sm font-medium text-gray-900">Tasks for "{item.title}"</h4>
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Task Title
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Assignee
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Due Date
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Status
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {item.tasks.map((task) => (
                                    <tr key={task.id} className={isOverdue(task.dueDate, task.status) ? 'bg-red-50' : ''}>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                        {task.title}
                                      </td>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                        {task.assignee || 'Unassigned'}
                                      </td>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                        <span className={isOverdue(task.dueDate, task.status) ? 'text-red-600 font-medium' : ''}>
                                          {formatDate(task.dueDate)}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2 whitespace-nowrap">
                                        <StatusBadge status={task.status} />
                                      </td>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                                        <button
                                          onClick={() => deleteTask(task.id)}
                                          className="text-red-600 hover:text-red-900"
                                        >
                                          Delete
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
