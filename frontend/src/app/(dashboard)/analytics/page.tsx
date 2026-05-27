'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { RequestsChart } from '@/components/charts/RequestsChart';
import { StatusCodeChart } from '@/components/charts/StatusCodeChart';
import { MethodChart } from '@/components/charts/MethodChart';
import { projectsApi, logsApi } from '@/lib/api';
import { getMethodColor } from '@/lib/utils';
import { Activity, Clock, CheckCircle, XCircle, TrendingUp } from 'lucide-react';

export default function AnalyticsPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [dateRange, setDateRange] = useState('7d');

  const getDateRange = () => {
    const end = new Date();
    const start = new Date();
    switch (dateRange) {
      case '1d': start.setDate(start.getDate() - 1); break;
      case '7d': start.setDate(start.getDate() - 7); break;
      case '30d': start.setDate(start.getDate() - 30); break;
      case '90d': start.setDate(start.getDate() - 90); break;
      default: start.setDate(start.getDate() - 7);
    }
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  };

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list({ limit: 100 }),
  });

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', selectedProjectId, dateRange],
    queryFn: () => logsApi.analytics(selectedProjectId, getDateRange()),
    enabled: !!selectedProjectId,
  });

  const projects = projectsData?.data || [];

  return (
    <DashboardLayout title="Analytics" subtitle="Deep insights into your API traffic and performance">
      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
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

        <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
          {[
            { label: '24h', value: '1d' },
            { label: '7d', value: '7d' },
            { label: '30d', value: '30d' },
            { label: '90d', value: '90d' },
          ].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setDateRange(value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                dateRange === value
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!selectedProjectId ? (
        <Card className="text-center py-20">
          <TrendingUp className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Select a project</h3>
          <p className="text-gray-500 text-sm">Choose a project to view its analytics</p>
        </Card>
      ) : isLoading ? (
        <div className="space-y-5 animate-pulse">
          <div className="grid grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-gray-100 rounded-xl" />
        </div>
      ) : analytics ? (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
            <StatCard
              title="Total Requests"
              value={analytics.totalRequests.toLocaleString()}
              icon={<Activity size={22} />}
              colorScheme="blue"
            />
            <StatCard
              title="Success Rate"
              value={`${(100 - parseFloat(analytics.errorRate)).toFixed(1)}%`}
              icon={<CheckCircle size={22} />}
              colorScheme="green"
              subtitle={`${analytics.successRequests.toLocaleString()} successful`}
            />
            <StatCard
              title="Error Rate"
              value={`${analytics.errorRate}%`}
              icon={<XCircle size={22} />}
              colorScheme="red"
              subtitle={`${analytics.failedRequests.toLocaleString()} failed`}
            />
            <StatCard
              title="Avg Response"
              value={`${analytics.avgResponseTime}ms`}
              icon={<Clock size={22} />}
              colorScheme="amber"
              subtitle={`Max: ${analytics.maxResponseTime}ms`}
            />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Requests Over Time</CardTitle>
              </CardHeader>
              <RequestsChart data={analytics.timeSeriesData} />
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By Status Code</CardTitle>
              </CardHeader>
              <StatusCodeChart data={analytics.byStatusCode} />
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader>
                <CardTitle>By HTTP Method</CardTitle>
              </CardHeader>
              <MethodChart data={analytics.byMethod} />
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Endpoints</CardTitle>
              </CardHeader>
              <div className="space-y-2">
                {analytics.topEndpoints.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">No data available</p>
                ) : (
                  analytics.topEndpoints.map((ep, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                      <span className="text-xs text-gray-400 w-5 shrink-0 font-medium">#{i + 1}</span>
                      <span className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded border shrink-0 ${getMethodColor(ep.method)}`}>
                        {ep.method}
                      </span>
                      <span className="text-sm text-gray-700 font-mono flex-1 truncate">{ep.path}</span>
                      <span className="text-sm font-semibold text-gray-500 shrink-0">
                        {ep._count.path.toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </DashboardLayout>
  );
}
