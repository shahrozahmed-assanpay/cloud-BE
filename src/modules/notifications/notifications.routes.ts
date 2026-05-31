import { Hono } from 'hono'

import { zodValidator } from '../../lib/validators'
import { requireAuth } from '../../middleware/auth'
import type { AppEnv } from '../../types/auth'
import {
  createBulkNotifications,
  getUnreadCount,
  listForUser,
  markAllRead,
  markRead,
} from './notifications.service'
import {
  listNotificationsQuerySchema,
  testNotificationBodySchema,
} from './notifications.schemas'
import type {
  ListNotificationsQuery,
  TestNotificationBody,
} from './notifications.schemas'

export const notificationRoutes = new Hono<AppEnv>()

// POST /api/notifications/test — public, no auth (dev/testing only)
notificationRoutes.post(
  '/test',
  zodValidator('json', testNotificationBodySchema),
  async (c) => {
    const { userId, type, title, body } = c.req.valid(
      'json' as never,
    ) as TestNotificationBody
    const defaultTitle = title ?? `[Test] ${type}`
    const defaultBody =
      body ?? `This is a manual test notification of type "${type}".`

    const [notification] = await createBulkNotifications(
      [{ userId, type, title: defaultTitle, body: defaultBody }],
      c.env.NOTIFICATION_HUB,
    )

    return c.json({ ok: true, notification }, 201)
  },
)

notificationRoutes.use('*', requireAuth)

// GET /api/notifications — paginated list
notificationRoutes.get(
  '/',
  zodValidator('query', listNotificationsQuerySchema),
  async (c) => {
    const auth = c.get('auth')
    const query = c.req.valid('query' as never) as ListNotificationsQuery
    const result = await listForUser(auth.userId, query)
    return c.json(result)
  },
)

// GET /api/notifications/unread-count
notificationRoutes.get('/unread-count', async (c) => {
  const auth = c.get('auth')
  const count = await getUnreadCount(auth.userId)
  return c.json({ count })
})

// PATCH /api/notifications/read-all
notificationRoutes.patch('/read-all', async (c) => {
  const auth = c.get('auth')
  const result = await markAllRead(auth.userId)
  return c.json(result)
})

// PATCH /api/notifications/:id/read
notificationRoutes.patch('/:id/read', async (c) => {
  const auth = c.get('auth')
  const id = c.req.param('id')
  const result = await markRead(auth.userId, id)
  return c.json(result)
})

// GET /api/notifications/stream — SSE
notificationRoutes.get('/stream', (c) => {
  const auth = c.get('auth')
  const hub = c.env.NOTIFICATION_HUB.getByName(auth.userId)
  return hub.fetch(c.req.raw)
})
