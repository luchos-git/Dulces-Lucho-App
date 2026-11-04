import * as React from 'react';
import { Alert, TouchableOpacity, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, useAuth } from './context/AuthContext';
import { CarritoProvider, useCarrito } from './context/CarritoContext';

import LoginScreen from './screens/LoginScreen';
import RegistroScreen from './screens/RegistroScreen';
import ClaveAdminScreen from './screens/ClaveAdminScreen';
import BienvenidaScreen from './screens/BienvenidaScreen';
import HomeScreen from './screens/HomeScreen';
import CarritoScreen from './screens/carrito';
import DetalleProducto from './screens/DetalleProducto';
import PrepararCompra from './screens/prepararCompra';
import PanelAdminScreen from './screens/PanelAdminScreen';
import DrawerMenu from './navigation/DrawerMenu';

const Stack = createNativeStackNavigator();

function Navegacion() {
  const { usuario, esAdmin, cerrarSesion } = useAuth();
  const { vaciarCarrito } = useCarrito();
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
          cerrarSesion();
        },
      },
    ]);
  };

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
        <Navegacion />
      </CarritoProvider>
    </AuthProvider>
  );
}
