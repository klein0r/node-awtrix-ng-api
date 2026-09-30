import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface RecordedRequest {
  method: string;
  url: string;
  path: string;
  query: URLSearchParams;
  headers: IncomingMessage['headers'];
  body: Buffer;
  text: string;
  /** Parsed JSON body, or `undefined` when the body is not JSON. */
  json: unknown;
}

export interface MockReply {
  status?: number;
  body?: unknown;
  /** Sent verbatim instead of JSON-encoding `body`. */
  raw?: string | Buffer;
  headers?: Record<string, string>;
  /** Delay before answering, in ms. */
  delayMs?: number;
}

export type Handler = (req: RecordedRequest) => MockReply | Promise<MockReply>;

/** A tiny HTTP server that records requests and answers from a queue of handlers. */
export class MockAwtrix {
  readonly requests: RecordedRequest[] = [];
  private readonly handlers: Handler[] = [];
  private fallback: Handler = () => ({ status: 200, body: { ok: true } });
  private server?: Server;

  get host(): string {
    const address = this.server?.address() as AddressInfo;
    return `127.0.0.1:${address.port}`;
  }

  get last(): RecordedRequest {
    const req = this.requests.at(-1);
    if (!req) throw new Error('no request recorded');
    return req;
  }

  /** Queues a one-shot reply (FIFO). */
  reply(handler: Handler | MockReply): this {
    this.handlers.push(typeof handler === 'function' ? handler : () => handler);
    return this;
  }

  /** Reply used when the queue is empty. */
  replyAlways(handler: Handler | MockReply): this {
    this.fallback = typeof handler === 'function' ? handler : () => handler;
    return this;
  }

  reset(): void {
    this.requests.length = 0;
    this.handlers.length = 0;
    this.fallback = () => ({ status: 200, body: { ok: true } });
  }

  async start(): Promise<void> {
    this.server = createServer((req, res) => void this.handle(req, res));
    await new Promise<void>((resolve) => this.server!.listen(0, '127.0.0.1', resolve));
  }

  async stop(): Promise<void> {
    this.server?.closeAllConnections();
    await new Promise<void>((resolve) => this.server?.close(() => resolve()));
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = Buffer.concat(chunks);
    const url = new URL(req.url ?? '/', 'http://localhost');
    const text = body.toString('utf8');
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = undefined;
    }
    const recorded: RecordedRequest = {
      method: req.method ?? 'GET',
      url: req.url ?? '/',
      path: url.pathname,
      query: url.searchParams,
      headers: req.headers,
      body,
      text,
      json,
    };
    this.requests.push(recorded);

    const handler = this.handlers.shift() ?? this.fallback;
    const reply = await handler(recorded);
    if (reply.delayMs) await new Promise((r) => setTimeout(r, reply.delayMs));
    if (res.destroyed) return;

    const headers: Record<string, string> = { ...reply.headers };
    let payload: string | Buffer = '';
    if (reply.raw !== undefined) {
      payload = reply.raw;
    } else if (reply.body !== undefined) {
      payload = JSON.stringify(reply.body);
      headers['Content-Type'] ??= 'application/json';
    }
    res.writeHead(reply.status ?? 200, headers);
    res.end(payload);
  }
}
