import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Campo reutilizable que permite alternar entre contraseña oculta y visible.
export default function CampoPassword({ style, contenedorStyle, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={[styles.fila, contenedorStyle]}>
      <TextInput {...props} style={[style, styles.input]} secureTextEntry={!visible} />
      <TouchableOpacity style={styles.boton} onPress={() => setVisible((actual) => !actual)} accessibilityRole="button" accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
        <Text style={styles.textoBoton}>{visible ? 'Ocultar' : 'Ver'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8D8C2', borderRadius: 8, marginBottom: 10, paddingRight: 10 },
  input: { flex: 1, minWidth: 0, width: undefined, backgroundColor: 'transparent', borderWidth: 0, borderRadius: 0, marginBottom: 0, padding: 12, color: '#35230E' },
  boton: { paddingHorizontal: 5, paddingVertical: 8 },
  textoBoton: { color: '#A66A12', fontSize: 12, fontWeight: '700' },
});
