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
                    System.out.println("[DEBUG] Usuario: " + username);
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

                    List<Map<String, String>> allMessages = PersistenceManager.loadMessages();
                    Map<String, Set<String>> groups = PersistenceManager.loadGroups();

                    Set<String> userGroups = new HashSet<>();
                    for (Map.Entry<String, Set<String>> entry : groups.entrySet()) {
                        if (entry.getValue().contains(username)) {
                            userGroups.add(entry.getKey());
                        }
                    }

                    List<Map<String, String>> filtered = new ArrayList<>();

                    for (Map<String, String> msgh : allMessages) {
                        String from = msgh.get("from");
                        String to = msgh.get("to");

                        if (username.equals(from) || (to != null && username.equals(to))) {
                            filtered.add(msgh);
                            continue;
                        }

                        if (to != null && groups.containsKey(to) && userGroups.contains(to)) {
                            filtered.add(msgh);
                            continue;
                        }

                    }
                    JsonObject fullHistoryResponse = new JsonObject();
                    fullHistoryResponse.addProperty("command", "HISTORY_RESULT");
                    fullHistoryResponse.add("data", gson.toJsonTree(filtered));

                    sendMessage(gson.toJson(fullHistoryResponse));
                    response = "OK";
                    break;




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