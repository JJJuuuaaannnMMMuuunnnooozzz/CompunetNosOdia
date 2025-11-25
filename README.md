# Tarea 2 – Cliente HTTP con Proxy (README)

## 1. Instrucciones para ejecutar el sistema

### Primera vez (instalación de dependencias)

Backend Java (en la raíz del repo, donde está `gradlew`):
```bash
./gradlew clean build
```

Cliente web y proxy (dentro de `web-client`):
```bash
cd web-client
npm install
```

### Ejecución (cada vez que se use el sistema)

#### Iniciar el servidor en Java
Ejecutar la clase `Server.java` (desde el IDE)

#### Levantar el proxy HTTP (en `web-client`):

**Nota:** para conectarse a un servidor externo se pasa la ip como tercer argumento. En caso de llamar un cliente en un 
servidor local, este tercer parámetro no será necesario.
```bash
node proxy/index.js ip_externa 
```

#### Servir el cliente web (nueva terminal en web-client):
```bash
npx serve -s
```

Abrir en el navegador el enlace que imprime el paso anterior.

## 2. Descripción del flujo de comunicación entre cliente, proxy y backend

### Conexiones que permanecen abiertas

* **Proxy ↔ Backend Java (TCP):** el proxy abre un `net.Socket()` hacia `127.0.0.1:9090` y lo mantiene vivo. Cada petición HTTP se traduce a una línea JSON (terminada en `\n`) enviada por ese socket. Las respuestas del backend llegan por el evento `data`, se interpretan como JSON (línea a línea) y se devuelven al cliente como HTTP/JSON.
* **Cliente (browser) ↔ Proxy (WebSocket):** además del canal HTTP, el navegador abre un WebSocket a `ws://localhost:3002`. El proxy reenvía por ese WS eventos entrantes que el backend emita (p. ej., mensajes recibidos), permitiendo “push” desde el servidor sin refrescar.

### 2. Patrón general (HTTP → TCP → HTTP) para operaciones “pull”

**Cliente (HTTP POST) → Proxy**

La UI envía `fetch` con JSON al proxy. Ejemplos reales del proyecto:
* Registrar usuario → `POST /register` `{ username, clientIp }`
* Enviar privado → `POST /chat` `{ sender, receiver, message }`
* Historial → `POST /history` `{ user }`
* Crear grupo → `POST /group/create` `{ groupName }`
* Añadir a grupo → `POST /group/add` `{ groupName, members:[...] }`
* Mensaje a grupo → `POST /group/message` `{ groupName, sender?, message }`

**Proxy (traducción) → Backend Java (TCP JSON line-based)**

El proxy mapea cada endpoint HTTP a un comando JSON que el backend entiende, lo serializa y lo escribe por el socket, agregando `\n` como delimitador de mensaje. Ejemplos exactos del código del proxy:

```bash
POST /users                  → {"command":"REGISTER","data":{...}}\n
POST /messages               → {"command":"MSG_USER","data":{...}}\n
GET /users/{username}/history → {"command":"GET_HISTORY","data":{"user":"..."}}\n
POST /groups                 → {"command":"CREATE_GROUP","data":{"group":"..."}}\n
POST /groups/{groupName}/members    → {"command":"ADD_TO_GROUP","data":{"group":"...","members":[...]}}\n
POST /groups/{groupName}/messages   → {"command":"MSG_GROUP","data":{"group":"...","message":"..."}}\n

```

**Backend Java → Proxy (TCP) → Cliente (HTTP JSON)**

Cuando llega una respuesta por `data`, el proxy intenta parsear JSON y responde al `fetch` con `res.json(...)`. En flujos como `/chat` y `/history`, esto es directo; en `/register` y `/group/create` además se revisa si la respuesta incluye `OK` para decidir `200` o `409`. Si la respuesta no es JSON válido, se retorna el texto crudo para depurar.

### Patrón “push” (eventos entrantes del backend → navegador vía WebSocket)

El proxy corre un `WebSocket.Server` en `:3002`. Cuando el backend envía por el socket TCP eventos con `command:"GET_MESSAGE"` (privado) o `command:"GET_MSG_GROUP"` (grupo), el proxy difunde ese JSON a todos los clientes WS conectados.

En el navegador, `Home.js` abre `new WebSocket("ws://localhost:3002")`, y en `onmessage` clasifica por `fullMessage.command`:

