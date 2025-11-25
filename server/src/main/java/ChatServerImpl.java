import Demo.ChatClientPrx;
import Demo.ChatServer;
import com.zeroc.Ice.Current;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;


public class ChatServerImpl implements ChatServer {
    // Mapa para rastrear llamadas grupales activas: groupName -> Set de participantes
    private static Map<String, Set<String>> activeGroupCalls = new ConcurrentHashMap<>();
    @Override
    public void register(String username, ChatClientPrx client, Current current) {
        ChatClientPrx fixedClient = client.ice_fixed(current.con);
        Server.onlineClients.put(username, fixedClient);
        System.out.println("Usuario registrado para llamadas: " + username);

        current.con.setCloseCallback(conn -> {
            Server.onlineClients.remove(username);
            System.out.println("Usuario desconectado: " + username);
        });
    }

    @Override
    public void initiateCall(String fromUser, String toUser, Current current) {
        System.out.println("Intento de llamada: " + fromUser + " -> " + toUser);
        ChatClientPrx target = Server.onlineClients.get(toUser);

        if (target != null) {
            try {
                // Avisar al destinatario que tiene una llamada
                target.incomingCallAsync(fromUser);
            } catch (Exception e) {
                System.out.println("Error al contactar usuario: " + toUser);
            }
        } else {
            System.out.println("Usuario destino no encontrado o desconectado.");
        }
    }

    @Override
    public void answerCall(String fromUser, String toUser, Current current) {
        System.out.println("Llamada aceptada por " + fromUser);
        ChatClientPrx caller = Server.onlineClients.get(toUser); // 'toUser' es el que llamó originalmente
        if (caller != null) {
            caller.callAcceptedAsync(fromUser);
        }
    }

    @Override
    public void rejectCall(String fromUser, String toUser, Current current) {
        ChatClientPrx caller = Server.onlineClients.get(toUser);
        if (caller != null) {
            caller.callRejectedAsync(fromUser);
        }
    }

    @Override
    public void sendAudio(String fromUser, String toUser, byte[] data, Current current) {
        // Retransmitir el audio directamente al destinatario
        ChatClientPrx target = Server.onlineClients.get(toUser);
        if (target != null) {
            // Enviar async para no bloquear
            System.out.println("Recibido audio de " + fromUser + " para " + toUser + ", bytes: " + data.length);
            target.receiveAudioAsync(data);
        }

    }

    //Este es el metodo del servidor para enviar o redirigir las notas de voz

    @Override
    public void sendVoiceNote(String fromUser, String toUser, byte[] data, Current current) {
        System.out.println("Retransmitiendo nota de voz de " + fromUser + " a " + toUser + " (" + data.length + " bytes)");

        ChatClientPrx target = Server.onlineClients.get(toUser);
        if (target != null) {
            // Enviar los bytes directamente al cliente destino
            target.receiveVoiceNoteAsync(fromUser, data);
        } else {
            System.out.println("Usuario " + toUser + " no encontrado para nota de voz.");
        }
    }

    @Override
    public void sendGroupVoiceNote(String fromUser, String groupName, byte[] data, Current current) {
        System.out.println("Nota de voz de grupo: " + fromUser + " -> " + groupName);

        // Validar que si este el grupo
        Set<String> members = Server.groups.get(groupName);
        if (members == null) {
            System.out.println("Grupo no encontrado: " + groupName);
            return;
        }

        // Iterar sobre cada miembro
        for (String member : members) {
            // que no me llegue a mi mismo
            //if (member.equals(fromUser)) continue;

            // Validamos que este activo entre los usuatios de mi array de Ice
            Demo.ChatClientPrx client = Server.onlineClients.get(member);
            if (client != null) {

                // Formatear sender como "Grupo:Usuario"
                String displaySender = groupName + ":" + fromUser;
                client.receiveVoiceNoteAsync(displaySender, data);
            }
        }
    }

    @Override
    public void initiateGroupCall(String fromUser, String groupName, Current current) {
        System.out.println("Iniciando llamada grupal: " + fromUser + " -> grupo " + groupName);
        
        // Verificar que el grupo existe
        Set<String> groupMembers = Server.groups.get(groupName);
        if (groupMembers == null || groupMembers.isEmpty()) {
            System.out.println("Grupo no encontrado: " + groupName);
            return;
        }

        // Crear o actualizar la llamada grupal
        Set<String> participants = activeGroupCalls.computeIfAbsent(groupName, k -> ConcurrentHashMap.newKeySet());
        participants.add(fromUser);

        // Notificar a todos los miembros del grupo (excepto al que inició)
        for (String member : groupMembers) {
            if (!member.equals(fromUser)) {
                ChatClientPrx memberClient = Server.onlineClients.get(member);
                if (memberClient != null) {
                    try {
                        memberClient.incomingGroupCallAsync(groupName, fromUser);
                        System.out.println("Notificando a " + member + " sobre llamada grupal");
                    } catch (Exception e) {
                        System.out.println("Error notificando a " + member + ": " + e.getMessage());
                    }
                }
            }
        }
    }

    @Override
    public void answerGroupCall(String fromUser, String groupName, Current current) {
        System.out.println("Usuario " + fromUser + " aceptó llamada grupal " + groupName);
        
        // Agregar al participante a la llamada grupal
        Set<String> participants = activeGroupCalls.get(groupName);
        if (participants == null) {
            System.out.println("Llamada grupal no existe: " + groupName);
            return;
        }

        participants.add(fromUser);

        // Notificar a todos los participantes existentes sobre el nuevo participante
        for (String participant : participants) {
            if (!participant.equals(fromUser)) {
                ChatClientPrx participantClient = Server.onlineClients.get(participant);
                if (participantClient != null) {
                    try {
                        participantClient.groupCallAcceptedAsync(groupName, fromUser);
                        System.out.println("Notificando a " + participant + " que " + fromUser + " se unió");
                    } catch (Exception e) {
                        System.out.println("Error notificando a " + participant + ": " + e.getMessage());
                    }
                }
            }
        }
    }

    @Override
    public void sendGroupAudio(String fromUser, String groupName, byte[] data, Current current) {
        // Enviar audio a todos los participantes de la llamada grupal (excepto al emisor)
        Set<String> participants = activeGroupCalls.get(groupName);
        if (participants == null || participants.isEmpty()) {
            System.out.println("Llamada grupal no activa: " + groupName);
            return;
        }

        System.out.println("Enviando audio grupal de " + fromUser + " a grupo " + groupName + " (" + participants.size() + " participantes)");

        for (String participant : participants) {
            if (!participant.equals(fromUser)) {
                ChatClientPrx participantClient = Server.onlineClients.get(participant);
                if (participantClient != null) {
                    try {
                        participantClient.receiveAudioAsync(data);
                    } catch (Exception e) {
                        System.out.println("Error enviando audio a " + participant + ": " + e.getMessage());
                    }
                }
            }
        }
    }

}
