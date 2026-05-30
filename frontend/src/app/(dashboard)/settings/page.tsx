'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { User, Lock, CheckCircle } from 'lucide-react';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: z
      .string()
      .min(8, 'Must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must include uppercase, lowercase, and number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const onChangePassword = async (data: PasswordForm) => {
    try {
      setPasswordError('');
      await authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setPasswordSuccess(true);
      reset();
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    }
  };

  return (
    <DashboardLayout title="Settings" subtitle="Manage your account and security settings">
      <div className="max-w-2xl space-y-6">
        {/* Profile */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <User size={18} className="text-gray-500" />
            <h3 className="text-base font-semibold text-gray-900">Profile</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg flex-wrap">
              <div className="w-12 h-12 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-lg uppercase">
                  {user?.name?.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{user?.name}</p>
                <p className="text-sm text-gray-500 truncate">{user?.email}</p>
              </div>
              <Badge variant={user?.role === 'ADMIN' ? 'purple' : user?.role === 'DEVELOPER' ? 'info' : 'default'}>
                {user?.role?.toLowerCase()}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Change Password */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <Lock size={18} className="text-gray-500" />
            <h3 className="text-base font-semibold text-gray-900">Change Password</h3>
          </div>

          {passwordSuccess && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2.5">
              <CheckCircle size={16} className="text-emerald-600 shrink-0" />
              <p className="text-emerald-700 text-sm font-medium">
                Password changed successfully. You&apos;ve been logged out from all other sessions.
              </p>
            </div>
          )}

          {passwordError && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{passwordError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              placeholder="Enter current password"
              error={errors.currentPassword?.message}
              {...register('currentPassword')}
            />
            <Input
              label="New Password"
              type="password"
              placeholder="Min 8 chars, uppercase + lowercase + number"
              error={errors.newPassword?.message}
              {...register('newPassword')}
            />
            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Repeat new password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            <div className="pt-2">
              <Button type="submit" loading={isSubmitting}>
                Update Password
              </Button>
            </div>
          </form>
        </Card>

        {/* API Info */}
        <Card>
          <h3 className="text-base font-semibold text-gray-900 mb-4">API Information</h3>
          <div className="space-y-3 text-sm">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-gray-100">
              <span className="text-gray-500">API Base URL</span>
              <code className="text-gray-700 font-mono text-sm break-all">
                {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api
              </code>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-gray-100">
              <span className="text-gray-500">API Docs</span>
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/docs`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:underline font-mono"
              >
                /api/docs ↗
              </a>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-gray-100">
              <span className="text-gray-500">Gateway URL</span>
              <code className="text-gray-700 font-mono text-sm break-all">/api/gateway/:projectId/*</code>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2">
              <span className="text-gray-500">Mock Server URL</span>
              <code className="text-gray-700 font-mono text-sm break-all">/api/mocks/serve/:projectId/*</code>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
