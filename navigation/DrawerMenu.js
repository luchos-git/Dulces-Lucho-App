// explicación del archivo: arma el menú lateral que permite moverse entre las secciones y cerrar sesión
import React, { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity, TouchableWithoutFeedback, View, Text, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.72;

// arma el menú que se abre desde el botón lateral de la cabecera
export default function DrawerMenu({ visible, onClose, onNavigate, usuario, esAdmin, hayPedido, onLogout }) {
  const translateX = useRef(new Animated.Value(DRAWER_WIDTH)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : DRAWER_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: visible ? 'rgba(0,0,0,0.4)' : 'transparent' }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Menú</Text>
          {usuario && (
            <Text style={styles.headerSub} numberOfLines={1}>
              {usuario.nombre}
              {esAdmin ? ' · Administrador' : ''}
            </Text>
          )}
        </View>

        <TouchableOpacity style={styles.item} onPress={() => onNavigate('Inicio')}>
          <Text style={styles.itemText}>Inicio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item} onPress={() => onNavigate('Carrito')}>
          <Text style={styles.itemText}>Carrito</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item} onPress={() => onNavigate('MisPedidos')}><Text style={styles.itemText}>Mis pedidos</Text></TouchableOpacity>
        <TouchableOpacity style={styles.item} onPress={() => onNavigate('Perfil')}><Text style={styles.itemText}>Mi perfil</Text></TouchableOpacity>
        <TouchableOpacity style={styles.item} onPress={() => onNavigate('Configuracion')}><Text style={styles.itemText}>Configuración</Text></TouchableOpacity>
        {esAdmin && (
          <TouchableOpacity style={styles.item} onPress={() => onNavigate('PanelAdmin')}>
            <Text style={styles.itemText}>Panel de administración</Text>
          </TouchableOpacity>
        )}

        <View style={styles.espacio} />

        <TouchableOpacity style={styles.itemSalir} onPress={onLogout}>
          <Text style={styles.itemSalirText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: { position: 'absolute', right: 0, top: 0, bottom: 0, width: DRAWER_WIDTH, backgroundColor: '#fff', elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6 },
  header: { padding: 20, backgroundColor: '#007bff' },
  headerText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: '#e3f2fd', marginTop: 4 },
  item: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemText: { fontSize: 16 },
  espacio: { flex: 1 },
  itemSalir: { padding: 16, borderTopWidth: 1, borderTopColor: '#eee' },
  itemSalirText: { fontSize: 16, color: '#e57373', fontWeight: 'bold' },
});
