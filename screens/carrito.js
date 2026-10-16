const prepararCompra = () => {
  const seleccionados = items.filter((i) => i.seleccionado);
  if (seleccionados.length === 0) {
    Alert.alert('Carrito vacío', 'Seleccioná al menos un producto para continuar.');
    return;
  }
  if (conEnvio && !envio) {
    Alert.alert('Falta el envío', 'Calculá el costo de envío antes de continuar.');
    return;
  }
  navigation.navigate('PrepararCompra', {
    items: seleccionados,
    subtotal,
    conEnvio,
    direccion,
    envio,
  });
};