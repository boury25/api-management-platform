'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { apiKeysApi, projectsApi } from '@/lib/api';
import { formatDate, formatRelativeTime, copyToClipboard } from '@/lib/utils';
import { Plus, Key, Copy, Check, RotateCcw, Ban, Trash2, AlertTriangle } from 'lucide-react';
import type { ApiKey } from '@/types';

export default function ApiKeysPage() {
  const qc = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyData, setNewKeyData] = useState<(ApiKey & { key: string }) | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [formData, setFormData] = useState({ name: '', expiresAt: '' });
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list({ limit: 100 }),
  });

  const { data: keysData, isLoading } = useQuery({
    queryKey: ['api-keys', selectedProjectId],
    queryFn: () => apiKeysApi.list(selectedProjectId, { limit: 50 }),
    enabled: !!selectedProjectId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { projectId: string; name: string; expiresAt?: string }) =>
      apiKeysApi.create(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      setIsCreateOpen(false);
      setNewKeyData(data);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiKeysApi.revoke(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      setRevokeId(null);
    },
  });

  const rotateMutation = useMutation({
    mutationFn: (id: string) => apiKeysApi.rotate(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      setNewKeyData(data);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiKeysApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      setDeleteId(null);
    },
  });

  const handleCopy = async () => {
    if (newKeyData?.key) {
      await copyToClipboard(newKeyData.key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const projects = projectsData?.data || [];
  const keys = keysData?.data || [];

  return (
    <DashboardLayout title="API Keys" subtitle="Manage API keys for your projects">
      {/* Project Selector */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 max-w-sm">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
          >
            <option value="">Select a project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.environment.toLowerCase()})
              </option>
            ))}
          </select>
        </div>
        {selectedProjectId && (
          <Button
            leftIcon={<Plus size={16} />}
            onClick={() => setIsCreateOpen(true)}
          >
            Generate Key
          </Button>
        )}
      </div>

      {/* Keys Table */}
      {!selectedProjectId ? (
        <Card className="text-center py-16">
          <Key className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Select a project</h3>
          <p className="text-gray-500 text-sm">Choose a project above to view and manage its API keys</p>
        </Card>
      ) : isLoading ? (
        <Card>
          <div className="animate-pulse space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded" />
            ))}
          </div>
        </Card>
      ) : keys.length === 0 ? (
        <Card className="text-center py-16">
          <Key className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No API keys</h3>
          <p className="text-gray-500 text-sm mb-5">Generate your first API key for this project</p>
          <Button leftIcon={<Plus size={16} />} onClick={() => setIsCreateOpen(true)}>
            Generate Key
          </Button>
        </Card>
      ) : (
        <Card padding="none">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Name</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Key Prefix</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Last Used</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Expires</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Created</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {keys.map((key) => (
                <tr key={key.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{key.name}</td>
                  <td className="px-6 py-4">
                    <code className="key-display">{key.keyPrefix}...</code>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={key.isRevoked ? 'danger' : 'success'} dot>
                      {key.isRevoked ? 'revoked' : 'active'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {key.lastUsedAt ? formatRelativeTime(key.lastUsedAt) : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {key.expiresAt ? formatDate(key.expiresAt) : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(key.createdAt)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      {!key.isRevoked && (
                        <>
                          <button
                            onClick={() => rotateMutation.mutate(key.id)}
                            title="Rotate key"
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <RotateCcw size={14} />
                          </button>
                          <button
                            onClick={() => setRevokeId(key.id)}
                            title="Revoke key"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Ban size={14} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setDeleteId(key.id)}
                        title="Delete"
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Generate API Key"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Key Name"
            placeholder="Production API Key"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Expiration Date (optional)"
            type="date"
            min={new Date().toISOString().split('T')[0]}
            value={formData.expiresAt}
            onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button
              loading={createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  projectId: selectedProjectId,
                  name: formData.name,
                  ...(formData.expiresAt && { expiresAt: new Date(formData.expiresAt).toISOString() }),
                })
              }
            >
              Generate
            </Button>
          </div>
        </div>
      </Modal>

      {/* New Key Display Modal */}
      <Modal
        isOpen={!!newKeyData}
        onClose={() => setNewKeyData(null)}
        title="🔑 Your New API Key"
        description="Copy and store this key safely. It will never be shown again."
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
            <p className="text-amber-800 text-sm">
              <strong>Save this key now.</strong> Once you close this dialog, the full key will
              not be shown again. Store it in a secure secret manager.
            </p>
          </div>

          <div className="relative">
            <code className="block w-full p-3 bg-gray-950 text-emerald-400 rounded-lg text-xs font-mono break-all pr-12">
              {newKeyData?.key}
            </code>
            <button
              onClick={handleCopy}
              className="absolute right-3 top-3 text-gray-400 hover:text-white transition-colors"
            >
              {copiedKey ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            </button>
          </div>

          <Button className="w-full justify-center" onClick={() => setNewKeyData(null)}>
            I&apos;ve saved the key
          </Button>
        </div>
      </Modal>

      {/* Revoke Confirm */}
      <Modal isOpen={!!revokeId} onClose={() => setRevokeId(null)} title="Revoke API Key" size="sm">
        <p className="text-gray-600 text-sm mb-5">
          Revoking this key will immediately block all requests using it. This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setRevokeId(null)}>Cancel</Button>
          <Button
            variant="danger"
            loading={revokeMutation.isPending}
            onClick={() => revokeId && revokeMutation.mutate(revokeId)}
          >
            Revoke Key
          </Button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete API Key" size="sm">
        <p className="text-gray-600 text-sm mb-5">
          This will permanently delete the key and all associated logs.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
