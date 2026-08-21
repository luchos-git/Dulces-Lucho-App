import React, { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity, TouchableWithoutFeedback, View, Text, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.72;

export default function DrawerMenu({ visible, onClose, onNavigate }) {
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
          <Text style={styles.headerText}>Menú Nuevo</Text>
        </View>
        <TouchableOpacity style={styles.item} onPress={() => onNavigate('Inicio')}>
          <Text style={styles.itemText}>Inicio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item} onPress={() => onNavigate('Carrito')}>
          <Text style={styles.itemText}>Carrito</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item} onPress={() => onNavigate('Admin')}>
        <Text style={styles.itemText}>Admin</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: { position: 'absolute', right: 0, top: 0, bottom: 0, width: DRAWER_WIDTH, backgroundColor: '#fff', elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6 },
  header: { padding: 20, backgroundColor: '#007bff' },
  headerText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  item: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemText: { fontSize: 16 },
});