// Contenedor compartido: permite actualizar la pantalla al deslizar hacia abajo.
// Si la pantalla ya tiene una consulta propia, puede pasar onRefresh o refreshControl.
import React, { forwardRef, useCallback, useRef, useState } from 'react';
import { RefreshControl, ScrollView as NativeScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

const GlobalRefreshScrollView = forwardRef(function GlobalRefreshScrollView({
  horizontal = false,
  refreshControl,
  onRefresh,
  refreshEnabled = true,
  ...props
}, ref) {
  const navigation = useNavigation();
  const route = useRoute();
  const [refreshing, setRefreshing] = useState(false);
  const running = useRef(false);

  const actualizar = useCallback(async () => {
    if (horizontal || !refreshEnabled || running.current) return;
    running.current = true;
    setRefreshing(true);
    if (typeof onRefresh === 'function') {
      try {
        await onRefresh();
      } catch (error) {
        console.warn('No se pudo actualizar la pantalla:', error?.message || error);
      } finally {
        running.current = false;
        setRefreshing(false);
      }
      return;
    }

    if (route?.name && typeof navigation?.replace === 'function') {
      // Reinicia la pantalla actual y vuelve a ejecutar sus consultas iniciales.
      // Los parámetros (por ejemplo, el producto abierto) se conservan.
      navigation.replace(route.name, route.params);
      return;
    }

    running.current = false;
    setRefreshing(false);
  }, [horizontal, refreshEnabled, onRefresh, navigation, route?.name, route?.params]);

  const control = refreshControl || (!horizontal && refreshEnabled ? (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={actualizar}
      colors={['#A86616']}
      tintColor="#A86616"
      title="Actualizando..."
      titleColor="#8A785D"
    />
  ) : undefined);

  return (
    <NativeScrollView
      ref={ref}
      {...props}
      horizontal={horizontal}
      refreshControl={control}
      bounces={props.bounces ?? !horizontal}
      alwaysBounceVertical={props.alwaysBounceVertical ?? !horizontal}
      overScrollMode={props.overScrollMode ?? (horizontal ? 'never' : 'always')}
    />
  );
});

export default GlobalRefreshScrollView;
