/** Tag única: notificações com a mesma tag substituem a anterior (sem empilhar) */
const NOTIFICATION_TAG = 'miplace-despesas';

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
    // try/catch: navegadores podem lançar (ex.: chamada fora de gesto do usuário)
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (err) {
      console.warn('Erro ao solicitar permissão de notificação:', err);
      return false;
    }
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
        tag: NOTIFICATION_TAG,
        ...options
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, {
            icon: './favicon.svg',
            badge: './favicon.svg',
            tag: NOTIFICATION_TAG,
            ...options
          });
        }
      }).catch(err => {
        console.warn('Erro ao solicitar permissão de notificação:', err);
      });
    }
  } catch (err) {
    console.warn('Erro ao disparar notificação nativa:', err);
  }
};
