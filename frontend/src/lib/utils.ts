import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

export function getStatusColor(statusCode: number): string {
  if (statusCode >= 200 && statusCode < 300) return 'text-emerald-600 bg-emerald-50';
  if (statusCode >= 300 && statusCode < 400) return 'text-blue-600 bg-blue-50';
  if (statusCode >= 400 && statusCode < 500) return 'text-amber-600 bg-amber-50';
  if (statusCode >= 500) return 'text-red-600 bg-red-50';
  return 'text-gray-600 bg-gray-50';
}

export function getMethodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    case 'POST': return 'text-blue-700 bg-blue-50 border-blue-200';
    case 'PUT': return 'text-amber-700 bg-amber-50 border-amber-200';
    case 'PATCH': return 'text-purple-700 bg-purple-50 border-purple-200';
    case 'DELETE': return 'text-red-700 bg-red-50 border-red-200';
    default: return 'text-gray-700 bg-gray-50 border-gray-200';
  }
}

export function getEnvironmentColor(env: string): string {
  switch (env) {
    case 'PRODUCTION': return 'text-red-700 bg-red-50 border-red-200';
    case 'STAGING': return 'text-amber-700 bg-amber-50 border-amber-200';
    case 'DEVELOPMENT': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    default: return 'text-gray-700 bg-gray-50';
  }
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return `${str.substring(0, length)}...`;
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
