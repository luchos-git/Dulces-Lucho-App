// explicación del archivo: archivo principal de la aplicación móvil donde se conectan los contextos, las pantallas y la navegación
// expo llega a este archivo desde index.js y usa react navigation, no la plantilla expo router que quedó dentro de src
import * as React from 'react';
import { Alert, TouchableOpacity } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, useAuth } from './context/AuthContext';
import { CarritoProvider } from './context/CarritoContext';
import { PedidoProvider, usePedido } from './context/PedidoContext';
import { ProductosProvider } from './context/ProductosContext';
import { ThemeProvider, useAppTheme, withThemeRefresh, ThemedText as Text } from './context/ThemeContext';
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
import AdminStockScreen from './screens/AdminStockScreen';
import PedidoAgotadoScreen from './screens/PedidoAgotadoScreen';
import DatosTiendaScreen from './screens/DatosTiendaScreen';
import AyudaScreen from './screens/AyudaScreen';
import FacturasScreen from './screens/FacturasScreen';
import DrawerMenu from './navigation/DrawerMenu';

const Stack = createNativeStackNavigator();

// Las pantallas se suscriben al tema global para refrescar sus estilos al cambiar la apariencia.
const PantallaLogin = withThemeRefresh(LoginScreen);
const PantallaRegistro = withThemeRefresh(RegistroScreen);
const PantallaClaveAdmin = withThemeRefresh(ClaveAdminScreen);
const PantallaBienvenida = withThemeRefresh(BienvenidaScreen);
const PantallaInicio = withThemeRefresh(HomeScreen);
const PantallaCarrito = withThemeRefresh(CarritoScreen);
const PantallaDetalleProducto = withThemeRefresh(DetalleProducto);
const PantallaPrepararCompra = withThemeRefresh(PrepararCompra);
const PantallaSeguimiento = withThemeRefresh(SeguimientoPedido);
const PantallaHistorial = withThemeRefresh(HistorialPedidosScreen);
const PantallaPanelAdmin = withThemeRefresh(PanelAdminScreen);
const PantallaPerfil = withThemeRefresh(PerfilScreen);
const PantallaConfiguracion = withThemeRefresh(ConfiguracionScreen);
const PantallaBannersAdmin = withThemeRefresh(BannersAdminScreen);
const PantallaConfiguracionCuenta = withThemeRefresh(ConfiguracionCuentaScreen);
const PantallaProteccionCuenta = withThemeRefresh(ProteccionCuentaScreen);
const PantallaCambiarCredenciales = withThemeRefresh(CambiarCredencialesScreen);
const PantallaAdminUsuarios = withThemeRefresh(AdminUsuariosScreen);
const PantallaAdminVentas = withThemeRefresh(AdminVentasScreen);
const PantallaAdminReportes = withThemeRefresh(AdminReportesScreen);
const PantallaAdminTienda = withThemeRefresh(AdminTiendaScreen);
const PantallaAdminPermisos = withThemeRefresh(AdminPermisosScreen);
const PantallaAdminStock = withThemeRefresh(AdminStockScreen);
const PantallaPedidoAgotado = withThemeRefresh(PedidoAgotadoScreen);
const PantallaDatosTienda = withThemeRefresh(DatosTiendaScreen);
const PantallaAyuda = withThemeRefresh(AyudaScreen);
const PantallaFacturas = withThemeRefresh(FacturasScreen);

