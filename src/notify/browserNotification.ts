export type PermissionState = 'unsupported' | NotificationPermission

export function notificationState(): PermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

/** Must originate from a user gesture on some browsers, so this is called from
 *  the same click handler that unlocks audio. */
export async function requestNotificationPermission(): Promise<PermissionState> {
  if (notificationState() === 'unsupported') return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export function showNotification(title: string, body: string): void {
  if (notificationState() !== 'granted') return
  try {
    const n = new Notification(title, { body, tag: 'rwya-reminder', silent: true })
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {
    // Some browsers throw here unless a service worker registration is used.
    // Non-fatal: the chime, voice, and overlay still deliver the reminder.
  }
}
