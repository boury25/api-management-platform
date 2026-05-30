'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { RequestsChart } from '@/components/charts/RequestsChart';
import { projectsApi, logsApi } from '@/lib/api';
import { getMethodColor, getStatusColor, formatRelativeTime } from '@/lib/utils';
import { FolderOpen, Key, Activity, Zap, Clock, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list({ limit: 5 }),
  });

  // Use first project for demo analytics
  const firstProjectId = projectsData?.data?.[0]?.id;

  const { data: analytics } = useQuery({
    queryKey: ['analytics', firstProjectId],
    queryFn: () => logsApi.analytics(firstProjectId!),
    enabled: !!firstProjectId,
  });

  const { data: logsData } = useQuery({
    queryKey: ['logs', firstProjectId, 'recent'],
    queryFn: () => logsApi.list(firstProjectId!, { limit: 8 }),
    enabled: !!firstProjectId,
  });

  const projects = projectsData?.data || [];
  const recentLogs = logsData?.data || [];

  return (
    <DashboardLayout
      title="Overview"
      subtitle="Welcome back — here's what's happening with your APIs"
    >
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <StatCard
          title="Total Projects"
          value={projectsData?.meta?.total || 0}
          icon={<FolderOpen size={22} />}
          colorScheme="blue"
          subtitle="API projects configured"
        />
        <StatCard
          title="Total Requests"
          value={analytics?.totalRequests?.toLocaleString() || '0'}
          icon={<Activity size={22} />}
          colorScheme="purple"
          subtitle="Last 30 days"
        />
        <StatCard
          title="Success Rate"
          value={analytics
            ? `${(100 - parseFloat(analytics.errorRate)).toFixed(1)}%`
            : '—'}
          icon={<CheckCircle size={22} />}
          colorScheme="green"
          subtitle={`${analytics?.successRequests || 0} successful`}
        />
        <StatCard
          title="Avg Response"
          value={analytics ? `${analytics.avgResponseTime}ms` : '—'}
          icon={<Clock size={22} />}
          colorScheme="amber"
          subtitle={`Max: ${analytics?.maxResponseTime || 0}ms`}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Request Traffic (24h)</CardTitle>
            <Link href="/analytics" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
              Full analytics →
            </Link>
          </CardHeader>
          <RequestsChart data={analytics?.timeSeriesData || []} />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Error Overview</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">Successful</span>
              </div>
              <span className="text-sm font-bold text-emerald-700">
                {analytics?.successRequests || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2">
                <XCircle size={16} className="text-red-600" />
                <span className="text-sm font-medium text-red-700">Failed</span>
              </div>
              <span className="text-sm font-bold text-red-700">
                {analytics?.failedRequests || 0}
              </span>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Top Endpoints</p>
              {analytics?.topEndpoints?.slice(0, 4).map((ep, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-mono font-semibold border ${getMethodColor(ep.method)}`}>
                      {ep.method}
                    </span>
                    <span className="text-gray-600 truncate font-mono">{ep.path}</span>
                  </div>
                  <span className="text-gray-500 font-medium ml-2">{ep._count.path}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Logs */}
        <Card padding="none">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <CardTitle>Recent Requests</CardTitle>
              <Link href="/logs" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                View all →
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {recentLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No requests yet</div>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${getMethodColor(log.method)}`}>
                    {log.method}
                  </span>
                  <span className="flex-1 text-sm text-gray-700 font-mono truncate">{log.path}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusColor(log.statusCode)}`}>
                    {log.statusCode}
                  </span>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {log.responseTime}ms
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Projects */}
        <Card padding="none">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <CardTitle>Your Projects</CardTitle>
              <Link href="/projects" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                Manage →
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {projects.length === 0 ? (
              <div className="p-8 text-center">
                <FolderOpen className="mx-auto text-gray-300 mb-2" size={32} />
                <p className="text-gray-500 text-sm">No projects yet</p>
                <Link href="/projects" className="text-brand-600 text-sm font-medium mt-1 inline-block">
                  Create your first project →
                </Link>
              </div>
            ) : (
              projects.map((project) => (
                <div key={project.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                    <Zap size={16} className="text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{project.name}</p>
                    <p className="text-xs text-gray-400 font-mono truncate">{project.baseUrl}</p>
                  </div>
                  <Badge
                    variant={
                      project.environment === 'PRODUCTION'
                        ? 'danger'
                        : project.environment === 'STAGING'
                        ? 'warning'
                        : 'success'
                    }
                  >
                    {project.environment.toLowerCase()}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
