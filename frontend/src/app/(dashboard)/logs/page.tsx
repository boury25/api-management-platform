'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { projectsApi, logsApi } from '@/lib/api';
import { getMethodColor, getStatusColor, formatDateTime } from '@/lib/utils';
import { FileText, Search, Filter } from 'lucide-react';

export default function LogsPage() {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [filters, setFilters] = useState({
    method: '',
    statusCode: '',
    path: '',
    page: 1,
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list({ limit: 100 }),
  });

  const { data: logsData, isLoading } = useQuery({
    queryKey: ['logs', selectedProjectId, filters],
    queryFn: () =>
      logsApi.list(selectedProjectId, {
        page: filters.page,
        limit: 25,
        method: filters.method || undefined,
        statusCode: filters.statusCode ? parseInt(filters.statusCode) : undefined,
        path: filters.path || undefined,
      }),
    enabled: !!selectedProjectId,
  });

  const projects = projectsData?.data || [];
  const logs = logsData?.data || [];
  const meta = logsData?.meta;

  return (
    <DashboardLayout title="Request Logs" subtitle="Monitor and debug all gateway and API requests">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
        >
          <option value="">Select project...</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {selectedProjectId && (
          <>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                placeholder="Filter by path..."
                value={filters.path}
                onChange={(e) => setFilters({ ...filters, path: e.target.value, page: 1 })}
                className="pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <select
              value={filters.method}
              onChange={(e) => setFilters({ ...filters, method: e.target.value, page: 1 })}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
            >
              <option value="">All methods</option>
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select
              value={filters.statusCode}
              onChange={(e) => setFilters({ ...filters, statusCode: e.target.value, page: 1 })}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
            >
              <option value="">All status codes</option>
              <option value="200">2xx Success</option>
              <option value="400">4xx Client Error</option>
              <option value="500">5xx Server Error</option>
            </select>
          </>
        )}
      </div>

      {/* Table */}
      {!selectedProjectId ? (
        <Card className="text-center py-20">
          <FileText className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Select a project</h3>
          <p className="text-gray-500 text-sm">Choose a project to view its request logs</p>
        </Card>
      ) : isLoading ? (
        <Card>
          <div className="animate-pulse space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded" />
            ))}
          </div>
        </Card>
      ) : logs.length === 0 ? (
        <Card className="text-center py-16">
          <Filter className="mx-auto text-gray-300 mb-3" size={36} />
          <p className="text-gray-500 text-sm">No logs found matching your filters</p>
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Method</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Path</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Time</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">API Key</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">IP</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${getMethodColor(log.method)}`}>
                        {log.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 max-w-xs truncate">
                      {log.path}
                      {log.errorMessage && (
                        <span className="ml-2 text-red-500 text-xs non-mono">⚠ {log.errorMessage}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusColor(log.statusCode)}`}>
                        {log.statusCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                      {log.responseTime}ms
                    </td>
                    <td className="px-4 py-3">
                      {log.apiKey ? (
                        <code className="key-display text-xs">{log.apiKey.keyPrefix}...</code>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{log.ipAddress}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatDateTime(log.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Showing {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total.toLocaleString()}
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={!meta.hasPrevPage}
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>
                <span className="px-3 py-1.5 text-xs text-gray-500">
                  Page {meta.page} of {meta.totalPages}
                </span>
                <button
                  disabled={!meta.hasNextPage}
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>
      )}
    </DashboardLayout>
  );
}
