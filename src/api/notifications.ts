import type { RequestOptions } from '../http.js';
import { AwtrixValidationError } from '../errors.js';
import type { OkResponse } from '../types/common.js';
import type { NotificationPayload } from '../types/payload.js';
import { assertNonEmptyString, assertSound, segment } from '../validation.js';
import { ApiModule } from './base.js';

/** One-shot messages that interrupt the rotation. */
export class NotificationsApi extends ApiModule {
  /**
   * `POST /api/v1/notifications` - queues a notification. Rejects with `507` when the queue
   * is full.
   */
  async send(notification: NotificationPayload, options?: RequestOptions): Promise<OkResponse> {
    if (typeof notification !== 'object' || notification === null || Array.isArray(notification)) {
      throw new AwtrixValidationError('notification', 'must be an object (send one notification per call)');
    }
    if (notification.name === 'active') {
      throw new AwtrixValidationError('name', '"active" is reserved and could never be dismissed by name');
    }
    const sound = (notification as { sound?: unknown }).sound;
    if (sound !== undefined && sound !== null && sound !== '') {
      assertSound(sound, 'sound', { station: false, nextBar: false });
    }
    return this.ok({ method: 'POST', path: '/api/v1/notifications', json: notification, options });
  }

  /** `DELETE /api/v1/notifications/active` - dismisses the notification on screen (if any). */
  async dismiss(options?: RequestOptions): Promise<OkResponse> {
    return this.ok({ method: 'DELETE', path: '/api/v1/notifications/active', options });
  }

  /**
   * `DELETE /api/v1/notifications/{name}` - dismisses the notification sent with this `name`,
   * wherever it sits in the queue. Rejects with `404` when none carries the name.
   */
  async dismissByName(name: string, options?: RequestOptions): Promise<OkResponse> {
    assertNonEmptyString(name, 'name');
    if (name === 'active') {
      throw new AwtrixValidationError('name', '"active" is reserved; use dismiss() for the current notification');
    }
    return this.ok({ method: 'DELETE', path: `/api/v1/notifications/${segment(name)}`, options });
  }
}
