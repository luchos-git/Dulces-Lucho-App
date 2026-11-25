import { ThemedText as Text } from '../context/ThemeContext';
import { createThemedStyles } from '../context/ThemeContext';
import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView as NativeScrollView, TouchableOpacity, Alert, Image, Modal, Dimensions } from 'react-native';
import ScrollView from '../components/GlobalRefreshScrollView';
import { useCarrito } from '../context/CarritoContext';
import { useProductos } from '../context/ProductosContext';
import { useAuth } from '../context/AuthContext';
import SliderImagenes from '../components/SliderImagenes';
import CarruselProductos from '../components/CarruselProductos';
import ModalAgregar from '../components/ModalAgregar';

export default function DetalleProducto({ route, navigation }) {
  const { agregarAlCarrito } = useCarrito();
  const { productos, eliminarProducto } = useProductos();
  const { esAdmin } = useAuth();
  const [cantidad, setCantidad] = useState(1);
  const [productoSugerido, setProductoSugerido] = useState(null);
  const [visorImagenVisible, setVisorImagenVisible] = useState(false);
  const [indiceImagenAmpliada, setIndiceImagenAmpliada] = useState(0);
  const [zoomImagen, setZoomImagen] = useState(1);
  const productoInicial = route.params.producto;
  const producto = productos.find((item) => String(item.id) === String(productoInicial.id)) || productoInicial;
  const stockDisponible = Math.max(0, Number(producto.stockDisponible ?? producto.stock_disponible ?? 0));
  const agotado = stockDisponible <= 0;
  const imagenesProducto = useMemo(() => {
    let lista = producto.imagenes ?? producto.imagenesJson ?? producto.imagenes_json ?? [];
    if (typeof lista === 'string') {
      try { lista = JSON.parse(lista); } catch { lista = /^https?:\/\//i.test(lista) ? [lista] : []; }
    }
    if (!Array.isArray(lista)) lista = lista ? [lista] : [];
    const urls = lista.map((item) => typeof item === 'string' ? item : (item?.url || item?.display_url || item?.displayUrl || item?.data?.url || ''));
    const principal = producto.imagenUrl || producto.imagen_url || producto.miniaturaUrl || '';
    return [...new Set([...urls, principal].filter((url) => /^https?:\/\//i.test(String(url || ''))))].slice(0, 3);
  }, [producto]);
  const cambiarFotoAmpliada = (paso) => {
    if (imagenesProducto.length < 2) return;
    setIndiceImagenAmpliada((actual) => (actual + paso + imagenesProducto.length) % imagenesProducto.length);
    setZoomImagen(1);
  };

  // Se eligen hasta cinco productos disponibles al azar, excluyendo el actual.
  // La selección se mantiene estable mientras no cambie el catálogo/producto.
  const productosSugeridos = useMemo(() => {
    const candidatos = productos.filter((item) =>
      String(item.id) !== String(producto.id)
      && Number(item.stockDisponible ?? item.stock_disponible ?? 0) > 0
    );
    const mezcla = [...candidatos];
    for (let indice = mezcla.length - 1; indice > 0; indice -= 1) {
      const aleatorio = Math.floor(Math.random() * (indice + 1));
      [mezcla[indice], mezcla[aleatorio]] = [mezcla[aleatorio], mezcla[indice]];
    }
    return mezcla.slice(0, 5);
  }, [productos, producto.id]);

  const sumar = () => setCantidad((actual) => Math.min(stockDisponible, actual + 1));
  const restar = () => setCantidad((actual) => (actual > 1 ? actual - 1 : 1));

  useEffect(() => {
    if (stockDisponible > 0) setCantidad((actual) => Math.min(actual, stockDisponible));
  }, [stockDisponible]);

  const agregar = () => {
    const ok = agregarAlCarrito(producto, cantidad);
    if (!ok) { Alert.alert('Stock insuficiente', 'No quedan unidades suficientes de este producto.'); return; }
    Alert.alert('Agregado', `${cantidad} x ${producto.nombre} agregado al carrito.`);
  };

  const confirmarAgregadoSugerido = (cantidadSugerida) => {
    const agregado = agregarAlCarrito(productoSugerido, cantidadSugerida);
    setProductoSugerido(null);
    if (!agregado) {
      Alert.alert('Stock insuficiente', 'No quedan unidades suficientes de ese producto.');
      return;
    }
    Alert.alert('Agregado', `${cantidadSugerida} x ${productoSugerido.nombre} agregado al carrito.`);
  };

  const comprarAhora = () => {
    if (stockDisponible <= 0 || cantidad > stockDisponible) { Alert.alert('Stock insuficiente', 'No hay unidades suficientes para esa cantidad.'); return; }
    navigation.navigate('PrepararCompra', {
      items: [{ ...producto, cantidad, seleccionado: true }],
      subtotal: producto.precio * cantidad,
      comprarAhora: true,
      entrega: { conEnvio: false },
    });
  };

  // El administrador vuelve al formulario del panel con los datos de este producto.
  const modificarProducto = () => {
    navigation.navigate('PanelAdmin', { productoEditar: producto });
  };

  // La baja es lógica: el producto deja de aparecer en la tienda, pero se conserva en las ventas.
  const confirmarEliminar = () => {
    Alert.alert(
      'Eliminar producto',
      `¿Querés eliminar “${producto.nombre}” del catálogo? Se conservará el historial de ventas anteriores.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarProducto(producto.id);
              Alert.alert('Producto eliminado', 'El producto ya no aparece en el catálogo.');
              navigation.goBack();
            } catch (error) {
              Alert.alert('No se pudo eliminar', error.message);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 128 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
      <View style={styles.marcoFotoGrande}>
        {imagenesProducto.length > 0 ? (
          <SliderImagenes
            imagenes={imagenesProducto}
            style={styles.fotoGrande}
            resizeMode="contain"
            onPressImage={(_url, indice) => { setIndiceImagenAmpliada(indice); setZoomImagen(1); setVisorImagenVisible(true); }}
          />
        ) : (
          <View style={styles.fotoGrande}>
            <Text>{producto.categoria === 'Jugos' ? '🧃' : producto.categoria === 'Combos' ? '🍬' : '🍫'}</Text>
            <Text>Foto del producto</Text>
          </View>
        )}
        {agotado && <View pointerEvents="none" style={styles.capaAgotado}><Text style={styles.textoAgotado}>AGOTADO</Text></View>}
      </View>

      <View style={styles.info}>
        <Text style={styles.nombre}>{producto.nombre}</Text>
        <Text style={styles.categoria}>{producto.categoria}</Text>
        <Text style={styles.precio}>${producto.precio}</Text>
        <Text style={styles.stock}>{agotado ? 'Sin unidades disponibles' : `${stockDisponible} unidades disponibles`}</Text>
        {producto.descripcion ? <Text style={styles.descripcion}>{producto.descripcion}</Text> : null}

        {agotado ? (
          <TouchableOpacity style={styles.botonPedidoAgotado} onPress={() => navigation.navigate('PedidoAgotado', { producto })}>
            <Text style={styles.textoBotonPedido}>Realizar pedido</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.selectorCantidad}>
              <Text style={styles.label}>Cantidad</Text>
              <View style={styles.contador}>
                <TouchableOpacity style={styles.botonContador} onPress={restar}>
                  <Text style={styles.botonContadorTexto}>-</Text>
                </TouchableOpacity>
                <Text style={styles.cantidadTexto}>{cantidad}</Text>
                <TouchableOpacity style={[styles.botonContador, cantidad >= stockDisponible && styles.botonInactivo]} onPress={sumar} disabled={cantidad >= stockDisponible}>
                  <Text style={styles.botonContadorTexto}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.botonComprar} onPress={comprarAhora}>
              <Text style={styles.textoBotonComprar}>Comprar ahora</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botonAgregar} onPress={agregar}>
              <Text style={styles.textoBotonAgregar}>Agregar al carrito</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Estas dos opciones aparecen en la ficha solamente cuando la cuenta es administradora. */}
        {esAdmin ? (
          <View style={styles.cajaAdmin}>
            <Text style={styles.tituloAdmin}>Opciones de administrador</Text>
            <TouchableOpacity style={styles.botonModificar} onPress={modificarProducto}>
              <Text style={styles.textoBotonModificar}>Modificar producto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botonEliminar} onPress={confirmarEliminar}>
              <Text style={styles.textoBotonEliminar}>Eliminar del catálogo</Text>
            </TouchableOpacity>
          </View>
        ) : null}

      </View>

      {productosSugeridos.length > 0 && (
        <CarruselProductos
          titulo="También te puede interesar"
          productos={productosSugeridos}
          onPress={(item) => navigation.push('DetalleProducto', { producto: item })}
          onAgregar={setProductoSugerido}
        />
      )}

      <ModalAgregar
        producto={productoSugerido}
        maxCantidad={productoSugerido?.stockDisponible ?? productoSugerido?.stock_disponible ?? 0}
        onCancelar={() => setProductoSugerido(null)}
        onConfirmar={confirmarAgregadoSugerido}
      />

      <Modal
        visible={visorImagenVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setVisorImagenVisible(false)}
      >
        <View style={styles.visorFondo}>
          <View style={styles.visorCabecera}>
            <TouchableOpacity onPress={() => setVisorImagenVisible(false)} style={styles.visorCerrar} accessibilityLabel="Cerrar imagen ampliada">
              <Text style={styles.visorCerrarTexto}>×</Text>
            </TouchableOpacity>
            <Text style={styles.visorContador}>{imagenesProducto.length ? `${indiceImagenAmpliada + 1} / ${imagenesProducto.length}` : 'Imagen'}</Text>
            <View style={styles.visorCerrar} />
          </View>

          <NativeScrollView
            key={indiceImagenAmpliada}
            style={styles.visorScrollHorizontal}
            contentContainerStyle={styles.visorContenidoHorizontal}
            horizontal
            bounces={false}
            showsHorizontalScrollIndicator={false}
            scrollEnabled={zoomImagen > 1}
            maximumZoomScale={3}
            minimumZoomScale={1}
          >
            <NativeScrollView
              style={[styles.visorScrollVertical, { width: (Dimensions.get('window').width - 24) * zoomImagen, height: Dimensions.get('window').height - 180 }]}
              contentContainerStyle={styles.visorContenidoVertical}
              bounces={false}
              showsVerticalScrollIndicator={false}
              scrollEnabled={zoomImagen > 1}
            >
              <TouchableOpacity activeOpacity={1} onPress={() => setZoomImagen((actual) => actual > 1 ? 1 : 2)}>
                {imagenesProducto[indiceImagenAmpliada] ? (
                  <Image
                    source={{ uri: imagenesProducto[indiceImagenAmpliada] }}
                    resizeMode="contain"
                    style={[
                      styles.visorImagen,
                      {
                        width: (Dimensions.get('window').width - 24) * zoomImagen,
                        height: (Dimensions.get('window').height - 180) * zoomImagen,
                      },
                    ]}
                  />
                ) : null}
              </TouchableOpacity>
            </NativeScrollView>
          </NativeScrollView>

          <View style={styles.visorControles}>
            <TouchableOpacity disabled={imagenesProducto.length < 2} onPress={() => cambiarFotoAmpliada(-1)} style={[styles.visorBoton, imagenesProducto.length < 2 && styles.visorBotonDeshabilitado]}>
              <Text style={styles.visorBotonTexto}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setZoomImagen((actual) => Math.max(1, Number((actual - 0.5).toFixed(1))))} style={styles.visorBoton}>
              <Text style={styles.visorBotonTexto}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setZoomImagen(1)} style={styles.visorZoomEtiqueta}>
              <Text style={styles.visorZoomTexto}>{Math.round(zoomImagen * 100)}%</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setZoomImagen((actual) => Math.min(3, Number((actual + 0.5).toFixed(1))))} style={styles.visorBoton}>
              <Text style={styles.visorBotonTexto}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={imagenesProducto.length < 2} onPress={() => cambiarFotoAmpliada(1)} style={[styles.visorBoton, imagenesProducto.length < 2 && styles.visorBotonDeshabilitado]}>
              <Text style={styles.visorBotonTexto}>›</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.visorAyuda}>Tocá la imagen para ampliar o reducir. Usá + y − para ajustar el zoom.</Text>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = createThemedStyles({
  visorFondo: { flex: 1, backgroundColor: '#111111', paddingTop: 28, paddingBottom: 18 },
  visorCabecera: { height: 48, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  visorCerrar: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  visorCerrarTexto: { color: '#FFFFFF', fontSize: 34, lineHeight: 38, fontWeight: '300' },
  visorContador: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  visorScrollHorizontal: { flex: 1 },
  visorContenidoHorizontal: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  visorScrollVertical: { flex: 1 },
  visorContenidoVertical: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  visorImagen: { backgroundColor: '#111111' },
  visorControles: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, paddingVertical: 10 },
  visorBoton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#383838', justifyContent: 'center', alignItems: 'center' },
  visorBotonDeshabilitado: { opacity: 0.35 },
  visorBotonTexto: { color: '#FFFFFF', fontSize: 25, fontWeight: '600' },
  visorZoomEtiqueta: { minWidth: 60, alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8 },
  visorZoomTexto: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  visorAyuda: { color: '#DDDDDD', fontSize: 11, textAlign: 'center', marginHorizontal: 16, marginBottom: 8 },
  container: { flex: 1, backgroundColor: '#FFF8E1' },
  marcoFotoGrande: { height: 260, backgroundColor: '#eee', position: 'relative', overflow: 'hidden' },
  fotoGrande: { width: '100%', height: '100%', backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  capaAgotado: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(45,33,24,0.62)', justifyContent: 'center', alignItems: 'center' },
  textoAgotado: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  stock: { color: '#806B4E', fontSize: 12, marginBottom: 12 },
  botonPedidoAgotado: { backgroundColor: '#A86616', padding: 15, borderRadius: 9, alignItems: 'center', marginTop: 6 },
  textoBotonPedido: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  botonInactivo: { opacity: 0.4 },
  info: { padding: 20 },
  nombre: { fontSize: 22, fontWeight: 'bold' },
  categoria: { color: '#888', marginTop: 2, marginBottom: 8 },
  precio: { fontSize: 20, fontWeight: 'bold', color: '#c77b00', marginBottom: 12 },
  descripcion: { color: '#555', marginBottom: 16 },
  selectorCantidad: { marginBottom: 20 },
  label: { fontSize: 14, marginBottom: 6, color: '#555' },
  contador: { flexDirection: 'row', alignItems: 'center' },
  botonContador: { width: 36, height: 36, backgroundColor: '#ffcc80', justifyContent: 'center', alignItems: 'center', borderRadius: 6 },
  botonContadorTexto: { fontSize: 18, fontWeight: 'bold' },
  cantidadTexto: { marginHorizontal: 16, fontSize: 16 },
  botonComprar: { backgroundColor: '#007bff', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  textoBotonComprar: { color: '#fff', fontWeight: 'bold' },
  botonAgregar: { backgroundColor: '#ffcc80', padding: 14, borderRadius: 8, alignItems: 'center' },
  textoBotonAgregar: { fontWeight: 'bold' },
  cajaAdmin: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginTop: 20, borderWidth: 1, borderColor: '#ead7bd' },
  tituloAdmin: { fontWeight: 'bold', marginBottom: 10, color: '#5c3c12' },
  botonModificar: { backgroundColor: '#ffcc80', padding: 13, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  textoBotonModificar: { color: '#3d2a0d', fontWeight: 'bold' },
  botonEliminar: { backgroundColor: '#fde8e7', padding: 13, borderRadius: 8, alignItems: 'center' },
  textoBotonEliminar: { color: '#b42318', fontWeight: 'bold' },
});
