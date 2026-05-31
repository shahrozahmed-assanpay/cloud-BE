import { DurableObject } from 'cloudflare:workers'

export type NotificationStreamEvent = {
  id: string
  type: string
  title: string
  body: string
  caseId: string | null
  commentId: string | null
  actorId: string | null
  actorName: string | null
  metadata: Record<string, unknown> | null
  isRead: boolean
  createdAt: string
}

type SseClient = {
  controller: ReadableStreamDefaultController<Uint8Array>
  heartbeat: ReturnType<typeof setInterval>
}

const encoder = new TextEncoder()
const NOTIFICATION_STREAM_HEARTBEAT_MS = 25_000

function formatSseMessage(message: {
  event: 'notification' | 'ping' | 'ready'
  data: string
  id?: string
}) {
  const lines = [`event: ${message.event}`]
  if (message.id) lines.push(`id: ${message.id}`)
  for (const line of message.data.split(/\r?\n/)) {
    lines.push(`data: ${line}`)
  }
  return `${lines.join('\n')}\n\n`
}

export class NotificationHub extends DurableObject {
  private clients = new Set<SseClient>()

  fetch(request: Request): Response {
    let activeClient: SseClient | null = null

    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        const client: SseClient = {
          controller,
          heartbeat: setInterval(() => {
            this.sendToClient(client, {
              event: 'ping',
              data: String(Date.now()),
            })
          }, NOTIFICATION_STREAM_HEARTBEAT_MS),
        }

        activeClient = client
        this.clients.add(client)
        this.sendToClient(client, { event: 'ready', data: 'ok' })

        request.signal.addEventListener(
          'abort',
          () => {
            this.removeClient(client)
          },
          { once: true },
        )
      },
      cancel: () => {
        if (activeClient) this.removeClient(activeClient)
      },
    })

    return new Response(stream, {
      headers: {
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Content-Encoding': 'Identity',
        'Content-Type': 'text/event-stream; charset=utf-8',
        'X-Accel-Buffering': 'no',
      },
    })
  }

  async publish(event: NotificationStreamEvent): Promise<void> {
    const message = {
      event: 'notification' as const,
      data: JSON.stringify(event),
      id: event.id,
    }

    for (const client of this.clients) {
      this.sendToClient(client, message)
    }
  }

  private sendToClient(
    client: SseClient,
    message: Parameters<typeof formatSseMessage>[0],
  ) {
    try {
      client.controller.enqueue(encoder.encode(formatSseMessage(message)))
    } catch {
      this.removeClient(client)
    }
  }

  private removeClient(client: SseClient) {
    if (!this.clients.delete(client)) return
    clearInterval(client.heartbeat)
    try {
      client.controller.close()
    } catch {
      // The runtime may have already closed the stream.
    }
  }
}

export async function publish(
  hub: DurableObjectNamespace | undefined,
  userId: string,
  event: NotificationStreamEvent,
): Promise<void> {
  if (!hub) return
  const stub = hub.getByName(userId) as unknown as {
    publish(event: NotificationStreamEvent): Promise<void>
  }
  await stub.publish(event)
}
