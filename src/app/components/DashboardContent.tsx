'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Task {
  id: string;
  title: string;
  assignee: string | null;
  dueDate: string | null;
  status: string;
  notes: string | null;
}

interface ChecklistItem {
  title: string;
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

interface DashboardContentProps {
  initialData: DashboardData;
}

export default function DashboardContent({ initialData }: DashboardContentProps) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [selectedMonth, setSelectedMonth] = useState<string>(data.month?.label || '');
  const [loading, setLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const router = useRouter();

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

  const toggleItemExpansion = (itemTitle: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemTitle)) {
      newExpanded.delete(itemTitle);
    } else {
      newExpanded.add(itemTitle);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DONE':
        return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'OPEN':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!data.month) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">No Data Available</h1>
        <p className="text-gray-600 mb-8">You don't have any months with data yet.</p>
        <button
          onClick={() => router.push('/upload')}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Upload Your First Checklist
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            {data.month.label} - {new Date(data.month.startDate).toLocaleDateString()} to {new Date(data.month.endDate).toLocaleDateString()}
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0">
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

      {/* Checklist Items Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Checklist Items</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        ) : data.checklistItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No checklist items found for this month.
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
                  <React.Fragment key={item.title}>
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
                          <div className="text-sm font-medium text-gray-900">{item.title}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${item.isComplete ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {item.isComplete ? 'DONE' : 'OPEN'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.tasks.length} task{item.tasks.length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => toggleItemExpansion(item.title)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {expandedItems.has(item.title) ? 'Hide Details' : 'Show Details'}
                        </button>
                      </td>
                    </tr>
                    
                    {expandedItems.has(item.title) && (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 bg-gray-50">
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
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                                          {task.status}
                                        </span>
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
