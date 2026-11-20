// explicación del archivo: contiene una navegación alternativa de ejemplo que no es la navegación activa de esta versión
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import HomeScreen from '../screens/HomeScreen';
import CarritoScreen from '../screens/carrito';
import MenuLateral from '../screens/menu';

const Drawer = createDrawerNavigator();

export default function AppNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{ drawerPosition: 'right' }}
      drawerContent={(props) => <MenuLateral {...props} />}
    >
      <Drawer.Screen name="Inicio" component={HomeScreen} />
      <Drawer.Screen name="Carrito" component={CarritoScreen} />
    </Drawer.Navigator>
  );
}