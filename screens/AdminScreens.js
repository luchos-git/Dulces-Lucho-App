import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useProductos } from '../context/ProductosContext';

export default function AdminScreen() {
  const { agregarProducto } = useProductos();
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [precio, setPrecio] = useState('');

  const handleAgregar = async () => {
    if (!nombre.trim() || !categoria.trim() || !precio.trim()) {
      Alert.alert('Faltan datos', 'Completá nombre, categoría y precio.');
      return;
    }
    const precioNumero = Number(precio);
    if (isNaN(precioNumero) || precioNumero <= 0) {
      Alert.alert('Precio inválido', 'Ingresá un número mayor a 0.');
      return;
    }

    const nuevo = await agregarProducto({ nombre: nombre.trim(), categoria: categoria.trim(), precio: precioNumero });
    Alert.alert('Producto agregado', `"${nuevo.nombre}" se agregó con el ID ${nuevo.id}.`);
    setNombre('');
    setCategoria('');
    setPrecio('');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container}>
        <Text style={styles.titulo}>Agregar producto</Text>

        <Text style={styles.label}>Nombre</Text>
        <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholder="Ej: Alfajor de dulce de leche" />

        <Text style={styles.label}>Categoría</Text>
        <TextInput style={styles.input} value={categoria} onChangeText={setCategoria} placeholder="Ej: Alfajores" />

        <Text style={styles.label}>Precio</Text>
        <TextInput style={styles.input} value={precio} onChangeText={setPrecio} placeholder="Ej: 1500" keyboardType="numeric" />

        <TouchableOpacity style={styles.boton} onPress={handleAgregar}>
          <Text style={styles.botonTexto}>Agregar producto</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E1', padding: 20 },
  titulo: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 14, color: '#555', marginBottom: 4, marginTop: 12 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#ddd' },
  boton: { backgroundColor: '#007bff', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  botonTexto: { color: '#fff', fontWeight: 'bold' },
});