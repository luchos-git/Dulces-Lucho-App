import ScrollView from '../components/GlobalRefreshScrollView';
import { ThemedText as Text } from '../context/ThemeContext';
// Menú de configuración con accesos funcionales para clientes y administradores.
import { createThemedStyles, useAppTheme } from '../context/ThemeContext';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

function Opcion({ icono, titulo, detalle, onPress }) {
  return (
    <TouchableOpacity style={styles.opcion} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.icono}>{icono}</Text>
      <View style={styles.textosOpcion}>
        <Text style={styles.tituloOpcion}>{titulo}</Text>
        {!!detalle && <Text style={styles.detalleOpcion}>{detalle}</Text>}
      </View>
      <Text style={styles.flecha}>›</Text>
    </TouchableOpacity>
  );
}

export default function ConfiguracionScreen({ navigation }) {
  const { usuario, esAdmin, esPropietario, puede } = useAuth();
  const { themeName, cambiarTema } = useAppTheme();
  const irCuenta = (seccion) => navigation.navigate('ConfiguracionCuenta', { seccion });

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={[styles.contenido, { paddingBottom: 128 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
      <View style={styles.encabezado}>
        <Text style={styles.titulo}>Configuración</Text>
        <Text style={styles.subtitulo}>Hola, {usuario?.nombre || 'usuario'}.</Text>
        <Text style={styles.descripcion}>Administrá tu cuenta y las opciones de Dulces Lucho.</Text>
      </View>

      <Text style={styles.seccion}>Apariencia</Text>
      <View style={styles.aparienciaGrupo}>
        <Text style={styles.aparienciaTitulo}>Elegí cómo querés ver Dulces Lucho</Text>
        <Text style={styles.aparienciaDetalle}>El cambio se guarda en este dispositivo y se aplica a las pantallas de clientes y administración.</Text>
        <View style={styles.temasFila}>
          {[
            { id: 'claro', nombre: 'Claro cálido', muestra: '#FFF8E1' },
            { id: 'tibio', nombre: 'Tibio', muestra: '#E8D4BF' },
            { id: 'oscuro', nombre: 'Oscuro', muestra: '#24211E' },
          ].map((tema) => (
            <TouchableOpacity
              key={tema.id}
              accessibilityRole="button"
              accessibilityState={{ selected: themeName === tema.id }}
              style={[styles.temaOpcion, themeName === tema.id && styles.temaOpcionActiva]}
              onPress={() => cambiarTema(tema.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.muestraTema, { backgroundColor: tema.muestra }]} />
              <Text style={[styles.temaTexto, themeName === tema.id && styles.temaTextoActivo]}>{tema.nombre}</Text>
              {themeName === tema.id && <Text style={styles.temaSeleccionado}>✓ Seleccionado</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.seccion}>Mi cuenta</Text>
      <View style={styles.grupo}>
        <Opcion icono="👤" titulo="Mi perfil" detalle="Editar tu nombre, teléfono y foto" onPress={() => navigation.navigate('Perfil')} />
        <Opcion icono="📦" titulo="Mis pedidos" detalle="Ver el seguimiento y el historial" onPress={() => navigation.navigate('MisPedidos')} />
        <Opcion icono="🧾" titulo="Facturas y comprobantes" detalle="Consultar los resúmenes de compra" onPress={() => navigation.navigate('Facturas')} />
      </View>

      <Text style={styles.seccion}>Preferencias</Text>
      <View style={styles.grupo}>
        <Opcion icono="💳" titulo="Métodos de pago" detalle="Elegir tu medio de pago preferido" onPress={() => irCuenta('pago')} />
        <Opcion icono="📍" titulo="Dirección de entrega" detalle="Guardar tu dirección habitual" onPress={() => irCuenta('direccion')} />
        <Opcion icono="🔔" titulo="Notificaciones" detalle="Activar o desactivar avisos de pedidos" onPress={() => irCuenta('notificaciones')} />
        <Opcion icono="✉️" titulo="Cambiar Gmail" detalle="Verificá tu identidad antes de actualizar el correo" onPress={() => navigation.navigate('ProteccionCuenta', { tipoCambio: 'email' })} />
        <Opcion icono="🔒" titulo="Cambiar contraseña" detalle="Verificá tu identidad antes de actualizar la contraseña" onPress={() => navigation.navigate('ProteccionCuenta', { tipoCambio: 'password' })} />
      </View>

      {esAdmin && (
        <>
          <Text style={styles.seccion}>Administración</Text>
          <View style={styles.grupo}>
            {(esPropietario || puede('gestionar_productos')) && <>
              <Opcion icono="🛠️" titulo="Panel de administración" detalle="Agregar y administrar productos" onPress={() => navigation.navigate('PanelAdmin')} />
              <Opcion icono="🍬" titulo="Productos y catálogo" detalle="Editar, publicar u ocultar productos" onPress={() => navigation.navigate('PanelAdmin')} />
            </>}
            {(esPropietario || puede('gestionar_banners')) && <Opcion icono="🖼️" titulo="Banners del inicio" detalle="Subir imágenes y ordenar el carrusel" onPress={() => navigation.navigate('BannersAdmin')} />}
            {(esPropietario || puede('gestionar_usuarios') || puede('gestionar_empleados')) && <Opcion icono="👥" titulo="Gestión de usuarios" detalle={esPropietario ? 'Administrar clientes y empleados' : puede('gestionar_empleados') ? 'Administrar empleados autorizados' : 'Administrar clientes autorizados'} onPress={() => navigation.navigate('AdminUsuarios')} />}
            {(esPropietario || puede('gestionar_pedidos')) && <Opcion icono="🧾" titulo="Pedidos y ventas" detalle="Ver compras y actualizar su estado" onPress={() => navigation.navigate('AdminVentas')} />}
            {(esPropietario || puede('ver_reportes')) && <Opcion icono="📊" titulo="Reportes y estadísticas" detalle="Consultar ventas, pedidos y productos" onPress={() => navigation.navigate('AdminReportes')} />}
            {(esPropietario || puede('configurar_tienda')) && <Opcion icono="🏪" titulo="Configuración de la tienda" detalle="Editar datos, envíos y medios de pago" onPress={() => navigation.navigate('AdminTienda')} />}
            {(esPropietario || puede('gestionar_insumos') || puede('solicitar_compras') || puede('gestionar_productos')) && <Opcion icono="📦" titulo="Stock y proveedores" detalle="Elegir productos del día, controlar existencias y solicitar reposiciones" onPress={() => navigation.navigate('AdminStock')} />}
            {esPropietario && <Opcion icono="🛡️" titulo="Permisos de empleados" detalle="Elegir qué puede hacer cada cuenta administradora" onPress={() => navigation.navigate('AdminPermisos')} />}
            {!esPropietario && !(puede('gestionar_productos') || puede('gestionar_banners') || puede('gestionar_usuarios') || puede('gestionar_empleados') || puede('gestionar_pedidos') || puede('ver_reportes') || puede('configurar_tienda') || puede('gestionar_insumos') || puede('solicitar_compras')) && <Text style={styles.sinPermisos}>Tu cuenta de empleado todavía no tiene módulos asignados. La cuenta principal de Dulces Lucho debe habilitarlos.</Text>}
          </View>
        </>
      )}

      <Text style={styles.seccion}>Información</Text>
      <View style={styles.grupo}>
        <Opcion icono="ℹ️" titulo="Acerca de Dulces Lucho" detalle="Datos de contacto, horarios y condiciones" onPress={() => navigation.navigate('DatosTienda')} />
        <Opcion icono="❓" titulo="Ayuda y soporte" detalle="Consejos para realizar una compra" onPress={() => navigation.navigate('Ayuda')} />
      </View>
    </ScrollView>
  );
}

const styles = createThemedStyles({
  contenedor: { flex: 1, backgroundColor: '#FFF8E1' }, contenido: { padding: 16, paddingBottom: 30 },
  encabezado: { backgroundColor: '#FFE0B2', borderRadius: 14, padding: 18, marginBottom: 18 },
  titulo: { fontSize: 23, fontWeight: 'bold', color: '#38240D' }, subtitulo: { fontSize: 15, fontWeight: '600', color: '#80500F', marginTop: 6 },
  descripcion: { color: '#765F43', marginTop: 4, lineHeight: 19 }, seccion: { fontSize: 16, fontWeight: 'bold', color: '#80500F', marginTop: 12, marginBottom: 8 },
  grupo: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, overflow: 'hidden', marginBottom: 8 },
  opcion: { minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3EBDD' },
  icono: { width: 38, fontSize: 21, textAlign: 'center', marginRight: 8 }, textosOpcion: { flex: 1 },
  sinPermisos: { color: '#806B4E', fontSize: 12, lineHeight: 18, paddingVertical: 14 },
  tituloOpcion: { color: '#35230E', fontSize: 14, fontWeight: '600' }, detalleOpcion: { color: '#888', fontSize: 11, marginTop: 3 }, flecha: { fontSize: 25, color: '#B17B32', paddingHorizontal: 7 },
  aparienciaGrupo: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8 },
  aparienciaTitulo: { color: '#35230E', fontSize: 14, fontWeight: '700' },
  aparienciaDetalle: { color: '#806B4E', fontSize: 11, lineHeight: 16, marginTop: 4, marginBottom: 12 },
  temasFila: { flexDirection: 'row', gap: 8 },
  temaOpcion: { flex: 1, borderWidth: 1, borderColor: '#E8D9C2', borderRadius: 10, padding: 9, alignItems: 'center', minHeight: 86 },
  temaOpcionActiva: { borderColor: '#A86616', borderWidth: 2, backgroundColor: '#FFF0D8' },
  muestraTema: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: '#D6C6B2', marginBottom: 7 },
  temaTexto: { color: '#493116', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  temaTextoActivo: { color: '#80500F', fontWeight: '800' },
  temaSeleccionado: { color: '#A86616', fontSize: 9, fontWeight: '700', marginTop: 4 },
});
