import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function PanelAdminScreen() {
  const { usuario, esAdmin } = useAuth();

  if (!esAdmin) {
    return (
      <View style={styles.container}>
        <Text style={styles.texto}>Esta sección es solo para administradores.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Panel de administración</Text>
      <Text style={styles.texto}>Sesión iniciada como {usuario.nombre} ({usuario.email}).</Text>

      <View style={styles.caja}>
        <Text style={styles.cajaTitulo}>Próximamente</Text>
        <Text style={styles.texto}>• Agregar productos nuevos (con ID automático)</Text>
        <Text style={styles.texto}>• Ver y gestionar pedidos</Text>
        <Text style={styles.texto}>• Administrar cupones</Text>
        <Text style={styles.nota}>
          Estas funciones necesitan guardar datos (backend), que por ahora está pausado por indicación del profesor.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E1', padding: 20 },
  titulo: { fontSize: 22, fontWeight: 'bold', marginBottom: 6 },
  texto: { color: '#555', marginBottom: 4 },
  caja: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginTop: 16 },
  cajaTitulo: { fontWeight: 'bold', marginBottom: 8 },
  nota: { color: '#888', fontSize: 12, marginTop: 10 },
});
