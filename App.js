import * as React from 'react';
import { Alert, TouchableOpacity, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, useAuth } from './context/AuthContext';
import { CarritoProvider, useCarrito } from './context/CarritoContext';
import { PedidoProvider, usePedido } from './context/PedidoContext';
import { cancelarAvisos, alTocarAviso } from './services/notificaciones';

import LoginScreen from './screens/LoginScreen';
import RegistroScreen from './screens/RegistroScreen';
import ClaveAdminScreen from './screens/ClaveAdminScreen';
import BienvenidaScreen from './screens/BienvenidaScreen';
import HomeScreen from './screens/HomeScreen';
import CarritoScreen from './screens/carrito';
import DetalleProducto from './screens/DetalleProducto';
import PrepararCompra from './screens/prepararCompra';
import SeguimientoPedido from './screens/SeguimientoPedido';
import PanelAdminScreen from './screens/PanelAdminScreen';
import DrawerMenu from './navigation/DrawerMenu';

const Stack = createNativeStackNavigator();

function Navegacion() {
  const { usuario, esAdmin, cerrarSesion } = useAuth();
  const { vaciarCarrito } = useCarrito();
  const { pedidoActual, limpiarPedido } = usePedido();
  const [menuVisible, setMenuVisible] = React.useState(false);
  const navigationRef = React.useRef(null);

  const salir = () => {
    setMenuVisible(false);
    Alert.alert('Cerrar sesión', '¿Querés salir de tu cuenta? Se vacía el carrito.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: () => {
          vaciarCarrito();
          limpiarPedido();
          cancelarAvisos();
          cerrarSesion();
        },
      },
    ]);
  };

  // Si la persona toca una notificación del pedido, se abre el seguimiento
  React.useEffect(() => {
    if (usuario == null) return undefined;
    const suscripcion = alTocarAviso(() => {
      if (navigationRef.current && navigationRef.current.isReady()) {
        navigationRef.current.navigate('Seguimiento');
      }
    });
    return () => suscripcion.remove();
  }, [usuario]);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator>
        {usuario == null ? (
          // Pantallas para quien todavía no inició sesión
          <Stack.Group>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Registro" component={RegistroScreen} options={{ title: 'Crear cuenta' }} />
            <Stack.Screen name="ClaveAdmin" component={ClaveAdminScreen} options={{ title: 'Verificación' }} />
          </Stack.Group>
        ) : (
          // Pantallas de la app (con el botón ☰ del menú lateral)
          <Stack.Group
            screenOptions={{
              headerRight: () => (
                <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ paddingHorizontal: 8 }}>
                  <Text style={{ fontSize: 24 }}>☰</Text>
                </TouchableOpacity>
              ),
            }}
          >
            <Stack.Screen name="Bienvenida" component={BienvenidaScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Inicio" component={HomeScreen} />
            <Stack.Screen name="Carrito" component={CarritoScreen} />
            <Stack.Screen
              name="DetalleProducto"
              component={DetalleProducto}
              options={({ route }) => ({ title: route.params.producto.nombre })}
            />
            <Stack.Screen name="PrepararCompra" component={PrepararCompra} options={{ title: 'Preparar compra' }} />
            <Stack.Screen name="Seguimiento" component={SeguimientoPedido} options={{ title: 'Seguimiento del pedido' }} />
            <Stack.Screen name="PanelAdmin" component={PanelAdminScreen} options={{ title: 'Panel de administración' }} />
          </Stack.Group>
        )}
      </Stack.Navigator>

      {usuario != null && (
        <DrawerMenu
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          onNavigate={(pantalla) => {
            setMenuVisible(false);
            navigationRef.current?.navigate(pantalla);
          }}
          usuario={usuario}
          esAdmin={esAdmin}
          hayPedido={pedidoActual != null}
          onLogout={salir}
        />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CarritoProvider>
        <PedidoProvider>
          <Navegacion />
        </PedidoProvider>
      </CarritoProvider>
    </AuthProvider>
  );
}
