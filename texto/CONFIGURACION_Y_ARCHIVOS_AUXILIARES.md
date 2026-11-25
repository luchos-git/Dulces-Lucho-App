# explicación de configuraciones y archivos auxiliares

los archivos json no admiten comentarios porque deben conservar un formato válido para que expo, npm y las herramientas puedan leerlos. por eso se explican acá y no se agrega texto dentro de ellos

`package.json` contiene el nombre, la versión, los comandos para iniciar expo y las librerías que usa la aplicación móvil

`package-lock.json` guarda las versiones exactas que npm instaló para que otra computadora pueda reproducir las mismas dependencias. se genera automáticamente y no conviene editarlo a mano

`backend/package.json` define las dependencias del servidor y los comandos `npm start` y `npm run dev`

`backend/package-lock.json` fija las versiones exactas de las librerías usadas por el backend

`app.json` guarda los datos generales de expo, el nombre de la app, el ícono, la orientación, los permisos y los plugins de imágenes y notificaciones

`tsconfig.json` define cómo typescript revisa los archivos de la plantilla de expo

`.vscode/extensions.json` recomienda la extensión de expo para visual studio code

`.vscode/settings.json` configura algunas acciones automáticas del editor al guardar

`.claude/settings.json` habilita una integración opcional para claude dentro del proyecto, no interviene en la ejecución de la aplicación

`.gitignore` indica qué carpetas y archivos no se deben subir al repositorio, como dependencias, cachés y archivos `.env` con claves

`backend/.env.example` muestra las variables que hay que copiar a `backend/.env` y completar con los datos de mysql y la clave de imgbb

`.env.example` muestra la variable que conecta expo go con el backend mediante la ip local de la computadora

`AGENTS.md` y `CLAUDE.md` son archivos auxiliares de instrucciones para asistentes de programación, no son parte de la aplicación que usa el cliente

`LICENSE` contiene la licencia legal del proyecto y sus condiciones de uso

`README.md` resume el proyecto y muestra los primeros pasos para ejecutarlo

`documentacion.md` describe el funcionamiento general y la organización de los módulos

`database/README.md` explica cómo importar la base de datos y qué contiene cada script sql

`THUNDER_CLIENT_Y_EXPO_GO.md` contiene las pruebas de la api y la configuración necesaria para usar expo go desde un teléfono

`CONFIGURACION_Y_ARCHIVOS_AUXILIARES.md` explica estos archivos que no admiten comentarios internos o que son documentación

`assets/README.md` describe las imágenes y recursos gráficos incluidos en el proyecto
