'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { projectsApi } from '@/lib/api';
import { formatDate, getEnvironmentColor } from '@/lib/utils';
import { Plus, FolderOpen, Trash2, Settings, ExternalLink, Globe } from 'lucide-react';
import type { Environment } from '@/types';

const schema = z.object({
  name: z.string().min(2, 'Name too short'),
  baseUrl: z.string().url('Must be a valid URL'),
  environment: z.enum(['PRODUCTION', 'STAGING', 'DEVELOPMENT']),
  description: z.string().max(500).optional(),
});

type FormData = z.infer<typeof schema>;

export default function ProjectsPage() {
  const qc = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list({ limit: 50 }),
  });

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      setIsModalOpen(false);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      setDeleteId(null);
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { environment: 'DEVELOPMENT' },
  });

  const onSubmit = (data: FormData) => createMutation.mutate(data);

  const projects = data?.data || [];

  return (
    <DashboardLayout title="Projects" subtitle="Manage your API projects and configurations">
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-sm text-gray-500">
            {data?.meta?.total || 0} project{data?.meta?.total !== 1 ? 's' : ''}
          </p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
          New Project
        </Button>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card className="text-center py-16">
          <FolderOpen className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No projects yet</h3>
          <p className="text-gray-500 text-sm mb-5">Create your first project to start managing APIs</p>
          <Button leftIcon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
            Create Project
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <Card key={project.id} hover className="group">
              {/* Top row */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                  <Globe size={18} className="text-brand-600" />
                </div>
                <Badge
                  variant={
                    project.environment === 'PRODUCTION'
                      ? 'danger'
                      : project.environment === 'STAGING'
                      ? 'warning'
                      : 'success'
                  }
                  dot
                >
                  {project.environment.toLowerCase()}
                </Badge>
              </div>

              {/* Name & URL */}
              <h3 className="font-semibold text-gray-900 mb-1 truncate">{project.name}</h3>
              <p className="text-xs text-gray-400 font-mono truncate mb-2">{project.baseUrl}</p>
              {project.description && (
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{project.description}</p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 pt-3 border-t border-gray-100 text-xs text-gray-500 mb-4">
                <span>{project._count?.apiKeys || 0} keys</span>
                <span>·</span>
                <span>{project._count?.requestLogs?.toLocaleString() || 0} requests</span>
                <span>·</span>
                <span>{formatDate(project.createdAt)}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<Settings size={13} />}
                  onClick={() => {}}
                >
                  Configure
                </Button>
                <a
                  href={project.baseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5"
                >
                  <ExternalLink size={13} />
                </a>
                <button
                  onClick={() => setDeleteId(project.id)}
                  className="ml-auto p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); reset(); }}
        title="Create New Project"
        description="Configure a new API project to start managing endpoints and keys"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Project Name"
            placeholder="E-Commerce API"
            required
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Base URL"
            placeholder="https://api.yourservice.com"
            required
            error={errors.baseUrl?.message}
            hint="All gateway requests will be forwarded to this URL"
            {...register('baseUrl')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Environment <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              {...register('environment')}
            >
              <option value="DEVELOPMENT">Development</option>
              <option value="STAGING">Staging</option>
              <option value="PRODUCTION">Production</option>
            </select>
            {errors.environment && (
              <p className="mt-1.5 text-xs text-red-600">{errors.environment.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Brief description of this project..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none"
              {...register('description')}
            />
          </div>

          {createMutation.error && (
            <p className="text-sm text-red-600">
              {(createMutation.error as Error).message}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setIsModalOpen(false); reset(); }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting || createMutation.isPending}>
              Create Project
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Project"
        description="This will permanently delete the project and all associated data including API keys, logs, and webhooks."
        size="sm"
      >
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
          >
            Delete Project
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
