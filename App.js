// explicación del archivo: archivo principal de la aplicación móvil donde se conectan los contextos, las pantallas y la navegación
// expo llega a este archivo desde index.js y usa react navigation, no la plantilla expo router que quedó dentro de src
import * as React from 'react';
import { Alert, TouchableOpacity, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, useAuth } from './context/AuthContext';
import { CarritoProvider, useCarrito } from './context/CarritoContext';
import { PedidoProvider, usePedido } from './context/PedidoContext';
import { ProductosProvider } from './context/ProductosContext';
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
import HistorialPedidosScreen from './screens/HistorialPedidosScreen';
import PanelAdminScreen from './screens/PanelAdminScreen';
import PerfilScreen from './screens/PerfilScreen';
import ConfiguracionScreen from './screens/ConfiguracionScreen';
import BannersAdminScreen from './screens/BannersAdminScreen';
import ConfiguracionCuentaScreen from './screens/ConfiguracionCuentaScreen';
import ProteccionCuentaScreen from './screens/ProteccionCuentaScreen';
import CambiarCredencialesScreen from './screens/CambiarCredencialesScreen';
import AdminUsuariosScreen from './screens/AdminUsuariosScreen';
import AdminVentasScreen from './screens/AdminVentasScreen';
import AdminReportesScreen from './screens/AdminReportesScreen';
import AdminTiendaScreen from './screens/AdminTiendaScreen';
import AdminPermisosScreen from './screens/AdminPermisosScreen';
import AdminInsumosScreen from './screens/AdminInsumosScreen';
import DatosTiendaScreen from './screens/DatosTiendaScreen';
import AyudaScreen from './screens/AyudaScreen';
import FacturasScreen from './screens/FacturasScreen';
import DrawerMenu from './navigation/DrawerMenu';

const Stack = createNativeStackNavigator();

function Navegacion() {
  const { usuario, esAdmin, esPropietario, puede, cerrarSesion } = useAuth();
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
            <Stack.Screen name="MisPedidos" component={HistorialPedidosScreen} options={{ title: 'Mis pedidos' }} />
            <Stack.Screen name="PanelAdmin" component={PanelAdminScreen} options={{ title: 'Panel de administración' }} />
            <Stack.Screen name="Perfil" component={PerfilScreen} options={{ title: 'Mi perfil' }} />
            <Stack.Screen name="Configuracion" component={ConfiguracionScreen} options={{ title: 'Configuración' }} />
            <Stack.Screen name="BannersAdmin" component={BannersAdminScreen} options={{ title: 'Banners del inicio' }} />
            <Stack.Screen name="ProteccionCuenta" component={ProteccionCuentaScreen} options={{ title: 'Protección de cuenta' }} />
            <Stack.Screen name="CambiarCredenciales" component={CambiarCredencialesScreen} options={({ route }) => ({ title: route.params?.tipoCambio === 'email' ? 'Cambiar Gmail' : route.params?.tipoCambio === 'password' ? 'Cambiar contraseña' : 'Cambiar datos de acceso' })} />
            <Stack.Screen name="ConfiguracionCuenta" component={ConfiguracionCuentaScreen} options={({ route }) => ({ title: ({ pago: 'Métodos de pago', direccion: 'Dirección de entrega', notificaciones: 'Notificaciones', seguridad: 'Privacidad y seguridad' }[route.params?.seccion] || 'Mi configuración') })} />
            <Stack.Screen name="AdminUsuarios" component={AdminUsuariosScreen} options={{ title: 'Gestión de usuarios' }} />
            <Stack.Screen name="AdminVentas" component={AdminVentasScreen} options={{ title: 'Pedidos y ventas' }} />
            <Stack.Screen name="AdminReportes" component={AdminReportesScreen} options={{ title: 'Reportes y estadísticas' }} />
            <Stack.Screen name="AdminTienda" component={AdminTiendaScreen} options={{ title: 'Configuración de la tienda' }} />
            <Stack.Screen name="AdminPermisos" component={AdminPermisosScreen} options={{ title: 'Permisos de empleados' }} />
            <Stack.Screen name="AdminInsumos" component={AdminInsumosScreen} options={{ title: 'Inventario y compras grandes' }} />
            <Stack.Screen name="DatosTienda" component={DatosTiendaScreen} options={{ title: 'Acerca de Dulces Lucho' }} />
            <Stack.Screen name="Ayuda" component={AyudaScreen} options={{ title: 'Ayuda y soporte' }} />
            <Stack.Screen name="Facturas" component={FacturasScreen} options={{ title: 'Facturas y comprobantes' }} />
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
          esPropietario={esPropietario}
          puede={puede}
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
      <ProductosProvider>
      <CarritoProvider>
        <PedidoProvider>
          <Navegacion />
        </PedidoProvider>
      </CarritoProvider>
      </ProductosProvider>
    </AuthProvider>
  );
}
