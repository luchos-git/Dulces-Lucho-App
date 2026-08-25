import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity, Text } from 'react-native';
import HomeScreen from './screens/HomeScreen';
import CarritoScreen from './screens/carrito';
import DetalleProducto from './screens/DetalleProducto';
import DrawerMenu from './navigation/DrawerMenu';
import { CarritoProvider } from './context/CarritoContext';

const Stack = createNativeStackNavigator();

export default function App() {
  const [menuVisible, setMenuVisible] = React.useState(false);
  const navigationRef = React.useRef(null);

  return (
    <CarritoProvider>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          screenOptions={{
            headerRight: () => (
              <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ paddingHorizontal: 8 }}>
                <Text style={{ fontSize: 24 }}>☰</Text>
              </TouchableOpacity>
            ),
          }}
        >
          <Stack.Screen name="Inicio" component={HomeScreen} />
          <Stack.Screen name="Carrito" component={CarritoScreen} />
          <Stack.Screen
            name="DetalleProducto"
            component={DetalleProducto}
            options={({ route }) => ({ title: route.params.producto.nombre })}
          />
        </Stack.Navigator>

        <DrawerMenu
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          onNavigate={(screen) => {
            setMenuVisible(false);
            navigationRef.current?.navigate(screen);
          }}
        />
      </NavigationContainer>
    </CarritoProvider>
  );
}