function Navegacion() {
  const { usuario, esAdmin, esPropietario, puede, cerrarSesion } = useAuth();
  const { themeName, colors } = useAppTheme();
  const temaNavegacion = {
    ...(themeName === 'oscuro' ? DarkTheme : DefaultTheme),
    dark: themeName === 'oscuro',
    colors: {
      ...(themeName === 'oscuro' ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary, background: colors.background, card: colors.header,
      text: colors.text, border: colors.border, notification: colors.primary,
    },
  };
  const { pedidoActual, limpiarPedido } = usePedido();
  const [menuVisible, setMenuVisible] = React.useState(false);
  const navigationRef = React.useRef(null);

  const salir = () => {
    setMenuVisible(false);
    Alert.alert('Cerrar sesión', '¿Querés salir de tu cuenta? Tu carrito quedará guardado para cuando vuelvas a iniciar sesión.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: () => {
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
    <NavigationContainer ref={navigationRef} theme={temaNavegacion}>
      <Stack.Navigator screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
      }}>
        {usuario == null ? (
          // Pantallas para quien todavía no inició sesión
          <Stack.Group>
            <Stack.Screen name="Login" component={PantallaLogin} options={{ headerShown: false }} />
            <Stack.Screen name="Registro" component={PantallaRegistro} options={{ title: 'Crear cuenta' }} />
            <Stack.Screen name="ClaveAdmin" component={PantallaClaveAdmin} options={{ title: 'Verificación' }} />
          </Stack.Group>
        ) : (
          // Pantallas de la app (con el botón ☰ del menú lateral)
          <Stack.Group
            screenOptions={{
              headerRight: () => (
                <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ paddingHorizontal: 8 }}>
                  <Text style={{ fontSize: 24, color: colors.text }}>☰</Text>
                </TouchableOpacity>
              ),
            }}
          >
            <Stack.Screen name="Bienvenida" component={PantallaBienvenida} options={{ headerShown: false }} />
            <Stack.Screen name="Inicio" component={PantallaInicio} />
            <Stack.Screen name="Carrito" component={PantallaCarrito} />
            <Stack.Screen name="PedidoAgotado" component={PantallaPedidoAgotado} options={{ title: 'Realizar pedido' }} />
            <Stack.Screen
              name="DetalleProducto"
              component={PantallaDetalleProducto}
              options={({ route }) => ({ title: route.params.producto.nombre })}
            />
            <Stack.Screen name="PrepararCompra" component={PantallaPrepararCompra} options={{ title: 'Preparar compra' }} />
            <Stack.Screen name="Seguimiento" component={PantallaSeguimiento} options={{ title: 'Seguimiento del pedido' }} />
            <Stack.Screen name="MisPedidos" component={PantallaHistorial} options={{ title: 'Mis pedidos' }} />
            <Stack.Screen name="PanelAdmin" component={PantallaPanelAdmin} options={{ title: 'Panel de administración' }} />
            <Stack.Screen name="Perfil" component={PantallaPerfil} options={{ title: 'Mi perfil' }} />
            <Stack.Screen name="Configuracion" component={PantallaConfiguracion} options={{ title: 'Configuración' }} />
            <Stack.Screen name="BannersAdmin" component={PantallaBannersAdmin} options={{ title: 'Banners del inicio' }} />
            <Stack.Screen name="ProteccionCuenta" component={PantallaProteccionCuenta} options={{ title: 'Protección de cuenta' }} />
            <Stack.Screen name="CambiarCredenciales" component={PantallaCambiarCredenciales} options={({ route }) => ({ title: route.params?.tipoCambio === 'email' ? 'Cambiar Gmail' : route.params?.tipoCambio === 'password' ? 'Cambiar contraseña' : 'Cambiar datos de acceso' })} />
            <Stack.Screen name="ConfiguracionCuenta" component={PantallaConfiguracionCuenta} options={({ route }) => ({ title: ({ pago: 'Métodos de pago', direccion: 'Dirección de entrega', notificaciones: 'Notificaciones', seguridad: 'Privacidad y seguridad' }[route.params?.seccion] || 'Mi configuración') })} />
            <Stack.Screen name="AdminUsuarios" component={PantallaAdminUsuarios} options={{ title: 'Gestión de usuarios' }} />
            <Stack.Screen name="AdminVentas" component={PantallaAdminVentas} options={{ title: 'Pedidos y ventas' }} />
            <Stack.Screen name="AdminReportes" component={PantallaAdminReportes} options={{ title: 'Reportes y estadísticas' }} />
            <Stack.Screen name="AdminTienda" component={PantallaAdminTienda} options={{ title: 'Configuración de la tienda' }} />
            <Stack.Screen name="AdminPermisos" component={PantallaAdminPermisos} options={{ title: 'Permisos de empleados' }} />
            <Stack.Screen name="AdminStock" component={PantallaAdminStock} options={{ title: 'Stock y proveedores' }} />
            <Stack.Screen name="DatosTienda" component={PantallaDatosTienda} options={{ title: 'Acerca de Dulces Lucho' }} />
            <Stack.Screen name="Ayuda" component={PantallaAyuda} options={{ title: 'Ayuda y soporte' }} />
            <Stack.Screen name="Facturas" component={PantallaFacturas} options={{ title: 'Facturas y comprobantes' }} />
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
    <ThemeProvider>
    <AuthProvider>
      <ProductosProvider>
      <CarritoProvider>
        <PedidoProvider>
          <Navegacion />
        </PedidoProvider>
      </CarritoProvider>
      </ProductosProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}
