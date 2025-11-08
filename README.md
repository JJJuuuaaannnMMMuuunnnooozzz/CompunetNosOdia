\section*{Tarea 2 – Cliente HTTP con Proxy (README)}

\subsection*{Instrucciones para ejecutar el sistema}

\subsubsection*{Primera vez (instalación de dependencias)}

\paragraph{Backend Java (en la raíz del repo, donde está \texttt{gradlew}):}
\begin{verbatim}
./gradlew clean build
\end{verbatim}

\paragraph{En Windows:}
\begin{verbatim}
.\gradlew.bat clean build
\end{verbatim}

\paragraph{Cliente web y proxy (dentro de \texttt{web-client}):}
\begin{verbatim}
cd web-client
npm install
\end{verbatim}

\paragraph{Si el proxy tiene su propio \texttt{package.json} en \texttt{web-client/proxy}:}
\begin{verbatim}
cd web-client/proxy
npm install
cd ..
\end{verbatim}

\subsubsection*{Ejecución (cada vez que se use el sistema)}

\paragraph{Iniciar el servidor en Java}
Ejecutar la clase \texttt{Server.java} (desde el IDE) \\
o, si existe tarea Gradle para correrlo:
\begin{verbatim}
./gradlew run
\end{verbatim}
(usar \texttt{.\textbackslash gradlew.bat run} en Windows)

\paragraph{Levantar el proxy HTTP (en \texttt{web-client}):}
\begin{verbatim}
node proxy/index.js
\end{verbatim}

\paragraph{Servir el cliente web (nueva terminal en \texttt{web-client}):}
\begin{verbatim}
npx serve -s
\end{verbatim}

Abrir en el navegador el enlace que imprime el paso anterior.

\subsection*{Descripción del flujo de comunicación entre cliente, proxy y backend}

\subsubsection*{1) Conexiones que permanecen abiertas}

\textbf{Proxy \(\leftrightarrow\) Backend Java (TCP):} el proxy abre un \texttt{net.Socket()} hacia \texttt{127.0.0.1:9090} y lo mantiene vivo. Cada petición HTTP se traduce a una línea JSON (terminada en \verb|\n|) enviada por ese socket. Las respuestas del backend llegan por el evento \texttt{"data"}, se interpretan como JSON (línea a línea) y se devuelven al cliente como HTTP/JSON.

\textbf{Cliente (browser) \(\leftrightarrow\) Proxy (WebSocket):} además del canal HTTP, el navegador abre un WebSocket a \texttt{ws://localhost:3002}. El proxy reenvía por ese WS eventos entrantes que el backend emita (p.\,ej., mensajes recibidos), permitiendo “push” desde el servidor sin refrescar.

\subsubsection*{2) Patrón general (HTTP \(\rightarrow\) TCP \(\rightarrow\) HTTP) para operaciones ``pull''}

\paragraph{Cliente (HTTP POST) \(\rightarrow\) Proxy}
La UI envía \texttt{fetch} con JSON al proxy. Ejemplos reales del proyecto:
\begin{itemize}
  \item Registrar usuario \(\rightarrow\) \texttt{POST /register \{ username, clientIp \}}
  \item Enviar privado \(\rightarrow\) \texttt{POST /chat \{ sender, receiver, message \}}
  \item Historial \(\rightarrow\) \texttt{POST /history \{ user \}}
  \item Crear grupo \(\rightarrow\) \texttt{POST /group/create \{ groupName \}}
  \item Añadir a grupo \(\rightarrow\) \texttt{POST /group/add \{ groupName, members:[...] \}}
  \item Mensaje a grupo \(\rightarrow\) \texttt{POST /group/message \{ groupName, sender?, message \}}
\end{itemize}

\paragraph{Proxy (traducción) \(\rightarrow\) Backend Java (TCP JSON line-based)}
El proxy mapea cada endpoint HTTP a un comando JSON que el backend entiende, lo serializa y lo escribe por el socket, agregando \verb|\n| como delimitador de mensaje. Ejemplos exactos del código del proxy:
\begin{verbatim}
/register      -> {"command":"REGISTER","data":{"username":...,"clientIp":...}}\n
/chat          -> {"command":"MSG_USER","data":{"sender":...,"receiver":...,"message":...}}\n
/history       -> {"command":"GET_HISTORY","data":{"user":...}}\n
/group/create  -> {"command":"CREATE_GROUP","data":{"group":...}}\n
/group/add     -> {"command":"ADD_TO_GROUP","data":{"group":...,"members":[...]}}\n
/group/message -> {"command":"MSG_GROUP","data":{"group":...,"sender":...,"message":...}}\n
\end{verbatim}

