// explicación del archivo: configuración de babel que permite a expo transformar el código javascript y react native
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};