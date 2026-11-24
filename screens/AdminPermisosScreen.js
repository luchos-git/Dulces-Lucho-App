// Solo la cuenta principal puede delegar permisos a otras cuentas administradoras.
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const PERMISOS = [
  ['gestionar_productos', 'Productos y categorías'],
  ['gestionar_pedidos', 'Pedidos y ventas'],
  ['ver_reportes', 'Reportes y estadísticas'],
  ['gestionar_usuarios', 'Administrar clientes'],
  ['gestionar_empleados', 'Habilitar o pausar empleados administradores'],
  ['gestionar_banners', 'Banners del inicio'],
  ['configurar_tienda', 'Configuración de la tienda'],
  ['gestionar_insumos', 'Administrar stock de productos y proveedores'],
  ['solicitar_compras', 'Solicitar reposiciones y pedidos grandes a proveedores'],
];

export default function AdminPermisosScreen() {
  const { usuario, esPropietario } = useAuth();
  const [empleados, setEmpleados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(null);

  const cargar = useCallback(async () => {
    try { setEmpleados(await api('/owner/empleados')); }
    catch (e) { Alert.alert('No se pudieron cargar empleados', e.message); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const alternar = (empleadoId, codigo, activo) => {
    setEmpleados((lista) => lista.map((e) => e.id === empleadoId ? {
      ...e, permisos: activo ? [...new Set([...(e.permisos || []), codigo])] : (e.permisos || []).filter((p) => p !== codigo),
    } : e));
  };

  const guardar = async (empleado) => {
    setGuardando(empleado.id);
    try {
      await api(`/owner/empleados/${empleado.id}/permisos`, {
        method: 'PUT', body: JSON.stringify({ permisos: empleado.permisos || [] }),
      });
      Alert.alert('Permisos guardados', `Se actualizaron los permisos de ${empleado.nombre}.`);
    } catch (e) {
      Alert.alert('No se pudieron guardar los permisos', e.message);
      cargar();
    } finally { setGuardando(null); }
  };

  if (!esPropietario) return <View style={styles.centrado}><Text style={styles.titulo}>Acceso exclusivo</Text><Text style={styles.ayuda}>Solo la cuenta principal puede asignar permisos al personal.</Text></View>;
  if (cargando) return <View style={styles.centrado}><ActivityIndicator size="large" color="#A86616" /><Text style={styles.ayuda}>Cargando empleados...</Text></View>;

  return (
    <ScrollView style={styles.fondo} contentContainerStyle={styles.contenido}>
      <View style={styles.aviso}><Text style={styles.avisoTitulo}>Cuenta principal</Text><Text style={styles.ayuda}>Hola {usuario?.nombre}. Solo vos podés decidir qué módulos puede usar cada empleado administrador. Un empleado sin permisos no puede ejecutar acciones administrativas.</Text></View>
      {empleados.length === 0 ? <View style={styles.tarjeta}><Text style={styles.texto}>Todavía no hay otras cuentas con rol administrador.</Text><Text style={styles.ayuda}>Primero debe crearse una cuenta de empleado con rol administrador y pasar su verificación de acceso.</Text></View> : empleados.map((empleado) => (
        <View key={empleado.id} style={styles.tarjeta}>
          <Text style={styles.nombre}>{empleado.nombre}</Text>
          <Text style={styles.email}>{empleado.email} · Cuenta #{empleado.id}</Text>
          <Text style={styles.estado}>{empleado.activo ? 'Cuenta activa' : 'Cuenta deshabilitada'}</Text>
          <Text style={styles.subtitulo}>Permisos asignados</Text>
          {PERMISOS.map(([codigo, nombre]) => (
            <View key={codigo} style={styles.filaPermiso}>
              <Text style={styles.textoPermiso}>{nombre}</Text>
              <Switch value={(empleado.permisos || []).includes(codigo)} onValueChange={(v) => alternar(empleado.id, codigo, v)} disabled={!empleado.activo || guardando === empleado.id} trackColor={{ true: '#E5A33A' }} />
            </View>
          ))}
          <TouchableOpacity style={[styles.boton, guardando === empleado.id && styles.botonDeshabilitado]} onPress={() => guardar(empleado)} disabled={guardando === empleado.id || !empleado.activo}>
            <Text style={styles.botonTexto}>{guardando === empleado.id ? 'Guardando...' : 'Guardar permisos'}</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={styles.actualizar} onPress={cargar}><Text style={styles.actualizarTexto}>Actualizar lista</Text></TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#FFF8E1' }, contenido: { padding: 16, paddingBottom: 40 },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF8E1', padding: 24 },
  aviso: { backgroundColor: '#FFE8B8', borderRadius: 12, padding: 15, marginBottom: 12 }, avisoTitulo: { color: '#71440B', fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  tarjeta: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 12 }, titulo: { color: '#38240D', fontSize: 20, fontWeight: 'bold' },
  nombre: { color: '#35230E', fontSize: 17, fontWeight: 'bold' }, email: { color: '#806B4E', fontSize: 12, marginTop: 3 }, estado: { color: '#A86616', fontSize: 12, marginTop: 5 },
  subtitulo: { color: '#493116', fontWeight: 'bold', marginTop: 14, marginBottom: 5 }, filaPermiso: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F3EBDD' }, textoPermiso: { flex: 1, color: '#51402C', fontSize: 13 },
  ayuda: { color: '#806B4E', fontSize: 12, lineHeight: 18 }, texto: { color: '#51402C' }, boton: { backgroundColor: '#E8A23A', padding: 12, borderRadius: 9, alignItems: 'center', marginTop: 14 }, botonDeshabilitado: { opacity: 0.6 }, botonTexto: { color: '#38240D', fontWeight: 'bold' },
  actualizar: { padding: 13, alignItems: 'center' }, actualizarTexto: { color: '#A86616', fontWeight: 'bold' },
});
