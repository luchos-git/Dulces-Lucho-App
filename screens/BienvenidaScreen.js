import { ThemedText as Text } from '../context/ThemeContext';
// explicación del archivo: muestra el saludo inicial después de ingresar y diferencia el mensaje de clientes y administradores
import { createThemedStyles } from '../context/ThemeContext';
import React from 'react';
import { View, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function BienvenidaScreen({ navigation }) {
  // toma el nombre y el rol para adaptar el saludo de bienvenida
  const { usuario, esAdmin } = useAuth();

  // muestra el logo, el mensaje correspondiente al rol y el acceso al catálogo
  return (
    <View style={styles.container}>
      <Image source={require('../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />

      {esAdmin && (
        <View style={styles.etiqueta}>
          <Text style={styles.etiquetaTexto}>ADMINISTRADOR</Text>
        </View>
      )}

      <Text style={styles.titulo}>¡Te damos la bienvenida{usuario ? `, ${usuario.nombre}` : ''}!</Text>
      <Text style={styles.texto}>
        {esAdmin
          ? 'Ingresaste como administrador. Desde el menú ☰ podés acceder al panel de administración.'
          : 'Estamos felices de tenerte en Dulces Lucho. Mirá nuestras bolsitas de obleas Smacks con alfajor y los jugos Baggio.'}
      </Text>

      <TouchableOpacity style={styles.boton} onPress={() => navigation.replace('Inicio')}>
        <Text style={styles.botonTexto}>Ver los productos</Text>
      </TouchableOpacity>
    </View>
  );
}

// estilos de la pantalla de bienvenida
const styles = createThemedStyles({
  container: { flex: 1, backgroundColor: '#FFF8E1', justifyContent: 'center', alignItems: 'center', padding: 24 },
  logo: { width: 230, height: 168 },
  etiqueta: { backgroundColor: '#c77b00', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginTop: 8 },
  etiquetaTexto: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  titulo: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginTop: 14 },
  texto: { textAlign: 'center', color: '#555', marginTop: 10, marginBottom: 28 },
  boton: { backgroundColor: '#007bff', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 8 },
  botonTexto: { color: '#fff', fontWeight: 'bold' },
});
