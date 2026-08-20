/**
 * Solicita permissão para notificações nativas do sistema operacional / navegador
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

/**
 * Dispara uma notificação nativa do SO
 */
export const showNativeNotification = (title: string, options?: NotificationOptions): void => {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: './favicon.svg',
        badge: './favicon.svg',
        ...options
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, {
            icon: './favicon.svg',
            badge: './favicon.svg',
            ...options
          });
        }
      });
    }
  } catch (err) {
    console.warn('Erro ao disparar notificação nativa:', err);
  }
};
