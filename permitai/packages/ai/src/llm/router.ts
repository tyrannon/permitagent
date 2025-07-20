import { Anthropic } from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { Ollama } from 'ollama';

export interface LLMRequest {
  prompt: string;
  model?: 'claude-3-haiku' | 'claude-3-sonnet' | 'gpt-4o' | 'gpt-3.5-turbo' | 'llama3-70b';
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export class LLMRouter {
  private anthropic: Anthropic;
  private openai: OpenAI;
  private ollama: Ollama;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!
    });
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    });
    
    this.ollama = new Ollama({
      host: process.env.OLLAMA_HOST || 'http://localhost:11434'
    });
  }

  async complete(request: LLMRequest): Promise<string> {
    const model = request.model || 'claude-3-haiku';
    
    switch (model) {
      case 'claude-3-haiku':
      case 'claude-3-sonnet':
        return this.completeWithClaude(request);
      
      case 'gpt-4o':
      case 'gpt-3.5-turbo':
        return this.completeWithOpenAI(request);
      
      case 'llama3-70b':
        return this.completeWithOllama(request);
      
      default:
        throw new Error(`Unsupported model: ${model}`);
    }
  }

  private async completeWithClaude(request: LLMRequest): Promise<string> {
    const response = await this.anthropic.messages.create({
      model: request.model === 'claude-3-sonnet' ? 'claude-3-sonnet-20240229' : 'claude-3-haiku-20240307',
      max_tokens: request.maxTokens || 1000,
      temperature: request.temperature || 0.7,
      system: request.systemPrompt,
      messages: [{ role: 'user', content: request.prompt }]
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  private async completeWithOpenAI(request: LLMRequest): Promise<string> {
    const messages: any[] = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });

    const response = await this.openai.chat.completions.create({
      model: request.model === 'gpt-4o' ? 'gpt-4-turbo-preview' : 'gpt-3.5-turbo',
      messages,
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 1000
    });

    return response.choices[0]?.message?.content || '';
  }

  private async completeWithOllama(request: LLMRequest): Promise<string> {
    const response = await this.ollama.chat({
      model: 'llama3:70b',
      messages: [
        ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
        { role: 'user', content: request.prompt }
      ],
      options: {
        temperature: request.temperature || 0.7,
        num_predict: request.maxTokens || 1000
      }
    });

    return response.message.content;
  }
}