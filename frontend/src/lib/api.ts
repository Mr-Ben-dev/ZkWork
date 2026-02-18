const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

function getToken(): string | null {
  return localStorage.getItem('zkwork_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...authHeaders(), ...options.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data as T;
}

export const apiClient = {
  getNonce: (address: string) =>
    request<{ nonce: string; message: string }>('/auth/nonce', {
      method: 'POST',
      body: JSON.stringify({ address }),
    }),

  verifySignature: (address: string, signature: string, nonce: string) =>
    request<{ success: boolean; token: string; address: string }>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ address, signature, nonce }),
    }),

  registerWorker: (data: { commitment: string; skills: string[]; bio: string; ratePerHour: number; currency: string; txId: string }) =>
    request('/workers/register', { method: 'POST', body: JSON.stringify(data) }),

  getWorkerProfile: () => request('/workers/profile'),

  listWorkers: () => request<{ workers: any[] }>('/workers/list'),

  createJob: (data: { commitment: string; title: string; description: string; budget: number; currency: string; skills: string[]; deadline: string; txId: string }) =>
    request('/jobs/create', { method: 'POST', body: JSON.stringify(data) }),

  getAvailableJobs: () => request<{ jobs: any[] }>('/jobs/available'),

  getMyJobs: () => request<{ jobs: any[] }>('/jobs/my'),

  applyToJob: (commitment: string, data: { workerCommitment: string; coverLetter: string; proposedRate: number }) =>
    request(`/jobs/${commitment}/apply`, { method: 'POST', body: JSON.stringify(data) }),

  getJobApplications: (commitment: string) =>
    request<{ applications: any[] }>(`/jobs/${commitment}/applications`),

  cancelJob: (commitment: string, data: { txId: string }) =>
    request(`/jobs/${commitment}/cancel`, { method: 'POST', body: JSON.stringify(data) }),

  getJob: (commitment: string) => request(`/jobs/${commitment}`),

  createAgreement: (data: { commitment: string; jobCommitment: string; workerCommitment: string; amount: number; currency: string; txId: string; onChainAgreementId?: string }) =>
    request('/agreements/create', { method: 'POST', body: JSON.stringify(data) }),

  getMyAgreements: () => request<{ agreements: any[] }>('/agreements/my'),

  submitDeliverable: (commitment: string, data: { deliverable: string; txId: string }) =>
    request(`/agreements/${commitment}/deliverable`, { method: 'POST', body: JSON.stringify(data) }),

  getAgreement: (commitment: string) => request(`/agreements/${commitment}`),

  patchAgreement: (commitment: string, data: { onChainAgreementId: string }) =>
    request(`/agreements/${commitment}`, { method: 'PATCH', body: JSON.stringify(data) }),

  depositEscrow: (data: { agreementCommitment: string; amount: number; currency: string; txId: string }) =>
    request('/escrow/deposit', { method: 'POST', body: JSON.stringify(data) }),

  completeEscrow: (data: { agreementCommitment: string; txId: string }) =>
    request('/escrow/complete', { method: 'POST', body: JSON.stringify(data) }),

  refundEscrow: (data: { agreementCommitment: string; txId: string }) =>
    request('/escrow/refund', { method: 'POST', body: JSON.stringify(data) }),

  getEscrowStatus: (commitment: string) => request(`/escrow/${commitment}/status`),

  confirmEscrowStatus: (commitment: string, status: 'deposited' | 'committed' | 'rejected') =>
    request(`/escrow/${commitment}/confirm`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  claimReputation: (data: { agreementCommitment: string; txId: string }) =>
    request('/reputation/claim', { method: 'POST', body: JSON.stringify(data) }),

  proveThreshold: (data: { threshold: number; verifierAddress: string; txId: string }) =>
    request('/reputation/prove', { method: 'POST', body: JSON.stringify(data) }),

  getMyReputation: () => request('/reputation/my'),

  verifyReputation: (commitment: string) => request(`/reputation/verify/${commitment}`),

  verifyTransaction: async (txId: string): Promise<boolean> => {
    try {
      const res = await fetch(
        `https://api.explorer.provable.com/v1/testnet/transaction/${txId}`
      );
      return res.ok;
    } catch {
      return false;
    }
  },
};
