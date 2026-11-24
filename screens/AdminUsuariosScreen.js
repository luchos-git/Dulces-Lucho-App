// Administración de cuentas: consultar usuarios y habilitar o deshabilitar su acceso.
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function AdminUsuariosScreen() {
  const { usuario, esPropietario, puede } = useAuth();
  const puedeClientes = esPropietario || puede('gestionar_usuarios');
  const puedeEmpleados = esPropietario || puede('gestionar_empleados');
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const cargar = useCallback(async () => {
    try { setUsuarios(await api(`/admin/usuarios?adminId=${usuario.id}`)); }
    catch (e) { Alert.alert('No se pudieron cargar las cuentas', e.message); }
    finally { setCargando(false); setActualizando(false); }
  }, [usuario?.id]);
  useEffect(() => { cargar(); }, [cargar]);

  const cambiarEstado = (cuenta, activo) => {
    Alert.alert(activo ? 'Habilitar cuenta' : 'Deshabilitar cuenta', `¿Querés ${activo ? 'habilitar' : 'deshabilitar'} el acceso de ${cuenta.nombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: async () => {
        try {
          await api(`/admin/usuarios/${cuenta.id}/estado`, { method: 'PATCH', body: JSON.stringify({ adminId: usuario.id, activo }) });
          setUsuarios((lista) => lista.map((u) => u.id === cuenta.id ? { ...u, activo: activo ? 1 : 0 } : u));
        } catch (e) { Alert.alert('No se pudo modificar la cuenta', e.message); }
      } },
    ]);
  };

  const darDeBaja = (cuenta) => {
    Alert.alert('Dar de baja cuenta', `Se deshabilitará ${cuenta.nombre}. No podrá iniciar sesión, pero se conservarán sus pedidos y facturas. ¿Continuar?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Dar de baja', style: 'destructive', onPress: async () => {
        try {
          await api(`/owner/usuarios/${cuenta.id}`, { method: 'DELETE' });
          setUsuarios((lista) => lista.map((u) => u.id === cuenta.id ? { ...u, activo: 0 } : u));
          Alert.alert('Cuenta deshabilitada', 'Se conservaron los pedidos y comprobantes.');
        } catch (e) { Alert.alert('No se pudo dar de baja', e.message); }
      } },
    ]);
  };


  if (!puedeClientes && !puedeEmpleados) return <View style={styles.centrado}><Text style={styles.titulo}>Acceso no autorizado</Text><Text style={styles.ayuda}>La cuenta principal debe asignarte el permiso para gestionar clientes o empleados.</Text></View>;
  if (cargando) return <View style={styles.centrado}><ActivityIndicator size="large" color="#A86616" /><Text>Cargando usuarios...</Text></View>;
  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={styles.contenido} refreshControl={<RefreshControl refreshing={actualizando} onRefresh={() => { setActualizando(true); cargar(); }} />}>
      <Text style={styles.titulo}>Gestión de usuarios</Text>
      <Text style={styles.descripcion}>{esPropietario ? 'Cuenta principal: podés habilitar, pausar o dar de baja clientes y empleados. Los pedidos y comprobantes se conservan.' : puedeEmpleados && puedeClientes ? 'Podés administrar clientes y empleados porque la cuenta principal te asignó ambos permisos. La cuenta principal sigue protegida.' : puedeEmpleados ? 'Podés habilitar o pausar empleados administradores por autorización de la cuenta principal. No podés modificar la cuenta principal.' : 'Podés habilitar o pausar clientes. Las cuentas de empleados y la cuenta principal están protegidas.'}</Text>
      <View style={styles.resumen}><Text style={styles.resumenTexto}>{usuarios.length} cuentas · {usuarios.filter((u) => Number(u.activo) === 1).length} activas</Text></View>
      {usuarios.map((u) => (
        <View key={u.id} style={styles.tarjeta}>
          <View style={styles.fila}><Text style={styles.nombre}>{u.nombre}</Text><Text style={styles.rol}>{u.rol === 'admin' ? 'ADMIN' : 'CLIENTE'}</Text></View>
          <Text style={styles.dato}>{u.email}</Text>
          {!!u.telefono && <Text style={styles.dato}>Tel. {u.telefono}</Text>}
          <View style={styles.filaEstado}><Text style={styles.estado}>{Number(u.activo) ? 'Cuenta activa' : 'Cuenta deshabilitada'}</Text><Switch value={Number(u.activo) === 1} onValueChange={(v) => cambiarEstado(u, v)} disabled={u.id === usuario.id} trackColor={{ true: '#E5A33A' }} /></View>
          {u.id === usuario.id && <Text style={styles.ayuda}>No podés deshabilitar tu propia cuenta principal.</Text>}
          {esPropietario && u.id !== usuario.id && Number(u.activo) === 1 && <TouchableOpacity style={styles.botonBaja} onPress={() => darDeBaja(u)}><Text style={styles.textoBaja}>Dar de baja esta cuenta</Text></TouchableOpacity>}
        </View>
      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({ contenedor: { flex: 1, backgroundColor: '#FFF8E1' }, contenido: { padding: 16, paddingBottom: 30 }, centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF8E1' }, titulo: { fontSize: 23, fontWeight: 'bold', color: '#38240D' }, descripcion: { color: '#765F43', marginTop: 5, marginBottom: 12, lineHeight: 18 }, resumen: { backgroundColor: '#FFE0B2', borderRadius: 9, padding: 12, marginBottom: 10 }, resumenTexto: { color: '#67400F', fontWeight: 'bold' }, tarjeta: { backgroundColor: '#fff', borderRadius: 11, padding: 14, marginBottom: 10 }, fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, nombre: { color: '#35230E', fontWeight: 'bold', fontSize: 15, flex: 1 }, rol: { color: '#A86616', fontSize: 11, fontWeight: 'bold' }, dato: { color: '#79664D', fontSize: 12, marginTop: 4 }, filaEstado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }, estado: { color: '#56452E', fontSize: 13 }, ayuda: { color: '#9A8465', fontSize: 11, marginTop: 4 }, botonBaja: { alignSelf: 'flex-start', marginTop: 10, paddingVertical: 8, paddingHorizontal: 11, borderRadius: 8, backgroundColor: '#FCE8E6' }, textoBaja: { color: '#A12622', fontSize: 12, fontWeight: '700' } });
