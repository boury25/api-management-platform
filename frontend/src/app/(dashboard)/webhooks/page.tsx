'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { projectsApi, webhooksApi } from '@/lib/api';
import { formatDate, copyToClipboard } from '@/lib/utils';
import { Plus, Webhook, Trash2, Copy, Check, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';
import type { WebhookEvent } from '@/types';

const EVENT_LABELS: Record<WebhookEvent, string> = {
  API_KEY_USED: 'API Key Used',
  RATE_LIMIT_EXCEEDED: 'Rate Limit Exceeded',
  GATEWAY_REQUEST_FAILED: 'Gateway Request Failed',
  MOCK_ENDPOINT_CALLED: 'Mock Endpoint Called',
};

export default function WebhooksPage() {
  const qc = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newWebhookData, setNewWebhookData] = useState<{ id: string; secret: string } | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [formData, setFormData] = useState({ name: '', url: '', eventType: 'GATEWAY_REQUEST_FAILED' });

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list({ limit: 100 }),
  });

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['webhooks', selectedProjectId],
    queryFn: () => webhooksApi.list(selectedProjectId),
    enabled: !!selectedProjectId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      webhooksApi.create(selectedProjectId, {
        name: formData.name,
        url: formData.url,
        eventType: formData.eventType,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['webhooks'] });
      setIsCreateOpen(false);
      setNewWebhookData({ id: data.id, secret: data.secret! });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      webhooksApi.update(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => webhooksApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks'] }),
  });

  const projects = projectsData?.data || [];
  const webhookList = webhooks || [];

  return (
    <DashboardLayout title="Webhooks" subtitle="Configure webhooks to receive real-time event notifications">
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
            Add Webhook
          </Button>
        )}
      </div>

      {!selectedProjectId ? (
        <Card className="text-center py-20">
          <Webhook className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500 text-sm">Select a project to manage webhooks</p>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : webhookList.length === 0 ? (
        <Card className="text-center py-16">
          <Webhook className="mx-auto text-gray-300 mb-4" size={36} />
          <p className="text-gray-500 text-sm mb-4">No webhooks configured yet</p>
          <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setIsCreateOpen(true)}>
            Add Webhook
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {webhookList.map((webhook) => (
            <Card key={webhook.id} className={`${!webhook.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 text-sm">{webhook.name}</span>
                    <Badge variant={webhook.isActive ? 'success' : 'default'} dot>
                      {webhook.isActive ? 'active' : 'paused'}
                    </Badge>
                    <Badge variant="purple">{EVENT_LABELS[webhook.eventType]}</Badge>
                  </div>
                  <p className="text-xs font-mono text-gray-500 truncate">{webhook.url}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Secret: <code className="key-display">{webhook.secretPrefix}...</code>
                    {' · '}Created {formatDate(webhook.createdAt)}
                    {' · '}{webhook._count?.deliveryLogs || 0} deliveries
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleMutation.mutate({ id: webhook.id, isActive: !webhook.isActive })}
                    className="text-gray-400 hover:text-brand-600 transition-colors"
                  >
                    {webhook.isActive
                      ? <ToggleRight size={22} className="text-brand-600" />
                      : <ToggleLeft size={22} />}
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(webhook.id)}
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
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Webhook"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Webhook Name"
            placeholder="Slack Alert"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Target URL"
            type="url"
            placeholder="https://hooks.slack.com/services/..."
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Event Type</label>
            <select
              value={formData.eventType}
              onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
            >
              {Object.entries(EVENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button loading={createMutation.isPending} onClick={() => createMutation.mutate()}>
              Create Webhook
            </Button>
          </div>
        </div>
      </Modal>

      {/* New Webhook Secret Modal */}
      <Modal
        isOpen={!!newWebhookData}
        onClose={() => setNewWebhookData(null)}
        title="🪝 Webhook Created"
        description="Save this signing secret to verify webhook payloads. It will not be shown again."
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
            <p className="text-amber-800 text-sm">
              Store this secret in your application's environment variables to verify the
              <code className="mx-1 key-display">X-Webhook-Signature</code> header.
            </p>
          </div>

          <div className="relative">
            <code className="block w-full p-3 bg-gray-950 text-emerald-400 rounded-lg text-xs font-mono break-all pr-12">
              {newWebhookData?.secret}
            </code>
            <button
              onClick={async () => {
                if (newWebhookData?.secret) {
                  await copyToClipboard(newWebhookData.secret);
                  setCopiedSecret(true);
                  setTimeout(() => setCopiedSecret(false), 2000);
                }
              }}
              className="absolute right-3 top-3 text-gray-400 hover:text-white transition-colors"
            >
              {copiedSecret ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            </button>
          </div>

          <Button className="w-full justify-center" onClick={() => setNewWebhookData(null)}>
            I&apos;ve saved the secret
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
