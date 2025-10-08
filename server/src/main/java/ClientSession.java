import java.io.*;
import java.net.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class ClientSession implements Runnable {
    private Socket socket;
    private BufferedReader in;
    private PrintWriter out;
    private String username;
    private String clientIp;

    public ClientSession(Socket socket) {
        this.socket = socket;
        this.clientIp = socket.getInetAddress().getHostAddress();
    }

    public void sendMessage(String msg) {
        out.println(msg);
    }

    public void run() {
        try {
            in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            out = new PrintWriter(socket.getOutputStream(), true);

            // Registro inicial
            out.println("Ingresa tu nombre de usuario:");
            username = in.readLine();

            if (username == null || username.isBlank()) {
                out.println("Nombre inválido. Desconectando...");
                socket.close();
                return;
            }

            if (Server.clients.containsKey(username)) {
                out.println("Usuario ya en uso, desconectando...");
                socket.close();
                return;
            }

            Server.clients.put(username, this);
            out.println("Bienvenido " + username + "!");

            String line;
            while ((line = in.readLine()) != null) {
                processCommand(line.trim());
            }

        } catch (IOException e) {
            System.out.println("Cliente desconectado: " + username);
        } finally {
            if (username != null) {
                Server.clients.remove(username);
            }
            try {
                socket.close();
            } catch (IOException ignored) {
            }
        }
    }

    private void processCommand(String line) {
        try {
            String[] parts = line.split(" ", 3);
            String cmd = parts[0];

            switch (cmd) {
                case "MSG_USER":
                    if (parts.length < 3) {
                        sendMessage("Uso: MSG_USER <usuario> <mensaje>");
                        break;
                    }
                    String user = parts[1];
                    String msgU = "[" + username + " -> " + user + "]: " + parts[2];
                    Server.history.add(msgU);

                    if (Server.clients.containsKey(user)) {
                        Server.clients.get(user).sendMessage(msgU);
                        sendMessage("Mensaje enviado a " + user);
                    } else {
                        sendMessage("Usuario '" + user + "' no encontrado.");
                    }
                    break;

                case "CREATE_GROUP":
                    if (parts.length < 2) {
                        sendMessage("Uso: CREATE_GROUP <nombreGrupo>");
                        break;
                    }
                    String group = parts[1];
                    if (Server.groups.containsKey(group)) {
                        sendMessage("El grupo '" + group + "' ya existe.");
                    } else {
                        Server.groups.put(group, ConcurrentHashMap.newKeySet());
                        Server.groups.get(group).add(username);
                        sendMessage("Grupo '" + group + "' creado y te uniste.");
                    }
                    break;

                case "ADD_TO_GROUP":
                    if (parts.length < 3) {
                        sendMessage("Uso: ADD_TO_GROUP <grupo> <usuario>");
                        break;
                    }
                    String g = parts[1];
                    String targetUser = parts[2];

                    if (!Server.groups.containsKey(g)) {
                        sendMessage("El grupo '" + g + "' no existe.");
                        break;
                    }
                    if (!Server.clients.containsKey(targetUser)) {
                        sendMessage("El usuario '" + targetUser + "' no está conectado.");
                        break;
                    }

                    Server.groups.get(g).add(targetUser);
                    sendMessage("Usuario '" + targetUser + "' agregado al grupo '" + g + "'.");
                    Server.clients.get(targetUser).sendMessage("Has sido agregado al grupo '" + g + "'.");
                    break;

                case "MSG_GROUP":
                    if (parts.length < 3) {
                        sendMessage("Uso: MSG_GROUP <grupo> <mensaje>");
                        break;
                    }
                    String gName = parts[1];
                    String msgG = "[" + username + " @ " + gName + "]: " + parts[2];
                    Server.history.add(msgG);

                    if (Server.groups.containsKey(gName)) {
                        for (String member : Server.groups.get(gName)) {
                            if (Server.clients.containsKey(member) && !member.equals(username)) {
                                Server.clients.get(member).sendMessage(msgG);
                            }
                        }
                        sendMessage("Mensaje enviado al grupo '" + gName + "'.");
                    } else {
                        sendMessage("Grupo '" + gName + "' no existe.");
                    }
                    break;

                case "VOICE_USER":
                    if (parts.length < 3) {
                        sendMessage("Uso: VOICE_USER <usuario> <audioBase64>");
                        break;
                    }
                    String toUser = parts[1];
                    String audio64 = parts[2];

                    if (Server.clients.containsKey(toUser)) {
                        Server.clients.get(toUser).sendMessage("VOICE_FROM " + username + " " + audio64);
                        sendMessage("Nota de voz enviada a " + toUser);
                    } else {
                        sendMessage("Usuario '" + toUser + "' no encontrado.");
                    }
                    break;

                case "VOICE_GROUP":
                    if (parts.length < 3) {
                        sendMessage("Uso: VOICE_GROUP <grupo> <audioBase64>");
                        break;
                    }
                    String groupName = parts[1];
                    String audio64Group = parts[2];

                    // Verificar que el grupo exista
                    if (!Server.groups.containsKey(groupName)) {
                        sendMessage("El grupo '" + groupName + "' no existe.");
                        break;
                    }

                    // Reenviar la nota de voz a todos los miembros conectados del grupo (excepto al
                    // emisor)
                    for (String member : Server.groups.get(groupName)) {
                        if (!member.equals(username) && Server.clients.containsKey(member)) {
                            Server.clients.get(member).sendMessage("VOICE_FROM " + username + " " + audio64Group);
                        }
                    }

                    sendMessage("Nota de voz enviada al grupo '" + groupName + "'.");

                    break;


                case "CALL_USER":
                    if (parts.length < 3) {
                        sendMessage("Uso: CALL_USER <usuario> <puertoUDP>");
                        break;
                    }

                    String targetUserCall = parts[1];
                    int callerUdpPort = Integer.parseInt(parts[2]);
                    ClientSession targetSession = Server.clients.get(targetUserCall);

                    if (targetSession != null) {
                        targetSession.sendMessage("CALL_FROM " + this.username + " " + this.clientIp + " " + callerUdpPort);
                        sendMessage("Llamando a " + targetUserCall + "...");

                    } else {
                        sendMessage("Usuario '" + targetUserCall + "' no encontrado o desconectado.");
                    }
                    break;

                case "ACCEPT_CALL":
                    if (parts.length < 3) {
                        sendMessage("Uso: ACCEPT_CALL <usuario> <puertoUDP>");
                        break;
                    }
                    String targetUserAccept = parts[1];
                    int receiverUdpPort = Integer.parseInt(parts[2]);
                    ClientSession callerSession = Server.clients.get(targetUserAccept);

                    if (callerSession != null) {
                        callerSession.sendMessage("CALL_ACCEPTED " + this.username + " " + this.clientIp + " " + receiverUdpPort);
                        sendMessage("Llamada aceptada, notificando a " + targetUserAccept);
                    } else {
                        sendMessage("El usuario que llamó (" + targetUserAccept + ") ya se desconectó.");
                    }
                    break;

                case "CALL_GROUP":
                    if (parts.length < 2) {
                        sendMessage("Uso: CALL_GROUP <nombreGrupo>");
                        break;
                    }

                    String groupNameCall = parts[1];
                    Set<String> members = Server.groups.get(groupNameCall);

                    if (members == null) {
                        sendMessage("El grupo '" + groupNameCall + "' no existe.");
                        break;
                    }

                    for (String member : members) {
                        if (!member.equals(username)) {
                            ClientSession s = Server.clients.get(member);
                            if (s != null) {
                                s.sendMessage("CALL_FROM " + this.username + " " + this.clientIp + " " /**+ this.udpPort*/);
                            }
                        }
                    }

                    sendMessage("Llamada enviada al grupo '" + groupNameCall + "'.");
                    break;


                default:
                    sendMessage("Comando no reconocido.");
            }

        } catch (Exception e) {
            sendMessage("Error al procesar comando: " + e.getMessage());
        }
    }


}
