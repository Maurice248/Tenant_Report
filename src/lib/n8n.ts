import axios, { AxiosError } from 'axios';
import { getRequestN8nConfig, getN8nWebhook } from '@/lib/company-integrations';

export interface N8nCampaignInput {
  campaign_name: string;
  service_type: string;
  target_region: string;
  campaign_goal: string;
  campaign_message: string;
  cta_button_text: string;
  cta_link?: string;
  tone: string;
  selected_sheet: string;
  user_id: string;
  auto_approve?: boolean;
}

export interface N8nScraperInput {
  niches: string;
  location: string;
  max_results: number;
  target_sheet: string;
  user_id: string;
}

export interface N8nCleanupInput {
  force_cleanup: boolean;
  user_id: string;
}

export interface N8nResponse<T = unknown> {
  status: 'success' | 'error';
  execution_id: string;
  workflow_type: string;
  results?: T;
  error_message?: string;
  timestamp: string;
}

class N8nClient {
  private async getHeaders() {
    const cfg = await getRequestN8nConfig();
    return {
      'Content-Type': 'application/json',
      'X-API-Key': cfg.apiKey || '',
    };
  }

  async triggerCampaign(input: N8nCampaignInput): Promise<N8nResponse> {
    try {
      const cfg = await getRequestN8nConfig();
      const url = getN8nWebhook(cfg, 'N8N_CAMPAIGN_WEBHOOK_URL');
      if (!url) {
        return this.missingWebhookError('campaign', 'N8N_CAMPAIGN_WEBHOOK_URL');
      }
      const response = await axios.post(url, input, {
        headers: await this.getHeaders(),
        timeout: 120000,
      });
      return response.data;
    } catch (error) {
      return this.handleError(error, 'campaign');
    }
  }

  async triggerScraper(input: N8nScraperInput): Promise<N8nResponse> {
    try {
      const cfg = await getRequestN8nConfig();
      const url = getN8nWebhook(cfg, 'N8N_SCRAPER_WEBHOOK_URL');
      if (!url) {
        return this.missingWebhookError('scraper', 'N8N_SCRAPER_WEBHOOK_URL');
      }
      const response = await axios.post(url, input, {
        headers: await this.getHeaders(),
        timeout: 300000,
      });
      return response.data;
    } catch (error) {
      return this.handleError(error, 'scraper');
    }
  }

  async triggerCleanup(input: N8nCleanupInput): Promise<N8nResponse> {
    try {
      const cfg = await getRequestN8nConfig();
      const url = getN8nWebhook(cfg, 'N8N_CLEANUP_WEBHOOK_URL');
      if (!url) {
        return this.missingWebhookError('cleanup', 'N8N_CLEANUP_WEBHOOK_URL');
      }
      const response = await axios.post(url, input, {
        headers: await this.getHeaders(),
        timeout: 180000,
      });
      return response.data;
    } catch (error) {
      return this.handleError(error, 'cleanup');
    }
  }

  private missingWebhookError(workflowType: string, key: string): N8nResponse {
    return {
      status: 'error',
      execution_id: 'error',
      workflow_type: workflowType,
      error_message: `Webhook ${key} is not configured in API key management.`,
      timestamp: new Date().toISOString(),
    };
  }

  private handleError(error: unknown, workflowType: string): N8nResponse {
    console.error(`n8n ${workflowType} error:`, error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error_message?: string }>;
      return {
        status: 'error',
        execution_id: 'error',
        workflow_type: workflowType,
        error_message:
          axiosError.response?.data?.error_message ||
          axiosError.message ||
          'Webhook request failed',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      status: 'error',
      execution_id: 'error',
      workflow_type: workflowType,
      error_message: 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    };
  }
}

export const n8nClient = new N8nClient();
