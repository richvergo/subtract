import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { LLMService } from '@/lib/llm-service';

// Mock fetch
global.fetch = jest.fn();

describe('LLMService', () => {
  let llmService: LLMService;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    llmService = new LLMService({ apiKey: mockApiKey });
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('annotateWorkflow', () => {
    it('should annotate workflow steps with intents', async () => {
      const recordedSteps = [
        { action: 'goto', url: 'https://example.com' },
        { action: 'click', selector: '#login-btn' },
        { action: 'type', selector: '#email', value: 'test@example.com' },
      ];

      const userPrompt = 'Login to the application';
      const context = 'This is a login workflow';

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify([
                {
                  action: 'goto',
                  intent: 'Navigate to the login page to access the application',
                  stepIndex: 0,
                },
                {
                  action: 'click',
                  selector: '#login-btn',
                  intent: 'Click the login button to authenticate into the system',
                  stepIndex: 1,
                },
                {
                  action: 'type',
                  selector: '#email',
                  intent: 'Enter email address in the login form',
                  stepIndex: 2,
                },
              ])
            }
          }]
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await llmService.annotateWorkflow(recordedSteps, userPrompt, context);

      expect(result).toHaveLength(3);
      expect(result[0].intent).toBe('Navigate to the login page to access the application');
      expect(result[1].intent).toBe('Click the login button to authenticate into the system');
      expect(result[2].intent).toBe('Enter email address in the login form');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mockApiKey}`,
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('Login to the application'),
        })
      );
    });

    it('should handle LLM API errors', async () => {
      const recordedSteps = [{ action: 'goto', url: 'https://example.com' }];
      const userPrompt = 'Test prompt';

      const mockResponse = {
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('Unauthorized'),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(llmService.annotateWorkflow(recordedSteps, userPrompt))
        .rejects.toThrow('LLM API error: 401 Unauthorized');
    });

    it('should handle invalid JSON response', async () => {
      const recordedSteps = [{ action: 'goto', url: 'https://example.com' }];
      const userPrompt = 'Test prompt';

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Invalid JSON response'
            }
          }]
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(llmService.annotateWorkflow(recordedSteps, userPrompt))
        .rejects.toThrow('Invalid JSON response from LLM');
    });

    it('should validate and fix annotations', async () => {
      const recordedSteps = [
        { action: 'goto', url: 'https://example.com' },
        { action: 'click', selector: '#login-btn' },
      ];

      const userPrompt = 'Test prompt';

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify([
                {
                  action: 'wrong-action', // Wrong action
                  selector: '#wrong-selector', // Wrong selector
                  intent: 'Navigate to the login page to access the application',
                  stepIndex: 0,
                },
                {
                  action: 'click',
                  selector: '#wrong-selector', // Wrong selector
                  intent: 'Click the login button to authenticate into the system',
                  stepIndex: 1,
                },
              ])
            }
          }]
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await llmService.annotateWorkflow(recordedSteps, userPrompt);

      expect(result[0].action).toBe('goto'); // Should be corrected
      expect(result[0].selector).toBeUndefined(); // Should be removed since goto doesn't have selector
      expect(result[1].action).toBe('click'); // Should be correct
      expect(result[1].selector).toBe('#login-btn'); // Should be corrected
    });
  });

  describe('repairSelector', () => {
    it('should repair a failed selector', async () => {
      const failedSelector = '#login-btn';
      const intent = 'Click the login button to authenticate into the system';
      const domSnapshot = '<html><body><button data-testid="login-button">Login</button></body></html>';
      const actionType = 'click';

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                selector: 'button[data-testid="login-button"]',
                confidence: 0.9,
                reasoning: 'Found a button with data-testid="login-button" that appears to be the login button based on the intent and DOM structure'
              })
            }
          }]
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await llmService.repairSelector(failedSelector, intent, domSnapshot, actionType);

      expect(result.selector).toBe('button[data-testid="login-button"]');
      expect(result.confidence).toBe(0.9);
      expect(result.reasoning).toContain('Found a button with data-testid');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(failedSelector),
        })
      );
    });

    it('should handle repair API errors', async () => {
      const failedSelector = '#login-btn';
      const intent = 'Click the login button';
      const domSnapshot = '<html></html>';
      const actionType = 'click';

      const mockResponse = {
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal Server Error'),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(llmService.repairSelector(failedSelector, intent, domSnapshot, actionType))
        .rejects.toThrow('LLM API error: 500 Internal Server Error');
    });

    it('should handle invalid repair response', async () => {
      const failedSelector = '#login-btn';
      const intent = 'Click the login button';
      const domSnapshot = '<html></html>';
      const actionType = 'click';

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Invalid JSON response'
            }
          }]
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(llmService.repairSelector(failedSelector, intent, domSnapshot, actionType))
        .rejects.toThrow('Invalid JSON response from LLM');
    });

    it('should provide default values for missing fields', async () => {
      const failedSelector = '#login-btn';
      const intent = 'Click the login button';
      const domSnapshot = '<html></html>';
      const actionType = 'click';

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                selector: 'button[data-testid="login-button"]',
                // Missing confidence and reasoning
              })
            }
          }]
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await llmService.repairSelector(failedSelector, intent, domSnapshot, actionType);

      expect(result.selector).toBe('button[data-testid="login-button"]');
      expect(result.confidence).toBe(0.5); // Default value
      expect(result.reasoning).toBe('No reasoning provided'); // Default value
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration', () => {
      const customService = new LLMService({
        apiKey: 'custom-key',
        model: 'gpt-4',
        baseUrl: 'https://custom-api.com/v1',
      });

      expect((customService as any).config.apiKey).toBe('custom-key');
      expect((customService as any).config.model).toBe('gpt-4');
      expect((customService as any).config.baseUrl).toBe('https://custom-api.com/v1');
    });

    it('should use environment variables as defaults', () => {
      process.env.OPENAI_API_KEY = 'env-key';
      
      const defaultService = new LLMService();
      
      expect((defaultService as any).config.apiKey).toBe('env-key');
      expect((defaultService as any).config.model).toBe('gpt-4o-mini');
      expect((defaultService as any).config.baseUrl).toBe('https://api.openai.com/v1');
    });

    it('should throw error when no API key is provided', async () => {
      const serviceWithoutKey = new LLMService({ apiKey: undefined });
      
      await expect(serviceWithoutKey.annotateWorkflow([], 'test'))
        .rejects.toThrow('LLM API key not configured');
    });
  });
});
