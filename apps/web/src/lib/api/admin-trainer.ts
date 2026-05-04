import { apiClient } from './client.js';
import { apiCall } from './api-call.js';

import type { CategorizedApiError } from './types.js';

export interface CompetencyDistribution {
  domain: string;
  averageScore: number;
  learnerCount: number;
  distribution: {
    foundational: number;
    operational: number;
    consistent: number;
    mastery: number;
  };
}

export interface ErrorPattern {
  pattern: string;
  count: number;
  domain: string;
  recentOccurrences: string[];
}

export interface CampaignCompletion {
  campaignId: string;
  campaignName: string;
  totalLearners: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  completionRate: number;
}

export interface LearnerSummary {
  userId: string;
  email: string;
  displayName: string;
  score: number;
  trend: 'improving' | 'declining' | 'stable';
  lastActivity: string;
}

export interface TrainerDashboardData {
  competencies: CompetencyDistribution[];
  errorPatterns: ErrorPattern[];
  campaigns: CampaignCompletion[];
  totalLearners: number;
  averageScore: number;
}

export async function getTrainerDashboard(dateRange?: {
  startDate?: string;
  endDate?: string;
}): Promise<{
  data?: TrainerDashboardData;
  error?: CategorizedApiError;
}> {
  const params = new URLSearchParams();
  if (dateRange?.startDate) params.set('startDate', dateRange.startDate);
  if (dateRange?.endDate) params.set('endDate', dateRange.endDate);

  const queryString = params.toString();
  const url = `/admin/trainer/dashboard${queryString ? `?${queryString}` : ''}`;

  return apiCall(() => apiClient.get<TrainerDashboardData>(url));
}

export async function getTrainerCompetencies(dateRange?: {
  startDate?: string;
  endDate?: string;
}): Promise<{
  data?: CompetencyDistribution[];
  error?: CategorizedApiError;
}> {
  const params = new URLSearchParams();
  if (dateRange?.startDate) params.set('startDate', dateRange.startDate);
  if (dateRange?.endDate) params.set('endDate', dateRange.endDate);

  const queryString = params.toString();
  const url = `/admin/trainer/competencies${queryString ? `?${queryString}` : ''}`;

  return apiCall(() => apiClient.get<CompetencyDistribution[]>(url));
}

export async function getTrainerErrors(dateRange?: {
  startDate?: string;
  endDate?: string;
}): Promise<{
  data?: ErrorPattern[];
  error?: CategorizedApiError;
}> {
  const params = new URLSearchParams();
  if (dateRange?.startDate) params.set('startDate', dateRange.startDate);
  if (dateRange?.endDate) params.set('endDate', dateRange.endDate);

  const queryString = params.toString();
  const url = `/admin/trainer/errors${queryString ? `?${queryString}` : ''}`;

  return apiCall(() => apiClient.get<ErrorPattern[]>(url));
}

export async function getTrainerCampaigns(): Promise<{
  data?: CampaignCompletion[];
  error?: CategorizedApiError;
}> {
  return apiCall(() => apiClient.get<CampaignCompletion[]>('/admin/trainer/campaigns'));
}

export async function getTrainerLearners(
  domain: string,
  threshold: number = 50,
): Promise<{
  data?: LearnerSummary[];
  error?: CategorizedApiError;
}> {
  return apiCall(() =>
    apiClient.get<LearnerSummary[]>(`/admin/trainer/learners/${domain}?threshold=${threshold}`),
  );
}
