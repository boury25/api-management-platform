'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { projectsApi, apiKeysApi } from '@/lib/api';
import { Play, Key, ChevronDown, ChevronRight, Plus, Minus, FlaskConical } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ResponseState {
  status: number;
  statusText: string;
  time: number;
  headers: Record<string, string>;
  body: unknown;
  headersOpen: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const METHODS: Method[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const METHOD_COLORS: Record<Method, string> = {
  GET:    'text-emerald-700 bg-emerald-50  border-emerald-200',
  POST:   'text-blue-700   bg-blue-50    border-blue-200',
  PUT:    'text-amber-700  bg-amber-50   border-amber-200',
  PATCH:  'text-purple-700 bg-purple-50  border-purple-200',
  DELETE: 'text-red-700    bg-red-50     border-red-200',
};

function statusColor(code: number) {
  if (code >= 200 && code < 300) return 'bg-emerald-100 text-emerald-700';
  if (code >= 400 && code < 500) return 'bg-amber-100   text-amber-700';
  if (code >= 500)               return 'bg-red-100     text-red-700';
  return 'bg-gray-200 text-gray-700';
}

function prettyJson(data: unknown): string {
  try   { return JSON.stringify(data, null, 2); }
  catch { return String(data); }
}

const sessionKey = (pid: string) => `pg_apikey_${pid}`;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlaygroundPage() {
  const [projectId,   setProjectId]   = useState('');
  const [apiKey,      setApiKey]      = useState('');
  const [method,      setMethod]      = useState<Method>('GET');
  const [path,        setPath]        = useState('/posts/1');
  const [bodyText,    setBodyText]    = useState('');
  const [customHdrs,  setCustomHdrs]  = useState<{ key: string; value: string }[]>([]);
  const [sending,     setSending]     = useState(false);
  const [keyBusy,     setKeyBusy]     = useState(false);
  const [keyError,    setKeyError]    = useState('');
  const [response,    setResponse]    = useState<ResponseState | null>(null);

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list({ limit: 100 }),
  });

  const { data: keysData } = useQuery({
    queryKey: ['api-keys', projectId],
    queryFn: () => apiKeysApi.list(projectId, { limit: 50 }),
    enabled: !!projectId,
  });

  const projects    = projectsData?.data ?? [];
  const activeKeys  = (keysData?.data ?? []).filter((k) => !k.isRevoked);

  // Restore persisted key when project changes
  useEffect(() => {
    if (!projectId) { setApiKey(''); return; }
    setApiKey(sessionStorage.getItem(sessionKey(projectId)) ?? '');
  }, [projectId]);

  // ── Generate a usable key (rotate first active) ────────────────────────────
  const handleGenerateKey = async () => {
    if (!projectId || activeKeys.length === 0) return;
    setKeyBusy(true);
    setKeyError('');
    try {
      const data = await apiKeysApi.rotate(activeKeys[0].id);
      const raw = (data as unknown as { key: string }).key;
      sessionStorage.setItem(sessionKey(projectId), raw);
      setApiKey(raw);
    } catch (e: unknown) {
      setKeyError((e as Error).message ?? 'Failed to generate key');
    } finally {
      setKeyBusy(false);
    }
  };

  // ── Send request ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!projectId || !apiKey) return;
    setSending(true);
    setResponse(null);

    const normalised = path.startsWith('/') ? path : `/${path}`;
    const url = `/api/gateway/${projectId}${normalised}`;

    const reqHeaders: Record<string, string> = { 'X-API-Key': apiKey };
    customHdrs.forEach(({ key, value }) => {
      if (key.trim()) reqHeaders[key.trim()] = value;
    });
    const hasBody = ['POST', 'PUT', 'PATCH'].includes(method);
    if (hasBody && bodyText) reqHeaders['Content-Type'] = 'application/json';

    const t0 = Date.now();
    try {
      const res = await fetch(url, {
        method,
        headers: reqHeaders,
        body: hasBody && bodyText ? bodyText : undefined,
      });
      const elapsed = Date.now() - t0;

      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { resHeaders[k] = v; });

      const ct = res.headers.get('content-type') ?? '';
      const resBody = ct.includes('json') ? await res.json() : await res.text();

      setResponse({ status: res.status, statusText: res.statusText,
                    time: elapsed, headers: resHeaders, body: resBody, headersOpen: false });
    } catch (e: unknown) {
      setResponse({ status: 0, statusText: 'Network Error',
                    time: Date.now() - t0, headers: {},
                    body: { error: (e as Error).message }, headersOpen: false });
    } finally {
      setSending(false);
    }
  };

  const hasBody = ['POST', 'PUT', 'PATCH'].includes(method);
  const canSend = !!projectId && !!apiKey && !sending;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout
      title="API Playground"
      subtitle="Test gateway endpoints live and inspect every response"
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

        {/* ════ LEFT: Request Builder ════ */}
        <div className="space-y-4">

          {/* Connection */}
          <Card>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Connection
            </p>
            <div className="space-y-3">
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              >
                <option value="">Select a project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {projectId && (
                <>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        sessionStorage.setItem(sessionKey(projectId), e.target.value);
                      }}
                      placeholder={activeKeys.length ? 'Paste API key, or click Generate →' : 'Paste your API key'}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-mono"
                    />
                    {activeKeys.length > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Key size={14} />}
                        loading={keyBusy}
                        onClick={handleGenerateKey}
                      >
                        Generate
                      </Button>
                    )}
                  </div>
                  {keyError && (
                    <p className="text-xs text-red-600">{keyError}</p>
                  )}
                  {apiKey && !keyError && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      API key active — requests will be authenticated
                    </p>
                  )}
                </>
              )}
            </div>
          </Card>

          {/* Request */}
          <Card>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Request
            </p>
            <div className="space-y-3">

              {/* Method + Path */}
              <div className="flex gap-2">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as Method)}
                  className={`px-3 py-2 text-sm font-bold rounded-lg border font-mono focus:outline-none cursor-pointer ${METHOD_COLORS[method]}`}
                >
                  {METHODS.map((m) => <option key={m}>{m}</option>)}
                </select>
                <input
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && canSend && handleSend()}
                  placeholder="/posts/1"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-mono"
                />
              </div>

              {/* Body */}
              {hasBody && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">Body (JSON)</p>
                  <textarea
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    rows={5}
                    placeholder={'{\n  "title": "Hello",\n  "body": "World",\n  "userId": 1\n}'}
                    spellCheck={false}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-mono resize-y"
                  />
                </div>
              )}

              {/* Custom Headers */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-medium text-gray-500">Custom Headers</p>
                  <button
                    onClick={() => setCustomHdrs([...customHdrs, { key: '', value: '' }])}
                    className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-0.5 font-medium"
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>
                <div className="space-y-1.5">
                  {customHdrs.map((h, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={h.key}
                        onChange={(e) => {
                          const next = [...customHdrs];
                          next[i] = { ...next[i], key: e.target.value };
                          setCustomHdrs(next);
                        }}
                        placeholder="Header-Name"
                        className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                      <input
                        value={h.value}
                        onChange={(e) => {
                          const next = [...customHdrs];
                          next[i] = { ...next[i], value: e.target.value };
                          setCustomHdrs(next);
                        }}
                        placeholder="value"
                        className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                      <button
                        onClick={() => setCustomHdrs(customHdrs.filter((_, j) => j !== i))}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                className="w-full justify-center"
                leftIcon={<Play size={15} />}
                loading={sending}
                disabled={!canSend}
                onClick={handleSend}
              >
                Send Request
              </Button>
            </div>
          </Card>
        </div>

        {/* ════ RIGHT: Response ════ */}
        <div>
          {!response ? (
            <Card className="flex flex-col items-center justify-center py-32 text-center">
              <FlaskConical className="text-gray-200 mb-4" size={52} />
              <p className="text-gray-400 text-sm">
                Hit <span className="font-semibold">Send Request</span> to see the live response here
              </p>
              <p className="text-gray-300 text-xs mt-1">
                Responses are proxied through the gateway and logged automatically
              </p>
            </Card>
          ) : (
            <Card padding="none" className="overflow-hidden">

              {/* Status bar */}
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${statusColor(response.status)}`}>
                    {response.status > 0
                      ? `${response.status} ${response.statusText}`
                      : 'Network Error'}
                  </span>
                </div>
                <span className="text-xs font-mono text-gray-500">{response.time} ms</span>
              </div>

              {/* Collapsible headers */}
              {Object.keys(response.headers).length > 0 && (
                <div className="border-b border-gray-100">
                  <button
                    onClick={() =>
                      setResponse({ ...response, headersOpen: !response.headersOpen })
                    }
                    className="w-full flex items-center gap-2 px-5 py-2.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    {response.headersOpen
                      ? <ChevronDown size={13} />
                      : <ChevronRight size={13} />}
                    Response Headers ({Object.keys(response.headers).length})
                  </button>
                  {response.headersOpen && (
                    <div className="px-5 pb-3 max-h-52 overflow-y-auto">
                      {Object.entries(response.headers).map(([k, v]) => (
                        <div key={k} className="flex gap-4 py-0.5 text-xs font-mono">
                          <span className="text-brand-600 shrink-0 w-44 truncate">{k}</span>
                          <span className="text-gray-600 break-all">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Body */}
              <pre className="px-5 py-4 text-xs font-mono text-gray-800 leading-relaxed overflow-auto max-h-[62vh] whitespace-pre-wrap break-words">
                {typeof response.body === 'string'
                  ? response.body
                  : prettyJson(response.body)}
              </pre>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
