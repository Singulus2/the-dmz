/* eslint-disable max-lines */

import { describe, expect, it, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

import { loadConfig, type AppConfig } from '../../../config.js';
import { createClaudeClient, createFetchClaudeTransport } from '../claude-client.service.js';

const createTestConfig = (overrides: Partial<AppConfig> = {}): AppConfig => {
  const base = loadConfig();
  return {
    ...base,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    ANTHROPIC_API_KEY: 'test-api-key',
    ANTHROPIC_API_URL: 'https://api.anthropic.com',
    AI_MAX_RETRIES: 3,
    AI_RETRY_DELAY_MS: 10,
    ...overrides,
  };
};

describe('claude-client.service integration', () => {
  describe('createFetchClaudeTransport', () => {
    it('sends correct request body and headers to /v1/messages', async () => {
      let capturedRequest: unknown = null;
      const server = setupServer(
        http.post('https://api.anthropic.com/v1/messages', async ({ request }) => {
          const body = await request.json();
          capturedRequest = {
            headers: Object.fromEntries(request.headers.entries()),
            body,
          };
          return HttpResponse.json({
            type: 'message',
            model: 'claude-sonnet-4-6',
            content: [{ type: 'text', text: 'Hello, world!' }],
            usage: { input_tokens: 10, output_tokens: 20 },
          });
        }),
      );
      server.listen();
      try {
        const transport = createFetchClaudeTransport({
          credential: 'my-api-key',
          baseUrl: 'https://api.anthropic.com',
        });
        const result = await transport({
          model: 'claude-sonnet-4-6',
          maxTokens: 128,
          temperature: 0.3,
          systemPrompt: 'You are a helpful assistant.',
          userPrompt: 'Say hello.',
          requestId: 'req-123',
        });
        expect(capturedRequest).not.toBeNull();
        expect((capturedRequest as { body: unknown }).body).toEqual({
          model: 'claude-sonnet-4-6',
          max_tokens: 128,
          temperature: 0.3,
          system: 'You are a helpful assistant.',
          messages: [{ role: 'user', content: 'Say hello.' }],
        });
        const headers = (capturedRequest as { headers: Record<string, string> }).headers;
        expect(headers['anthropic-version']).toBe('2023-06-01');
        expect(headers['x-api-key']).toBe('my-api-key');
        expect(headers['content-type']).toBe('application/json');
        expect(headers['x-request-id']).toBe('req-123');

        expect(result.text).toBe('Hello, world!');
        expect(result.model).toBe('claude-sonnet-4-6');
        expect(result.inputTokens).toBe(10);
        expect(result.outputTokens).toBe(20);
      } finally {
        server.close();
      }
    });
    it('extracts text from multi-block content response', async () => {
      const server = setupServer(
        http.post('https://api.anthropic.com/v1/messages', () => {
          return HttpResponse.json({
            type: 'message',
            model: 'claude-haiku-4-5-20251001',
            content: [
              { type: 'text', text: 'First part. ' },
              { type: 'text', text: 'Second part.' },
            ],
            usage: { input_tokens: 5, output_tokens: 10 },
          });
        }),
      );
      server.listen();
      try {
        const transport = createFetchClaudeTransport({
          credential: 'key',
          baseUrl: 'https://api.anthropic.com',
        });
        const result = await transport({
          model: 'claude-haiku-4-5-20251001',
          maxTokens: 64,
          systemPrompt: 'system',
          userPrompt: 'user',
        });
        expect(result.text).toBe('First part. Second part.');
      } finally {
        server.close();
      }
    });
    it('handles response without usage block', async () => {
      const server = setupServer(
        http.post('https://api.anthropic.com/v1/messages', () => {
          return HttpResponse.json({
            type: 'message',
            model: 'claude-opus-4-6',
            content: [{ type: 'text', text: 'Result' }],
          });
        }),
      );
      server.listen();
      try {
        const transport = createFetchClaudeTransport({
          credential: 'key',
          baseUrl: 'https://api.anthropic.com',
        });
        const result = await transport({
          model: 'claude-opus-4-6',
          maxTokens: 128,
          systemPrompt: 'sys',
          userPrompt: 'user',
        });
        expect(result.text).toBe('Result');
        expect(result.model).toBe('claude-opus-4-6');
        expect(result.inputTokens).toBeUndefined();
        expect(result.outputTokens).toBeUndefined();
      } finally {
        server.close();
      }
    });
    it('throws error with message from error payload on 400', async () => {
      const server = setupServer(
        http.post('https://api.anthropic.com/v1/messages', () => {
          return HttpResponse.json(
            { error: { type: 'invalid_request', message: 'Bad request parameters' } },
            { status: 400 },
          );
        }),
      );
      server.listen();
      try {
        const transport = createFetchClaudeTransport({
          credential: 'key',
          baseUrl: 'https://api.anthropic.com',
        });
        await expect(
          transport({ model: 'sonnet', maxTokens: 128, systemPrompt: 'sys', userPrompt: 'user' }),
        ).rejects.toThrow('Bad request parameters');
      } finally {
        server.close();
      }
    });
    it('throws error with status when error has no message', async () => {
      const server = setupServer(
        http.post('https://api.anthropic.com/v1/messages', () => {
          return HttpResponse.json({ error: { type: 'rate_limit_error' } }, { status: 429 });
        }),
      );
      server.listen();
      try {
        const transport = createFetchClaudeTransport({
          credential: 'key',
          baseUrl: 'https://api.anthropic.com',
        });
        await expect(
          transport({ model: 'sonnet', maxTokens: 128, systemPrompt: 'sys', userPrompt: 'user' }),
        ).rejects.toThrow('Anthropic request failed with status 429');
      } finally {
        server.close();
      }
    });
    it('throws generic error when response is not a record', async () => {
      const server = setupServer(
        http.post('https://api.anthropic.com/v1/messages', () => {
          return new HttpResponse('not json', { status: 500 });
        }),
      );
      server.listen();
      try {
        const transport = createFetchClaudeTransport({
          credential: 'key',
          baseUrl: 'https://api.anthropic.com',
        });
        await expect(
          transport({ model: 'sonnet', maxTokens: 128, systemPrompt: 'sys', userPrompt: 'user' }),
        ).rejects.toThrow('Anthropic request failed with status 500');
      } finally {
        server.close();
      }
    });
  });

  describe('createClaudeClient with MSW', () => {
    it('completes request successfully with sonnet model', async () => {
      const server = setupServer(
        http.post('https://api.anthropic.com/v1/messages', () => {
          return HttpResponse.json({
            type: 'message',
            model: 'claude-sonnet-4-6',
            content: [{ type: 'text', text: 'Sonnet response' }],
            usage: { input_tokens: 100, output_tokens: 50 },
          });
        }),
      );
      server.listen();
      try {
        const client = createClaudeClient({
          config: createTestConfig({ AI_GENERATION_MODEL: 'sonnet' }),
        });
        const result = await client.complete({
          task: 'generation',
          systemPrompt: 'You are smart.',
          userPrompt: 'What is 2+2?',
          maxTokens: 64,
        });
        expect(result.text).toBe('Sonnet response');
        expect(result.model).toBe('claude-sonnet-4-6');
        expect(result.inputTokens).toBe(100);
        expect(result.outputTokens).toBe(50);
        expect(result.latencyMs).toBeGreaterThanOrEqual(0);
        expect(result.estimatedCostUsd).toBeGreaterThan(0);
      } finally {
        server.close();
      }
    });
    it('completes request successfully with haiku model', async () => {
      const server = setupServer(
        http.post('https://api.anthropic.com/v1/messages', () => {
          return HttpResponse.json({
            type: 'message',
            model: 'claude-haiku-4-5-20251001',
            content: [{ type: 'text', text: 'Haiku response' }],
            usage: { input_tokens: 20, output_tokens: 10 },
          });
        }),
      );
      server.listen();
      try {
        const client = createClaudeClient({
          config: createTestConfig({ AI_CLASSIFICATION_MODEL: 'haiku' }),
        });
        const result = await client.complete({
          task: 'classification',
          systemPrompt: 'Classify this.',
          userPrompt: 'This is a test.',
          maxTokens: 32,
        });
        expect(result.text).toBe('Haiku response');
        expect(result.model).toBe('claude-haiku-4-5-20251001');
      } finally {
        server.close();
      }
    });
    it('completes request successfully with opus model', async () => {
      const server = setupServer(
        http.post('https://api.anthropic.com/v1/messages', () => {
          return HttpResponse.json({
            type: 'message',
            model: 'claude-opus-4-6',
            content: [{ type: 'text', text: 'Opus response' }],
            usage: { input_tokens: 200, output_tokens: 100 },
          });
        }),
      );
      server.listen();
      try {
        const client = createClaudeClient({
          config: createTestConfig({ AI_GENERATION_MODEL: 'opus' }),
        });
        const result = await client.complete({
          task: 'generation',
          systemPrompt: 'You are very capable.',
          userPrompt: 'Explain quantum physics.',
          maxTokens: 256,
        });
        expect(result.text).toBe('Opus response');
        expect(result.model).toBe('claude-opus-4-6');
      } finally {
        server.close();
      }
    });
    it('retries on 429 rate limit and succeeds on second attempt', async () => {
      let attemptCount = 0;
      const server = setupServer(
        http.post('https://api.anthropic.com/v1/messages', () => {
          attemptCount += 1;
          if (attemptCount === 1) {
            return HttpResponse.json(
              { error: { type: 'rate_limit_error', message: 'Rate limited' } },
              { status: 429 },
            );
          }
          return HttpResponse.json({
            type: 'message',
            model: 'claude-sonnet-4-6',
            content: [{ type: 'text', text: 'Success after retry' }],
            usage: { input_tokens: 10, output_tokens: 5 },
          });
        }),
      );
      server.listen();
      try {
        const client = createClaudeClient({
          config: createTestConfig(),
        });
        const result = await client.complete({
          task: 'generation',
          systemPrompt: 'sys',
          userPrompt: 'user',
          maxTokens: 64,
        });
        expect(attemptCount).toBe(2);
        expect(result.text).toBe('Success after retry');
      } finally {
        server.close();
      }
    });
    it('retries on 500 internal server error and succeeds on second attempt', async () => {
      let attemptCount = 0;
      const server = setupServer(
        http.post('https://api.anthropic.com/v1/messages', () => {
          attemptCount += 1;
          if (attemptCount === 1) {
            return HttpResponse.json(
              { error: { type: 'internal_server_error', message: 'Server error' } },
              { status: 500 },
            );
          }
          return HttpResponse.json({
            type: 'message',
            model: 'claude-sonnet-4-6',
            content: [{ type: 'text', text: 'Success after retry' }],
            usage: { input_tokens: 10, output_tokens: 5 },
          });
        }),
      );
      server.listen();
      try {
        const client = createClaudeClient({
          config: createTestConfig(),
        });
        const result = await client.complete({
          task: 'generation',
          systemPrompt: 'sys',
          userPrompt: 'user',
          maxTokens: 64,
        });
        expect(attemptCount).toBe(2);
        expect(result.text).toBe('Success after retry');
      } finally {
        server.close();
      }
    });
    it('retries on 503 service unavailable and succeeds on second attempt', async () => {
      let attemptCount = 0;
      const server = setupServer(
        http.post('https://api.anthropic.com/v1/messages', () => {
          attemptCount += 1;
          if (attemptCount === 1) {
            return HttpResponse.json(
              { error: { type: 'service_unavailable', message: 'Unavailable' } },
              { status: 503 },
            );
          }
          return HttpResponse.json({
            type: 'message',
            model: 'claude-sonnet-4-6',
            content: [{ type: 'text', text: 'Success after retry' }],
            usage: { input_tokens: 10, output_tokens: 5 },
          });
        }),
      );
      server.listen();
      try {
        const client = createClaudeClient({
          config: createTestConfig(),
        });
        const result = await client.complete({
          task: 'generation',
          systemPrompt: 'sys',
          userPrompt: 'user',
          maxTokens: 64,
        });
        expect(attemptCount).toBe(2);
        expect(result.text).toBe('Success after retry');
      } finally {
        server.close();
      }
    });
    it('retries up to 4 times (1 initial + 3 retries) before throwing', async () => {
      let attemptCount = 0;
      const server = setupServer(
        http.post('https://api.anthropic.com/v1/messages', () => {
          attemptCount += 1;
          return HttpResponse.json(
            { error: { type: 'internal_server_error', message: 'Still failing' } },
            { status: 500 },
          );
        }),
      );
      server.listen();
      try {
        const client = createClaudeClient({
          config: createTestConfig({ AI_MAX_RETRIES: 3 }),
        });
        await expect(
          client.complete({
            task: 'generation',
            systemPrompt: 'sys',
            userPrompt: 'user',
            maxTokens: 64,
          }),
        ).rejects.toThrow('Still failing');
        expect(attemptCount).toBe(4);
      } finally {
        server.close();
      }
    });
    it('clamps retry count to 3 even when config says higher', async () => {
      let attemptCount = 0;
      const server = setupServer(
        http.post('https://api.anthropic.com/v1/messages', () => {
          attemptCount += 1;
          return HttpResponse.json(
            { error: { type: 'internal_server_error', message: 'Always failing' } },
            { status: 500 },
          );
        }),
      );

      server.listen();
      try {
        const client = createClaudeClient({
          config: createTestConfig({ AI_MAX_RETRIES: 5 }),
        });
        await expect(
          client.complete({
            task: 'generation',
            systemPrompt: 'sys',
            userPrompt: 'user',
            maxTokens: 64,
          }),
        ).rejects.toThrow('Always failing');
        expect(attemptCount).toBe(4);
      } finally {
        server.close();
      }
    });
    it('uses exponential backoff between retries', async () => {
      let attemptCount = 0;
      const sleepCalls: number[] = [];
      const sleepMock = vi.fn().mockImplementation(async (ms: number) => {
        sleepCalls.push(ms);
      });
      const server = setupServer(
        http.post('https://api.anthropic.com/v1/messages', () => {
          attemptCount += 1;
          if (attemptCount < 4) {
            return HttpResponse.json(
              { error: { type: 'internal_server_error', message: 'Failing' } },
              { status: 500 },
            );
          }
          return HttpResponse.json({
            type: 'message',
            model: 'claude-sonnet-4-6',
            content: [{ type: 'text', text: 'Success' }],
            usage: { input_tokens: 10, output_tokens: 5 },
          });
        }),
      );
      server.listen();
      try {
        const client = createClaudeClient({
          config: createTestConfig({ AI_RETRY_DELAY_MS: 100 }),
          sleep: sleepMock,
        });
        const result = await client.complete({
          task: 'generation',
          systemPrompt: 'sys',
          userPrompt: 'user',
          maxTokens: 64,
        });
        expect(result.text).toBe('Success');
        expect(sleepCalls).toEqual([200, 400]);
      } finally {
        server.close();
      }
    });
    it('throws when API key is not configured', async () => {
      const client = createClaudeClient({
        config: createTestConfig({ ANTHROPIC_API_KEY: '' }),
      });
      await expect(
        client.complete({
          task: 'generation',
          systemPrompt: 'sys',
          userPrompt: 'user',
          maxTokens: 64,
        }),
      ).rejects.toThrow('Anthropic API key is not configured');
    });
    it('throws when request fails after all retries with last error', async () => {
      const server = setupServer(
        http.post('https://api.anthropic.com/v1/messages', () => {
          return HttpResponse.json(
            { error: { type: 'authentication_error', message: 'Invalid API key' } },
            { status: 401 },
          );
        }),
      );
      server.listen();
      try {
        const client = createClaudeClient({
          config: createTestConfig(),
        });
        await expect(
          client.complete({
            task: 'generation',
            systemPrompt: 'sys',
            userPrompt: 'user',
            maxTokens: 64,
          }),
        ).rejects.toThrow('Invalid API key');
      } finally {
        server.close();
      }
    });
    it('respects explicit model override', async () => {
      let capturedModel: string | null = null;
      const server = setupServer(
        http.post('https://api.anthropic.com/v1/messages', async ({ request }) => {
          const body = (await request.json()) as { model: string };
          capturedModel = body.model;
          return HttpResponse.json({
            type: 'message',
            model: 'claude-sonnet-4-6',
            content: [{ type: 'text', text: 'Hi' }],
            usage: { input_tokens: 5, output_tokens: 3 },
          });
        }),
      );
      server.listen();
      try {
        const client = createClaudeClient({
          config: createTestConfig({ AI_GENERATION_MODEL: 'sonnet' }),
        });
        await client.complete({
          task: 'generation',
          systemPrompt: 'sys',
          userPrompt: 'user',
          maxTokens: 64,
          model: 'claude-opus-4-6',
        });

        expect(capturedModel).toBe('claude-opus-4-6');
      } finally {
        server.close();
      }
    });
  });
});