* `GET_MESSAGE` → renderiza `Privado: {sender}: {message}`
* `GET_MSG_GROUP` → renderiza `{group}: {sender}: {message}`

Estos se insertan en el panel “Mensajes recibidos (WebSocket)” en tiempo real.

### Ejemplos de extremo a extremo (con cargas reales del proyecto)

**Enviar mensaje privado (pull + ack):**

1.  UI → `POST /messages` con `{sender, receiver, message}`.
2.  Proxy → TCP: `{"command":"MSG_USER","data":{...}}\n`.
3.  Backend procesa y responde con JSON (p. ej., `{"status":"OK","msgId":"...","timestamp":...}`).
4.  Proxy → UI: `200 OK` con ese JSON (se muestra en la UI).

**Mensaje de grupo y recepción “push”:**

1.  UI → `POST /groups/{groupName}/messages` con `{groupName, message}`
2.  Proxy → TCP: `{"command":"MSG_GROUP","data":{...}}\n`.
3.  Backend puede, además del ack, emitir un evento `{"command":"GET_MSG_GROUP","data":{"group":"...","message":"..."}}`.
4.  Proxy difunde por WS; la UI lo pinta en “Mensajes recibidos (WebSocket)” sin refresco.

**Historial (pull):**

1.  UI → `GET /users/{username}/history` con `{user}` (el “logeado” en la UI).
2.  Proxy → TCP: `{"command":"GET_HISTORY","data":{"user":"..."}}\n`.
3.  Backend devuelve listado (JSON); si no fuese JSON, el proxy retorna el texto crudo.
4.  UI abre un modal y muestra los mensajes ya convertidos a líneas legibles.

### Contratos, delimitación y manejo de errores

* **Delimitación de mensajes:** el proxy escribe una petición por línea (JSON + `\n`) y consume respuestas por el evento `data`. Este contrato *line-based* evita que el backend tenga que “rearmar” fragmentos TCP.
* **Mapeo de estados a HTTP:** cuando el backend responde con éxito (p. ej., contiene `OK` o JSON de éxito), el proxy responde `200`. En conflictos (p. ej., duplicados), el proxy devuelve `409`; y en fallos de conexión/parseo, `5xx`.
* **Canal de eventos:** cualquier JSON entrante con `command` conocido (`GET_MESSAGE`, `GET_MSG_GROUP`) se emite a todos los WS conectados; el cliente clasifica y renderiza según `command` y `data`.

---
### Audios

* **Audios de usuario a usuario:** Estando registrado con un usuario válido debe seleccionar la opción USUARIO en el apartado de notas de voz y escribir el nombre del usuario al que desea enviar la nota de voz, presionar el botón grabar para empezar la grabación y detener para pararla, al usuario receptor le saldrá en el registro de los chats la opción de reproducir el audio.

* **Audios de usuario a grupo:** Estando registrado con un usuario válido debe seleccionar la opción GRUPO en el apartado de notas de voz y escribir el nombre del grupo al que desea enviar la nota de voz, presionar el botón grabar para empezar y detenerlo con el botón detener cuando termine, al usuario receptor le saldrá en el registro de los chats la opción de reproducir el audio.

### Llamadas

* **Llamadas de usuario a usuario:** Estando registrado con un usuario válido debe seleccionar la opción USUARIO en el apartado de llamadas y escribir el nombre del usuario al que desea llamar, al usuario receptror le saldrá una notificación para recibir la llamada, de ser aceptada se escucharán las voces hasta que alguno de los dos presione el botón de colgar.

* **Llamadas de usuario a grupo:** Estando registrado con un usuario válido debe seleccionar la opción GRUPO en el apartado de llamadas y escribir el nombre del grupo al que desea llamar, a cada usuario receptror le saldrá una notificación para recibir la llamada, de ser aceptada se escucharán las voces hasta que alguno de los dos presione el botón de colgar, aunque si uno cuelga no se interrumpirá la llamada para los demás.

### Instruccion IP servidor:

Para manejar la IP del servidor y mantener consistentemente la forma en que se conecta a este, se creó el archivo config.json en la carpeta web-client, el cual contiene la IP del servidor y el puerto de conexión que van a ser utilizados por el ChatDelegate.js .

## 3. Integrantes del grupo

* [Juan Sebastian Rodríguez Legarda] – [A00405229]
* [Johan Stiven Suarez Perdomo] – [A00404253]
* [Juan José Muñoz Franco] – [A00405005]




