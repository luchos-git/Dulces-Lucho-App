// Inventario de materias primas, recetas y solicitudes de compras grandes a proveedores.
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function AdminInsumosScreen() {
  const { usuario, esPropietario, puede } = useAuth();
  const puedeInventario = esPropietario || puede('gestionar_insumos');
  const puedeComprar = esPropietario || puede('solicitar_compras');
  const [datos, setDatos] = useState({ insumos: [], productos: [], recetas: [], compras: [] });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [unidad, setUnidad] = useState('unidad');
  const [stock, setStock] = useState('0');
  const [stockMinimo, setStockMinimo] = useState('0');
  const [proveedor, setProveedor] = useState('');
  const [productoId, setProductoId] = useState(null);
  const [insumoId, setInsumoId] = useState(null);
  const [cantidadReceta, setCantidadReceta] = useState('1');
  const [proveedorCompra, setProveedorCompra] = useState('');
  const [cantidadCompra, setCantidadCompra] = useState('');
  const [itemsCompra, setItemsCompra] = useState([]);
  const [notasCompra, setNotasCompra] = useState('');

  const cargar = useCallback(async () => {
    try { setDatos(await api(`/admin/insumos?adminId=${usuario.id}`)); }
    catch (e) { Alert.alert('No se pudo cargar el inventario', e.message); }
    finally { setCargando(false); }
  }, [usuario?.id]);
  useEffect(() => { cargar(); }, [cargar]);

  const crearInsumo = async () => {
    if (!nombre.trim() || !unidad.trim() || !Number.isFinite(Number(stock)) || !Number.isFinite(Number(stockMinimo)) || Number(stock) < 0 || Number(stockMinimo) < 0) {
      Alert.alert('Revisá los datos', 'Ingresá un nombre, unidad y cantidades válidas.'); return;
    }
    setGuardando(true);
    try {
      await api('/admin/insumos', { method: 'POST', body: JSON.stringify({ adminId: usuario.id, nombre: nombre.trim(), unidad: unidad.trim(), stockActual: Number(stock), stockMinimo: Number(stockMinimo), proveedor: proveedor.trim() }) });
      setNombre(''); setUnidad('unidad'); setStock('0'); setStockMinimo('0'); setProveedor(''); await cargar();
    } catch (e) { Alert.alert('No se pudo guardar el insumo', e.message); }
    finally { setGuardando(false); }
  };

  const guardarReceta = async () => {
    if (!productoId || !insumoId || !Number.isFinite(Number(cantidadReceta)) || Number(cantidadReceta) <= 0) { Alert.alert('Faltan datos', 'Elegí un producto, un insumo y una cantidad mayor a cero.'); return; }
    setGuardando(true);
    try {
      await api('/admin/insumos/recetas', { method: 'POST', body: JSON.stringify({ adminId: usuario.id, productoId, insumoId, cantidadPorProducto: Number(cantidadReceta) }) });
      setProductoId(null); setInsumoId(null); setCantidadReceta('1'); await cargar();
      Alert.alert('Receta guardada', 'La cantidad de materia prima por unidad quedó registrada.');
    } catch (e) { Alert.alert('No se pudo guardar la receta', e.message); }
    finally { setGuardando(false); }
  };

  const agregarLineaCompra = () => {
    const insumo = datos.insumos.find((i) => i.id === insumoId);
    const cantidad = Number(cantidadCompra);
    if (!insumo || !Number.isFinite(cantidad) || cantidad <= 0) { Alert.alert('Revisá la compra', 'Elegí un insumo e ingresá una cantidad válida.'); return; }
    setItemsCompra((lista) => [...lista, { insumoId: insumo.id, nombre: insumo.nombre, unidad: insumo.unidad, cantidad }]);
    setCantidadCompra(''); setInsumoId(null);
  };

  const solicitarCompra = async () => {
    if (!proveedorCompra.trim() || itemsCompra.length === 0) { Alert.alert('Pedido incompleto', 'Ingresá el proveedor y agregá al menos un insumo.'); return; }
    setGuardando(true);
    try {
      const resultado = await api('/admin/compras-insumos', { method: 'POST', body: JSON.stringify({ adminId: usuario.id, proveedor: proveedorCompra.trim(), notas: notasCompra.trim(), items: itemsCompra.map((i) => ({ insumoId: i.insumoId, cantidad: i.cantidad })) }) });
      Alert.alert('Solicitud registrada', `Se creó el pedido ${resultado.numero}. La compra queda pendiente hasta que el proveedor la confirme.`);
      setProveedorCompra(''); setNotasCompra(''); setItemsCompra([]); await cargar();
    } catch (e) { Alert.alert('No se pudo crear la solicitud', e.message); }
    finally { setGuardando(false); }
  };

  const cambiarEstadoCompra = async (compra, estado) => {
    try { await api(`/admin/compras-insumos/${compra.id}/estado`, { method: 'PATCH', body: JSON.stringify({ adminId: usuario.id, estado }) }); await cargar(); }
    catch (e) { Alert.alert('No se pudo actualizar la compra', e.message); }
  };

  if (!puedeInventario && !puedeComprar) return <View style={styles.centrado}><Text style={styles.titulo}>Acceso no autorizado</Text><Text style={styles.ayuda}>La cuenta principal debe asignarte permiso de inventario o compras.</Text></View>;
  if (cargando) return <View style={styles.centrado}><ActivityIndicator size="large" color="#A86616" /><Text style={styles.ayuda}>Cargando mercadería...</Text></View>;

  return (
    <ScrollView style={styles.fondo} contentContainerStyle={styles.contenido}>
      <Text style={styles.titulo}>Inventario y compras grandes</Text>
      <Text style={styles.descripcion}>Registrá las materias primas, definí cuánto necesita cada producto y prepará solicitudes de compra a proveedores.</Text>

      <Text style={styles.seccion}>Stock de mercadería</Text>
      {datos.insumos.map((i) => (
        <View key={i.id} style={styles.tarjeta}>
          <View style={styles.fila}><Text style={styles.nombre}>{i.nombre}</Text><Text style={[styles.etiquetaStock, Number(i.stockActual) <= Number(i.stockMinimo) && styles.stockBajo]}>{Number(i.stockActual)} {i.unidad}</Text></View>
          <Text style={styles.ayuda}>Mínimo: {Number(i.stockMinimo)} {i.unidad}{i.proveedor ? ` · Proveedor: ${i.proveedor}` : ''}</Text>
          {Number(i.stockActual) <= Number(i.stockMinimo) && <Text style={styles.alerta}>Stock bajo: conviene preparar una compra.</Text>}
        </View>
      ))}
      {datos.insumos.length === 0 && <View style={styles.tarjeta}><Text style={styles.ayuda}>Todavía no hay insumos cargados.</Text></View>}

      {puedeInventario && <View style={styles.tarjeta}>
        <Text style={styles.subtitulo}>Agregar materia prima</Text>
        <TextInput style={styles.input} placeholder="Nombre (ej. harina)" value={nombre} onChangeText={setNombre} />
        <TextInput style={styles.input} placeholder="Unidad (kg, g, litro, unidad)" value={unidad} onChangeText={setUnidad} />
        <TextInput style={styles.input} placeholder="Stock actual" keyboardType="decimal-pad" value={stock} onChangeText={setStock} />
        <TextInput style={styles.input} placeholder="Stock mínimo" keyboardType="decimal-pad" value={stockMinimo} onChangeText={setStockMinimo} />
        <TextInput style={styles.input} placeholder="Proveedor habitual (opcional)" value={proveedor} onChangeText={setProveedor} />
        <Boton texto="Guardar insumo" onPress={crearInsumo} disabled={guardando} />
      </View>}

      {puedeInventario && <View style={styles.tarjeta}>
        <Text style={styles.subtitulo}>Qué necesita cada producto</Text>
        <Text style={styles.ayuda}>Elegí el producto y el insumo; indicá la cantidad necesaria para fabricar UNA unidad.</Text>
        <Text style={styles.etiqueta}>Producto</Text>
        <View style={styles.chips}>{datos.productos.map((p) => <TouchableOpacity key={p.id} onPress={() => setProductoId(p.id)} style={[styles.chip, productoId === p.id && styles.chipActivo]}><Text style={styles.chipTexto}>{p.nombre} (#{p.id})</Text></TouchableOpacity>)}</View>
        <Text style={styles.etiqueta}>Materia prima</Text>
        <View style={styles.chips}>{datos.insumos.map((i) => <TouchableOpacity key={i.id} onPress={() => setInsumoId(i.id)} style={[styles.chip, insumoId === i.id && styles.chipActivo]}><Text style={styles.chipTexto}>{i.nombre}</Text></TouchableOpacity>)}</View>
        <TextInput style={styles.input} placeholder="Cantidad por producto" keyboardType="decimal-pad" value={cantidadReceta} onChangeText={setCantidadReceta} />
        <Boton texto="Guardar necesidad del producto" onPress={guardarReceta} disabled={guardando} />
        <Text style={styles.etiqueta}>Recetas registradas</Text>
        {datos.recetas.map((r, idx) => <Text key={`${r.productoId}-${r.insumoId}-${idx}`} style={styles.linea}>{r.productoNombre}: {Number(r.cantidadPorProducto)} {r.unidad} de {r.insumoNombre} por unidad</Text>)}
      </View>}

      {puedeComprar && <View style={styles.tarjeta}>
        <Text style={styles.subtitulo}>Preparar pedido grande al proveedor</Text>
        <TextInput style={styles.input} placeholder="Nombre del proveedor" value={proveedorCompra} onChangeText={setProveedorCompra} />
        <Text style={styles.etiqueta}>Elegí un insumo y la cantidad</Text>
        <View style={styles.chips}>{datos.insumos.map((i) => <TouchableOpacity key={i.id} onPress={() => setInsumoId(i.id)} style={[styles.chip, insumoId === i.id && styles.chipActivo]}><Text style={styles.chipTexto}>{i.nombre} ({i.unidad})</Text></TouchableOpacity>)}</View>
        <TextInput style={styles.input} placeholder="Cantidad a solicitar" keyboardType="decimal-pad" value={cantidadCompra} onChangeText={setCantidadCompra} />
        <Boton texto="Agregar al pedido" onPress={agregarLineaCompra} disabled={guardando} />
        {itemsCompra.map((i, idx) => <View key={`${i.insumoId}-${idx}`} style={styles.lineaCompra}><Text style={styles.linea}>{i.cantidad} {i.unidad} · {i.nombre}</Text><TouchableOpacity onPress={() => setItemsCompra((l) => l.filter((_, n) => n !== idx))}><Text style={styles.quitar}>Quitar</Text></TouchableOpacity></View>)}
        <TextInput style={[styles.input, styles.multilinea]} placeholder="Notas para el proveedor (opcional)" multiline value={notasCompra} onChangeText={setNotasCompra} />
        <Boton texto="Crear solicitud de compra" onPress={solicitarCompra} disabled={guardando} />
      </View>}

      <Text style={styles.seccion}>Solicitudes de compra</Text>
      {datos.compras.map((c) => <View key={c.id} style={styles.tarjeta}><Text style={styles.nombre}>{c.numero} · {c.proveedor}</Text><Text style={styles.ayuda}>Estado: {c.estado} · {new Date(c.creadoEn).toLocaleDateString()}</Text>{(c.items || []).map((i,idx) => <Text key={`${c.id}-${idx}`} style={styles.linea}>{i.cantidad} {i.unidad} · {i.nombre}</Text>)}{puedeComprar && c.estado === 'solicitado' && <Boton texto="Marcar como recibido (actualiza stock)" onPress={() => cambiarEstadoCompra(c,'recibido')} disabled={guardando} />}</View>)}
      {datos.compras.length === 0 && <View style={styles.tarjeta}><Text style={styles.ayuda}>Todavía no hay solicitudes de compra.</Text></View>}
      <Text style={styles.notaFinal}>La solicitud queda registrada en el sistema; no se envía automáticamente al proveedor. Cuando la mercadería llega, marcala como recibida para sumar el stock.</Text>
    </ScrollView>
  );
}

function Boton({ texto, onPress, disabled }) { return <TouchableOpacity style={[styles.boton, disabled && { opacity: 0.55 }]} onPress={onPress} disabled={disabled}><Text style={styles.botonTexto}>{texto}</Text></TouchableOpacity>; }
const styles = StyleSheet.create({
  fondo:{flex:1,backgroundColor:'#FFF8E1'},contenido:{padding:16,paddingBottom:40},centrado:{flex:1,alignItems:'center',justifyContent:'center',padding:24,backgroundColor:'#FFF8E1'},
  titulo:{fontSize:23,fontWeight:'bold',color:'#38240D'},descripcion:{color:'#765F43',lineHeight:19,marginTop:5,marginBottom:14},seccion:{fontSize:17,fontWeight:'bold',color:'#80500F',marginTop:16,marginBottom:8},tarjeta:{backgroundColor:'#fff',borderRadius:12,padding:14,marginBottom:10},
  nombre:{color:'#35230E',fontSize:15,fontWeight:'bold',flex:1},fila:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},etiquetaStock:{color:'#31744C',fontWeight:'bold'},stockBajo:{color:'#B42318'},alerta:{color:'#B42318',fontSize:12,fontWeight:'600',marginTop:6},subtitulo:{fontSize:16,fontWeight:'bold',color:'#493116',marginBottom:8},ayuda:{color:'#806B4E',fontSize:12,lineHeight:18,marginTop:4},
  input:{borderWidth:1,borderColor:'#E8D8C2',borderRadius:8,padding:11,color:'#35230E',backgroundColor:'#FFFCF5',marginTop:8},multilinea:{minHeight:70,textAlignVertical:'top'},etiqueta:{color:'#80500F',fontSize:12,fontWeight:'bold',marginTop:10,marginBottom:5},chips:{flexDirection:'row',flexWrap:'wrap'},chip:{backgroundColor:'#FFF4DF',borderWidth:1,borderColor:'#E8D8C2',borderRadius:18,paddingHorizontal:10,paddingVertical:7,marginRight:6,marginBottom:6},chipActivo:{backgroundColor:'#F6D18C',borderColor:'#C18A33'},chipTexto:{fontSize:12,color:'#513716'},linea:{fontSize:12,color:'#59472F',marginTop:5},lineaCompra:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},quitar:{color:'#B42318',fontSize:12,padding:6},boton:{backgroundColor:'#E8A23A',borderRadius:9,padding:12,alignItems:'center',marginTop:12},botonTexto:{color:'#38240D',fontWeight:'bold'},notaFinal:{fontSize:11,lineHeight:17,color:'#806B4E',marginTop:12},
});