\paragraph{Backend Java \(\rightarrow\) Proxy (TCP) \(\rightarrow\) Cliente (HTTP JSON)}
Cuando llega una respuesta por \texttt{"data"}, el proxy intenta parsear JSON y responde al \texttt{fetch} con \texttt{res.json(...)}. En flujos como \texttt{/chat} y \texttt{/history}, esto es directo; en \texttt{/register} y \texttt{/group/create} además se revisa si la respuesta incluye \texttt{"OK"} para decidir \texttt{200} o \texttt{409}. Si la respuesta no es JSON válido, se retorna el texto crudo para depurar.

\subsubsection*{3) Patrón ``push'' (eventos entrantes del backend \(\rightarrow\) navegador vía WebSocket)}
El proxy corre un \texttt{WebSocket.Server} en \texttt{:3002}. Cuando el backend envía por el socket TCP eventos con \texttt{command:"GET_MESSAGE"} (privado) o \texttt{command:"GET_MSG_GROUP"} (grupo), el proxy difunde ese JSON a todos los clientes WS conectados.

En el navegador, \texttt{Home.js} abre \texttt{new WebSocket("ws://localhost:3002")}, y en \texttt{onmessage} clasifica por \texttt{fullMessage.command}:
\begin{itemize}
  \item \texttt{GET_MESSAGE} \(\rightarrow\) renderiza \texttt{"Privado: \{sender\}: \{message\}"}.
  \item \texttt{GET_MSG_GROUP} \(\rightarrow\) renderiza \texttt{"\{group\}: \{sender\}: \{message\}"}.
\end{itemize}
Estos se insertan en el panel \texttt{“Mensajes recibidos (WebSocket)”} en tiempo real.

\subsubsection*{4) Ejemplos de extremo a extremo (con cargas reales del proyecto)}

\paragraph{Enviar mensaje privado (pull + ack):}
\begin{enumerate}
  \item UI \(\rightarrow\) \texttt{POST /chat} con \texttt{\{sender, receiver, message\}}.
  \item Proxy \(\rightarrow\) TCP: \texttt{\{"command":"MSG\_USER","data":\{...\}\}\textbackslash n}.
  \item Backend procesa y responde con JSON (p.\,ej., \texttt{\{"status":"OK","msgId":"...","timestamp":...\}}).
  \item Proxy \(\rightarrow\) UI: \texttt{200 OK} con ese JSON (se muestra en la UI).
\end{enumerate}

\paragraph{Mensaje de grupo y recepción ``push'':}
\begin{enumerate}
  \item UI \(\rightarrow\) \texttt{POST /group/message} con \texttt{\{groupName, message\}} (y \texttt{sender} si aplica).
  \item Proxy \(\rightarrow\) TCP: \texttt{\{"command":"MSG\_GROUP","data":\{...\}\}\textbackslash n}.
  \item Backend puede, además del \textit{ack}, emitir un evento \texttt{\{"command":"GET\_MSG\_GROUP","data":\{group,sender,message\}\}}.
  \item Proxy difunde por WS; la UI lo pinta en \texttt{“Mensajes recibidos (WebSocket)”} sin refresco.
\end{enumerate}

\paragraph{Historial (pull):}
\begin{enumerate}
  \item UI \(\rightarrow\) \texttt{POST /history} con \texttt{\{user\}} (el “logeado” en la UI).
  \item Proxy \(\rightarrow\) TCP: \texttt{\{"command":"GET\_HISTORY","data":{"user":...}\}\textbackslash n}.
  \item Backend devuelve listado (JSON); si no fuese JSON, el proxy retorna el texto crudo.
  \item UI abre un modal y muestra los mensajes ya convertidos a líneas legibles.
\end{enumerate}

\subsubsection*{5) Contratos, delimitación y manejo de errores}

\begin{itemize}
  \item \textbf{Delimitación de mensajes:} el proxy escribe una petición por línea (JSON + \verb|\n|) y consume respuestas por el evento \texttt{"data"}. Este contrato \textit{line-based} evita que el backend tenga que “rearmar” fragmentos TCP.
  \item \textbf{Mapeo de estados a HTTP:} cuando el backend responde con éxito (p.\,ej., contiene \texttt{"OK"} o JSON de éxito), el proxy responde \texttt{200}. En conflictos (p.\,ej., duplicados), el proxy devuelve \texttt{409}; y en fallos de conexión/parseo, \texttt{5xx}.
  \item \textbf{Canal de eventos:} cualquier JSON entrante con \texttt{command} conocido (\texttt{GET\_MESSAGE}, \texttt{GET\_MSG\_GROUP}) se emite a todos los WS conectados; el cliente clasifica y renderiza según \texttt{command} y \texttt{data}.
\end{itemize}

\subsection*{Integrantes del grupo}

\begin{itemize}
  \item [Nombre 1] – [Correo/Rol]
  \item [Nombre 2] – [Correo/Rol]
  \item [Nombre 3] – [Correo/Rol]
\end{itemize}
