// explicación del archivo: reúne las opciones de la cuenta y muestra más herramientas cuando la sesión es de administrador
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

function Opcion({ icono, titulo, detalle, onPress, deshabilitada = false }) {
  return (
    <TouchableOpacity
      style={[styles.opcion, deshabilitada && styles.opcionDeshabilitada]}
      onPress={onPress}
      disabled={deshabilitada}
      activeOpacity={0.75}
    >
      <Text style={styles.icono}>{icono}</Text>
      <View style={styles.textosOpcion}>
        <Text style={styles.tituloOpcion}>{titulo}</Text>
        {!!detalle && <Text style={styles.detalleOpcion}>{detalle}</Text>}
      </View>
      <Text style={styles.flecha}>{deshabilitada ? '·' : '›'}</Text>
    </TouchableOpacity>
  );
}

export default function ConfiguracionScreen({ navigation }) {
  const { usuario, esAdmin } = useAuth();

  const avisar = (titulo, mensaje) => Alert.alert(titulo, mensaje);

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={styles.contenido}>
      <View style={styles.encabezado}>
        <Text style={styles.titulo}>Configuración</Text>
        <Text style={styles.subtitulo}>Hola, {usuario?.nombre || 'usuario'}.</Text>
        <Text style={styles.descripcion}>Administrá las opciones de tu cuenta y de la aplicación.</Text>
      </View>

      <Text style={styles.seccion}>Mi cuenta</Text>
      <View style={styles.grupo}>
        <Opcion icono="👤" titulo="Mi perfil" detalle="Consultar los datos de tu cuenta" onPress={() => navigation.navigate('Perfil')} />
        <Opcion icono="📦" titulo="Mis pedidos" detalle="Ver el seguimiento y el historial" onPress={() => navigation.navigate('MisPedidos')} />
        <Opcion icono="🧾" titulo="Facturas y comprobantes" detalle="Consultar los resúmenes de compra" onPress={() => navigation.navigate('Facturas')} />
      </View>

      <Text style={styles.seccion}>Preferencias</Text>
      <View style={styles.grupo}>
        <Opcion
          icono="💳"
          titulo="Métodos de pago"
          detalle="Información sobre los medios disponibles"
          onPress={() => avisar('Métodos de pago', 'Los medios de pago se seleccionan al preparar cada compra. Esta versión no guarda tarjetas ni datos de pago en el perfil.')}
        />
        <Opcion
          icono="📍"
          titulo="Dirección de entrega"
          detalle="La dirección se carga al preparar un pedido"
          onPress={() => avisar('Dirección de entrega', 'En esta versión la dirección se ingresa durante la preparación de cada compra y no queda guardada como dirección predeterminada.')}
        />
        <Opcion
          icono="🔔"
          titulo="Notificaciones"
          detalle="Avisos sobre el estado de los pedidos"
          onPress={() => avisar('Notificaciones', 'Dulces Lucho puede solicitar permiso para enviarte avisos durante el seguimiento de un pedido. La configuración avanzada de notificaciones todavía no está disponible.')}
        />
        <Opcion
          icono="🔒"
          titulo="Privacidad y seguridad"
          detalle="Información sobre el acceso a tu cuenta"
          onPress={() => avisar('Privacidad y seguridad', 'Las contraseñas se guardan cifradas en el servidor. La edición de contraseña, el cierre de sesiones en otros dispositivos y la autenticación con tokens todavía no están implementados.')}
        />
      </View>

      {esAdmin && (
        <>
          <Text style={styles.seccion}>Administración</Text>
          <View style={styles.grupo}>
            <Opcion icono="🛠️" titulo="Panel de administración" detalle="Agregar y administrar productos" onPress={() => navigation.navigate('PanelAdmin')} />
            <Opcion icono="🍬" titulo="Productos y catálogo" detalle="Editar, publicar u ocultar productos" onPress={() => navigation.navigate('PanelAdmin')} />
            <Opcion
              icono="👥"
              titulo="Gestión de usuarios"
              detalle="Todavía no hay una pantalla conectada"
              onPress={() => avisar('Gestión de usuarios', 'La API actual no tiene rutas para listar, editar o desactivar cuentas. Esta opción queda pendiente de implementar en el backend.')}
            />
            <Opcion
              icono="🧾"
              titulo="Pedidos y ventas"
              detalle="Todavía no hay gestión centralizada"
              onPress={() => avisar('Pedidos y ventas', 'Los pedidos de esta versión se guardan en el dispositivo. Para administrarlos desde todas las cuentas hace falta conectar las tablas de ventas y sus rutas al backend.')}
            />
            <Opcion
              icono="📊"
              titulo="Reportes y estadísticas"
              detalle="Función pendiente de conectar a MySQL"
              onPress={() => avisar('Reportes y estadísticas', 'Los reportes todavía no están implementados. Se necesitan consultas de ventas, productos y períodos desde el backend.')}
            />
            <Opcion
              icono="🏪"
              titulo="Configuración de la tienda"
              detalle="Datos generales y condiciones de venta"
              onPress={() => avisar('Configuración de la tienda', 'La edición del nombre, los datos de contacto y las condiciones de la tienda todavía no está conectada a una tabla de configuración.')}
            />
          </View>
        </>
      )}

      <Text style={styles.seccion}>Información</Text>
      <View style={styles.grupo}>
        <Opcion
          icono="ℹ️"
          titulo="Acerca de Dulces Lucho"
          detalle="Versión y datos de la aplicación"
          onPress={() => avisar('Dulces Lucho', 'Aplicación de catálogo y pedidos de Dulces Lucho. Está desarrollada con React Native y Expo, y se puede probar desde Expo Go.')}
        />
        <Opcion
          icono="❓"
          titulo="Ayuda y soporte"
          detalle="Información sobre el funcionamiento"
          onPress={() => avisar('Ayuda y soporte', 'Para realizar una compra, elegí un producto, agregalo al carrito o usá Comprar ahora. Después completá la entrega y seleccioná un medio de pago.')}
        />
      </View>

      <Text style={styles.nota}>
        Las opciones que todavía no están conectadas al servidor se identifican en su descripción y explican qué parte falta implementar.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#FFF8E1' },
  contenido: { padding: 16, paddingBottom: 30 },
  encabezado: { backgroundColor: '#FFE0B2', borderRadius: 14, padding: 18, marginBottom: 18 },
  titulo: { fontSize: 23, fontWeight: 'bold', color: '#38240D' },
  subtitulo: { fontSize: 15, fontWeight: '600', color: '#80500F', marginTop: 6 },
  descripcion: { color: '#765F43', marginTop: 4, lineHeight: 19 },
  seccion: { fontSize: 16, fontWeight: 'bold', color: '#80500F', marginTop: 12, marginBottom: 8 },
  grupo: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, overflow: 'hidden', marginBottom: 8 },
  opcion: { minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3EBDD' },
  opcionDeshabilitada: { opacity: 0.55 },
  icono: { width: 38, fontSize: 21, textAlign: 'center', marginRight: 8 },
  textosOpcion: { flex: 1 },
  tituloOpcion: { color: '#35230E', fontSize: 14, fontWeight: '600' },
  detalleOpcion: { color: '#888', fontSize: 11, marginTop: 3 },
  flecha: { fontSize: 25, color: '#B17B32', paddingHorizontal: 7 },
  nota: { color: '#8A785D', fontSize: 11, lineHeight: 16, marginTop: 12, marginBottom: 12 },
});
