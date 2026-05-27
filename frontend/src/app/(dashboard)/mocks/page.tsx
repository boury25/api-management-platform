'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { projectsApi, mocksApi } from '@/lib/api';
import { getMethodColor, copyToClipboard } from '@/lib/utils';
import { Plus, Server, Trash2, Edit2, Copy, ToggleLeft, ToggleRight, Check } from 'lucide-react';

export default function MocksPage() {
  const qc = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    method: 'GET',
    path: '/',
    responseBody: '{\n  "message": "Hello, World!"\n}',
    statusCode: '200',
    delay: '0',
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list({ limit: 100 }),
  });

  const { data: mocksData, isLoading } = useQuery({
    queryKey: ['mocks', selectedProjectId],
    queryFn: () => mocksApi.list(selectedProjectId, { limit: 50 }),
    enabled: !!selectedProjectId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      mocksApi.create(selectedProjectId, {
        name: formData.name,
        method: formData.method,
        path: formData.path,
        responseBody: JSON.parse(formData.responseBody),
        statusCode: parseInt(formData.statusCode),
        delay: parseInt(formData.delay) || 0,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mocks'] });
      setIsCreateOpen(false);
      resetForm();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      mocksApi.update(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mocks'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mocksApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mocks'] }),
  });

  const resetForm = () => setFormData({
    name: '', method: 'GET', path: '/', responseBody: '{\n  "message": "Hello, World!"\n}',
    statusCode: '200', delay: '0',
  });

  const getMockUrl = (path: string) =>
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/mocks/serve/${selectedProjectId}${path}`;

  const handleCopyUrl = async (path: string) => {
    await copyToClipboard(getMockUrl(path));
    setCopiedUrl(path);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const projects = projectsData?.data || [];
  const mocks = mocksData?.data || [];

  return (
    <DashboardLayout title="Mock Server" subtitle="Create mock API endpoints for testing and development">
      {/* Controls */}
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

        {selectedProjectId && (
          <Button leftIcon={<Plus size={16} />} onClick={() => setIsCreateOpen(true)}>
            Add Endpoint
          </Button>
        )}
      </div>

      {/* Base URL info */}
      {selectedProjectId && (
        <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm font-medium mb-1">Mock Server Base URL</p>
          <code className="text-blue-700 text-xs font-mono">
            {getMockUrl('')}
          </code>
          <p className="text-blue-600 text-xs mt-1">No authentication required — use X-API-Key header optionally</p>
        </div>
      )}

      {/* Mocks Grid */}
      {!selectedProjectId ? (
        <Card className="text-center py-20">
          <Server className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Select a project</h3>
          <p className="text-gray-500 text-sm">Choose a project to manage its mock endpoints</p>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : mocks.length === 0 ? (
        <Card className="text-center py-16">
          <Server className="mx-auto text-gray-300 mb-4" size={36} />
          <p className="text-gray-500 text-sm mb-4">No mock endpoints yet</p>
          <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setIsCreateOpen(true)}>
            Create First Endpoint
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mocks.map((mock) => (
            <Card key={mock.id} className={!mock.isActive ? 'opacity-60' : ''}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${getMethodColor(mock.method)}`}>
                    {mock.method}
                  </span>
                  <code className="text-sm font-mono text-gray-700">{mock.path}</code>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleMutation.mutate({ id: mock.id, isActive: !mock.isActive })}
                    className="text-gray-400 hover:text-brand-600 transition-colors"
                  >
                    {mock.isActive ? <ToggleRight size={20} className="text-brand-600" /> : <ToggleLeft size={20} />}
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(mock.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <p className="text-sm font-medium text-gray-800 mb-2">{mock.name}</p>

              <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                <Badge variant={mock.statusCode < 300 ? 'success' : mock.statusCode < 400 ? 'info' : 'danger'}>
                  {mock.statusCode}
                </Badge>
                {mock.delay > 0 && <span>⏱ {mock.delay}ms delay</span>}
                <span>👆 {mock.hitCount} hits</span>
              </div>

              {/* URL with copy */}
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <code className="text-xs text-gray-500 flex-1 truncate font-mono">
                  {getMockUrl(mock.path)}
                </code>
                <button
                  onClick={() => handleCopyUrl(mock.path)}
                  className="text-gray-400 hover:text-gray-600 shrink-0 transition-colors"
                >
                  {copiedUrl === mock.path ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => { setIsCreateOpen(false); resetForm(); }}
        title="Create Mock Endpoint"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Endpoint Name"
            placeholder="Get Users"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Method</label>
              <select
                value={formData.method}
                onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              >
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            <Input
              label="Path"
              placeholder="/users"
              value={formData.path}
              onChange={(e) => setFormData({ ...formData, path: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Status Code"
              type="number"
              min="100"
              max="599"
              value={formData.statusCode}
              onChange={(e) => setFormData({ ...formData, statusCode: e.target.value })}
            />
            <Input
              label="Delay (ms)"
              type="number"
              min="0"
              max="30000"
              value={formData.delay}
              onChange={(e) => setFormData({ ...formData, delay: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Response Body (JSON)
            </label>
            <textarea
              rows={6}
              value={formData.responseBody}
              onChange={(e) => setFormData({ ...formData, responseBody: e.target.value })}
              className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none resize-none"
              placeholder='{ "message": "Hello, World!" }'
            />
          </div>

          {createMutation.error && (
            <p className="text-sm text-red-600">
              {(createMutation.error as Error).message}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button loading={createMutation.isPending} onClick={() => createMutation.mutate()}>
              Create Endpoint
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
