export interface DispatchNotificationParams {
  recipientId: string;
  type: string; // e.g., NotificationType string
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}

export interface NotificationDispatcher {
  dispatch(params: DispatchNotificationParams): Promise<void>;
}
