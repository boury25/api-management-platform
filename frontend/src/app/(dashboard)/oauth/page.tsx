'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { projectsApi, oauthApi } from '@/lib/api';
import { formatDate, copyToClipboard } from '@/lib/utils';
import { Plus, Shield, Trash2, Ban, Copy, Check, AlertTriangle } from 'lucide-react';
import type { OAuthClient } from '@/types';

export default function OAuthPage() {
  const qc = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newClientData, setNewClientData] = useState<(OAuthClient & { clientSecret: string }) | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    redirectUrls: '',
    scopes: 'read write',
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list({ limit: 100 }),
  });

  const { data: clientsData, isLoading } = useQuery({
    queryKey: ['oauth', selectedProjectId],
    queryFn: () => oauthApi.list(selectedProjectId),
    enabled: !!selectedProjectId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      oauthApi.create(selectedProjectId, {
        name: formData.name,
        redirectUrls: formData.redirectUrls.split('\n').filter(Boolean),
        scopes: formData.scopes.split(/[\s,]+/).filter(Boolean),
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['oauth'] });
      setIsCreateOpen(false);
      setNewClientData(data);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => oauthApi.revoke(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['oauth'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => oauthApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['oauth'] }),
  });

  const projects = projectsData?.data || [];
  const clients = clientsData?.data || [];

  return (
    <DashboardLayout title="OAuth Clients" subtitle="Manage OAuth 2.0 client applications">
      <div className="flex items-center gap-3 mb-6">
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
        >
          <option value="">Select project...</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {selectedProjectId && (
          <Button leftIcon={<Plus size={16} />} onClick={() => setIsCreateOpen(true)}>
            New Client
          </Button>
        )}
      </div>

      {!selectedProjectId ? (
        <Card className="text-center py-20">
          <Shield className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500 text-sm">Select a project to manage OAuth clients</p>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
      ) : clients.length === 0 ? (
        <Card className="text-center py-16">
          <Shield className="mx-auto text-gray-300 mb-4" size={36} />
          <p className="text-gray-500 text-sm mb-4">No OAuth clients yet</p>
          <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setIsCreateOpen(true)}>
            Create Client
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {clients.map((client) => (
            <Card key={client.id} className={client.isRevoked ? 'opacity-60' : ''}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                  <Shield size={18} className="text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{client.name}</span>
                    <Badge variant={client.isRevoked ? 'danger' : 'success'} dot>
                      {client.isRevoked ? 'revoked' : 'active'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs mt-2">
                    <div>
                      <p className="text-gray-400 mb-0.5">Client ID</p>
                      <code className="key-display">{client.clientId}</code>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-0.5">Client Secret</p>
                      <code className="key-display">{client.clientSecretPrefix}...</code>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-0.5">Scopes</p>
                      <p className="text-gray-600">{client.scopes.join(', ') || '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-0.5">Created</p>
                      <p className="text-gray-600">{formatDate(client.createdAt)}</p>
                    </div>
                  </div>
                  {client.redirectUrls.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-400 mb-1">Redirect URLs</p>
                      {client.redirectUrls.map((url) => (
                        <code key={url} className="block text-xs text-gray-500 font-mono">{url}</code>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!client.isRevoked && (
                    <button
                      onClick={() => revokeMutation.mutate(client.id)}
                      title="Revoke"
                      className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                    >
                      <Ban size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteMutation.mutate(client.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create OAuth Client" size="md">
        <div className="space-y-4">
          <Input
            label="Application Name"
            placeholder="My Web App"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Redirect URLs (one per line)
            </label>
            <textarea
              rows={3}
              placeholder="https://myapp.com/callback"
              value={formData.redirectUrls}
              onChange={(e) => setFormData({ ...formData, redirectUrls: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none resize-none"
            />
          </div>
          <Input
            label="Scopes (space or comma separated)"
            placeholder="read write profile"
            value={formData.scopes}
            onChange={(e) => setFormData({ ...formData, scopes: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button loading={createMutation.isPending} onClick={() => createMutation.mutate()}>
              Create Client
            </Button>
          </div>
        </div>
      </Modal>

      {/* New Client Secret Modal */}
      <Modal
        isOpen={!!newClientData}
        onClose={() => setNewClientData(null)}
        title="🛡 OAuth Client Created"
        description="Save the client secret now — it will not be shown again."
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
            <p className="text-amber-800 text-sm">Store this secret securely. Use it to authenticate OAuth flows.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-gray-500 mb-1">Client ID</p>
              <code className="key-display block">{newClientData?.clientId}</code>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Client Secret</p>
              <div className="relative">
                <code className="key-display block pr-8">{newClientData?.clientSecret}</code>
                <button
                  onClick={async () => {
                    if (newClientData?.clientSecret) {
                      await copyToClipboard(newClientData.clientSecret);
                      setCopiedSecret(true);
                      setTimeout(() => setCopiedSecret(false), 2000);
                    }
                  }}
                  className="absolute right-2 top-1 text-gray-400 hover:text-gray-600"
                >
                  {copiedSecret ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                </button>
              </div>
            </div>
          </div>
          <Button className="w-full justify-center" onClick={() => setNewClientData(null)}>
            Done — I&apos;ve saved the credentials
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
