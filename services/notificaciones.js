import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Son notificaciones LOCALES: las programa el propio celular, sin servidor.
// Funcionan en Expo Go. Las notificaciones push reales (que manda un servidor
// cuando el repartidor se acerca) necesitan un servidor y un "development build".

const CANAL = 'pedidos';

// Cómo se muestran los avisos cuando la app está abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Pide permiso para mandar avisos. Devuelve true si se puede avisar.
export async function pedirPermisoNotificaciones() {
  try {
    if (Platform.OS === 'android') {
      // En Android hace falta un canal para que aparezca el pedido de permiso
      await Notifications.setNotificationChannelAsync(CANAL, {
        name: 'Estado del pedido',
        importance: Notifications.AndroidImportance.MAX,
      });
    }
    const actual = await Notifications.getPermissionsAsync();
    if (actual.granted) return true;
    const pedido = await Notifications.requestPermissionsAsync();
    return pedido.granted;
  } catch (e) {
    return false;
  }
}

// Programa un aviso por cada etapa que tenga "aviso" (ver data/seguimiento.js)
export async function programarAvisos(pasos) {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    for (const paso of pasos) {
      if (!paso.aviso) continue;
      await Notifications.scheduleNotificationAsync({
        content: { title: paso.aviso.titulo, body: paso.aviso.cuerpo, sound: true },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.max(1, paso.desdeSeg),
          channelId: CANAL,
        },
      });
    }
    return true;
  } catch (e) {
    return false;
  }
}

export async function cancelarAvisos() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    // si falla, no pasa nada: los avisos que queden no rompen la app
  }
}

// Avisa cuando la persona toca una notificación (para abrir el seguimiento)
export function alTocarAviso(callback) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
