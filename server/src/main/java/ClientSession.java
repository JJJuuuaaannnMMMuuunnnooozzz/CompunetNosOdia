import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import dtos.Request;

import java.io.*;
import java.net.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class ClientSession implements Runnable {
    private Socket socket;
    private BufferedReader in;
    private BufferedWriter out;
    private String username;
    private String clientIp;
    private Gson gson;

    public ClientSession(Socket socket) throws IOException {
        InetSocketAddress remote = (InetSocketAddress) socket.getRemoteSocketAddress();
        this.clientIp = remote.getAddress().getHostAddress();
        this.socket = socket;
    }

    public void sendMessage(String msg) {
        System.out.println("Sending message: " + msg);
        try {
            out.write(msg + "\n");
            out.flush();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

    }

    public String getClientIp() {
        return clientIp;
    }

    public void run() {
        try {
            in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            out = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream()));
            gson = new Gson();

            String line;
            while ((line = in.readLine()) != null) {
                processCommand(line);
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

    private void processCommand(String command) {
        try {
            System.out.println("[DEBUG] JSON recibido: " + command);
            String response = "";
            Request rq = gson.fromJson(command, Request.class);

            switch (rq.getCommand()) {
                case "REGISTER":
                    username = rq.getData().get("username").getAsString().trim();
                    clientIp = rq.getData().get("clientIp").getAsString().trim();
                    Server.clients.put(username, this);

                    response = "OK";

                    break;
                case "MSG_USER":

                    String user = rq.getData().get("receiver").getAsString().trim();
                    String msgU = rq.getData().get("message").getAsString().trim();
                    Server.history.add(msgU);

                    if (Server.clients.containsKey(user)) {
                        rq.setCommand("GET_MESSAGE");
                        String ms = gson.toJson(rq);
                        Server.clients.get(user).sendMessage(ms);
                        PersistenceManager.saveMessage(username, user, "text", msgU);

                        response = "OK";

                    } else {
                        response = "ERROR";
                    }
                    break;
                case "CREATE_GROUP":

                    String group = rq.getData().get("group").getAsString().trim();
                    System.out.println("Creating group: " + group);
                    if (Server.groups.containsKey(group)) {
                        System.out.println("Group " + group + " already exists");
                        response = "ERROR";
                    } else {
                        Set<String> members = Collections.newSetFromMap(new ConcurrentHashMap<>());
                        members.add(username);
                        Server.groups.put(group, members);
                        PersistenceManager.saveGroups(Server.groups);
                        response = "OK";
                    }
                    break;

                case "ADD_TO_GROUP":
                    JsonElement membersElement = rq.getData().get("members");
                    List<String> users = new ArrayList<>();

                    if (membersElement.isJsonArray()) {
                        for (JsonElement elem : membersElement.getAsJsonArray()) {
                            users.add(elem.getAsString().trim());
                        }
                    } else {
                        users.add(membersElement.getAsString().trim());
                    }

                    System.out.println("Adding members: " + users);
                    String groupName = rq.getData().get("group").getAsString().trim();
                    System.out.println("Adding group: " + groupName);

                    if (!Server.groups.containsKey(groupName)) {
                        response = "ERROR: Grupo no existe";
                        break;
                    }

                    for (String u : users) {
                        Server.groups.get(groupName).add(u.trim());
                    }

                    PersistenceManager.saveGroups(Server.groups);
                    response = "OK";
                    break;

                case "MSG_GROUP":
                    String gName = rq.getData().get("group").getAsString().trim();

                    if (!Server.groups.containsKey(gName)) {
                        response = "ERROR: Grupo no existe";
                        break;
                    }

                    List<String> receivers = Server.groups.get(gName).stream().toList();

                    // CAMBIO: Crear el formato correcto para el mensaje
                    JsonObject responseData = new JsonObject();
                    responseData.addProperty("group", gName);
                    responseData.addProperty("sender", username);
                    responseData.addProperty("message", rq.getData().get("message").getAsString());

                    JsonObject fullResponse = new JsonObject();
                    fullResponse.addProperty("command", "GET_MSG_GROUP");
                    fullResponse.add("data", responseData);

                    String msg = gson.toJson(fullResponse);

                    for (String r : receivers) {
                        if (Server.clients.containsKey(r) && !r.equals(username)) {
                            Server.clients.get(r).sendMessage(msg);
                        }
                    }

                    PersistenceManager.saveMessage(username, gName, "text", rq.getData().get("message").getAsString());
                    response = "OK";
                    break;

                case "GET_HISTORY":
                    System.out.println("Consultando historial para: " + username);

                    // Cargar mensajes y grupos
                    List<Map<String, String>> allMessages = PersistenceManager.loadMessages();
                    Map<String, Set<String>> groups = PersistenceManager.loadGroups();

                    // Determinar en qué grupos participa el usuario
                    Set<String> userGroups = new HashSet<>();
                    for (Map.Entry<String, Set<String>> entry : groups.entrySet()) {
                        if (entry.getValue().contains(username)) {
                            userGroups.add(entry.getKey());
                        }
                    }

                    List<Map<String, String>> filtered = new ArrayList<>();

                    for (Map<String, String> msgh : allMessages) {
                        String from = msgh.get("from");
                        String to = msgh.get("to"); // puede ser usuario o nombre de grupo
                        // String type = msgh.get("type"); // no lo usamos para distinguir grupo/privado

                        // 1) Mensajes privados relacionados con el usuario (emisor o receptor igual a
                        // username)
                        if (username.equals(from) || (to != null && username.equals(to))) {
                            filtered.add(msgh);
                            continue;
                        }

                        // 2) Mensajes dirigidos a un grupo: if 'to' es nombre de grupo y el usuario
                        // pertenece a ese grupo
                        if (to != null && groups.containsKey(to) && userGroups.contains(to)) {
                            filtered.add(msgh);
                            continue;
                        }

                        // si no cumple ninguna condición, no añadir
                    }

                    JsonObject fullHistoryResponse = new JsonObject();
                    fullHistoryResponse.addProperty("command", "HISTORY_RESULT");
                    fullHistoryResponse.add("data", gson.toJsonTree(filtered));

                    sendMessage(gson.toJson(fullHistoryResponse));
                    response = "OK";
                    break;

                /*
                 * 
                 * 
                 * 
                 * 
                 * 
                 * case "VOICE_USER":
                 * if (parts.length < 3) {
                 * sendMessage("Uso: VOICE_USER <usuario> <audioBase64>");
                 * break;
                 * }
                 * String toUser = parts[1];
                 * String audio64 = parts[2];
                 * 
                 * byte[] audioBytes = Base64.getDecoder().decode(audio64);
                 * String filePath = PersistenceManager.saveAudio(audioBytes, "voice_" +
                 * username + "_to_" + toUser);
                 * 
                 * if (Server.clients.containsKey(toUser)) {
                 * Server.clients.get(toUser).sendMessage("VOICE_FROM " + username + " " +
                 * audio64);
                 * PersistenceManager.saveMessage(username, toUser, "voice", filePath);
                 * sendMessage("Nota de voz enviada a " + toUser);
                 * } else {
                 * sendMessage("Usuario '" + toUser + "' no encontrado.");
                 * }
                 * break;
                 * 
                 * case "VOICE_GROUP":
                 * if (parts.length < 3) {
                 * sendMessage("Uso: VOICE_GROUP <grupo> <audioBase64>");
                 * break;
                 * }
                 * String groupName = parts[1];
                 * String audio64Group = parts[2];
                 * 
                 * 
                 * // Verificar que el grupo exista
                 * 
                 * byte[] GAudioBytes = Base64.getDecoder().decode(audio64Group);
                 * String filePathG = PersistenceManager.saveAudio(GAudioBytes, "voice_" +
                 * username + "_to_" + groupName);
                 * 
                 * 
                 * if (!Server.groups.containsKey(groupName)) {
                 * sendMessage("El grupo '" + groupName + "' no existe.");
                 * break;
                 * }
                 * 
                 * // Reenviar la nota de voz a todos los miembros conectados del grupo (excepto
                 * al
                 * // emisor)
                 * for (String member : Server.groups.get(groupName)) {
                 * if (!member.equals(username) && Server.clients.containsKey(member)) {
                 * Server.clients.get(member).sendMessage("VOICE_FROM " + username + " " +
                 * audio64Group);
                 * }
                 * }
                 * 
                 * PersistenceManager.saveMessage(username, groupName, "voice", filePathG);
                 * sendMessage("Nota de voz enviada al grupo '" + groupName + "'.");
                 * 
                 * break;
                 * 
                 * case "CALL_USER":
                 * if (parts.length < 3) {
                 * sendMessage("Uso: CALL_USER <usuario> <puertoUDP>");
                 * break;
                 * }
                 * 
                 * String targetUserCall = parts[1];
                 * int callerUdpPort = Integer.parseInt(parts[2]);
                 * ClientSession targetSession = Server.clients.get(targetUserCall);
                 * 
                 * if (targetSession != null) {
                 * targetSession.sendMessage("CALL_FROM " + this.username + " " + this.clientIp
                 * + " " + callerUdpPort);
                 * sendMessage("Llamando a " + targetUserCall + "...");
                 * } else {
                 * sendMessage("Usuario '" + targetUserCall +
                 * "' no encontrado o desconectado.");
                 * }
                 * break;
                 * 
                 * case "ACCEPT_CALL":
                 * if (parts.length < 3) {
                 * sendMessage("Uso: ACCEPT_CALL <usuario> <puertoUDP>");
                 * break;
                 * }
                 * String targetUserAccept = parts[1];
                 * int receiverUdpPort = Integer.parseInt(parts[2]);
                 * ClientSession callerSession = Server.clients.get(targetUserAccept);
                 * 
                 * if (callerSession != null) {
                 * callerSession.sendMessage("CALL_ACCEPTED " + this.username + " " +
                 * this.clientIp + " " + receiverUdpPort);
                 * sendMessage("Llamada aceptada, notificando a " + targetUserAccept);
                 * } else {
                 * sendMessage("El usuario que llamó (" + targetUserAccept +
                 * ") ya se desconectó.");
                 * }
                 * break;
                 * 
                 * case "END_CALL":
                 * if (parts.length < 2) {
                 * sendMessage("Uso: END_CALL <usuario>");
                 * break;
                 * }
                 * String targetEndUser = parts[1];
                 * ClientSession targetEndSession = Server.clients.get(targetEndUser);
                 * 
                 * if (targetEndSession != null) {
                 * targetEndSession.sendMessage("CALL_ENDED " + this.username);
                 * sendMessage("Has colgado la llamada con " + targetEndUser);
                 * } else {
                 * sendMessage("El usuario " + targetEndUser + " no está conectado.");
                 * }
                 * break;
                 * 
                 * case "CALL_GROUP":
                 * if (parts.length < 3) {
                 * sendMessage("Uso: CALL_GROUP <nombreGrupo> <puertoUDP>");
                 * break;
                 * }
                 * 
                 * String groupNameCall = parts[1];
                 * int initiatorPort = Integer.parseInt(parts[2]);
                 * Set<String> members = Server.groups.get(groupNameCall);
                 * 
                 * if (members == null) {
                 * sendMessage("El grupo '" + groupNameCall + "' no existe.");
                 * break;
                 * }
                 * 
                 * if (Server.activeGroupCalls.containsKey(groupNameCall)) {
                 * sendMessage("Ya hay una llamada activa en este grupo.");
                 * break;
                 * }
                 * 
                 * 
                 * GroupCallInfo callInfo = new GroupCallInfo(groupNameCall);
                 * callInfo.addParticipant(username, this.clientIp, initiatorPort);
                 * Server.activeGroupCalls.put(groupNameCall, callInfo);
                 * 
                 * for (String member : members) {
                 * if (!member.equals(username) && Server.clients.containsKey(member)) {
                 * Server.clients.get(member).sendMessage(
                 * "INCOMING_GROUP_CALL " + groupNameCall + " " + username + " " +
                 * this.clientIp + " " + initiatorPort
                 * );
                 * }
                 * }
                 * 
                 * sendMessage("Llamada grupal iniciada en '" + groupNameCall + "'");
                 * break;
                 * 
                 * case "JOIN_GROUP_CALL":
                 * if (parts.length < 3) {
                 * sendMessage("Uso: JOIN_GROUP_CALL <nombreGrupo> <puertoUDP>");
                 * break;
                 * }
                 * 
                 * String groupToJoin = parts[1];
                 * int joinPort = Integer.parseInt(parts[2]);
                 * 
                 * GroupCallInfo activeCall = Server.activeGroupCalls.get(groupToJoin);
                 * if (activeCall == null) {
                 * sendMessage("No hay llamada activa para el grupo '" + groupToJoin + "'.");
                 * break;
                 * }
                 * 
                 * 
                 * for (Map.Entry<String, ParticipantInfo> entry :
                 * activeCall.getParticipants().entrySet()) {
                 * String existingUser = entry.getKey();
                 * ParticipantInfo pInfo = entry.getValue();
                 * 
                 * if (!existingUser.equals(username) &&
                 * Server.clients.containsKey(existingUser)) {
                 * 
                 * Server.clients.get(existingUser).sendMessage(
                 * "GROUP_CALL_PARTICIPANT " + groupToJoin + " " + username + " " +
                 * this.clientIp + " " + joinPort
                 * );
                 * 
                 * 
                 * sendMessage(
                 * "GROUP_CALL_PARTICIPANT " + groupToJoin + " " + existingUser + " " +
                 * pInfo.ip + " " + pInfo.port
                 * );
                 * }
                 * }
                 * 
                 * activeCall.addParticipant(username, this.clientIp, joinPort);
                 * sendMessage("Te has unido a la llamada grupal '" + groupToJoin + "'");
                 * break;
                 * 
                 * case "END_GROUP_CALL":
                 * if (parts.length < 2) {
                 * sendMessage("Uso: END_GROUP_CALL <nombreGrupo>");
                 * break;
                 * }
                 * 
                 * String groupToEnd = parts[1];
                 * GroupCallInfo callToEnd = Server.activeGroupCalls.get(groupToEnd);
                 * 
                 * if (callToEnd == null) {
                 * sendMessage("No hay llamada activa para el grupo '" + groupToEnd + "'.");
                 * break;
                 * }
                 * 
                 * callToEnd.removeParticipant(username);
                 * 
                 * for (String participant : callToEnd.getParticipants().keySet()) {
                 * if (Server.clients.containsKey(participant)) {
                 * Server.clients.get(participant).sendMessage("GROUP_CALL_LEFT " + groupToEnd +
                 * " " + username);
                 * }
                 * }
                 * 
                 * sendMessage("Has salido de la llamada grupal '" + groupToEnd + "'.");
                 * 
                 * if (callToEnd.getParticipants().isEmpty()) {
                 * Server.activeGroupCalls.remove(groupToEnd);
                 * System.out.println("Llamada grupal '" + groupToEnd +
                 * "' finalizada (sin participantes).");
                 * }
                 * break;
                 * 
                 */

                default:
                    sendMessage("Comando no reconocido.");
            }

            sendMessage(response);

        } catch (Exception e) {
            sendMessage("Error al procesar comando: " + e.getMessage());
            e.printStackTrace();
        }
    }
}