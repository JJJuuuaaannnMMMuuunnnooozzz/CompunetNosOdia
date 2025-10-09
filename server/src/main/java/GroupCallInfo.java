import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

class GroupCallInfo {
    private String groupName;
    private Map<String, ParticipantInfo> participants;

    public GroupCallInfo(String groupName) {
        this.groupName = groupName;
        this.participants = new ConcurrentHashMap<>();
    }

    public void addParticipant(String username, String ip, int port) {
        participants.put(username, new ParticipantInfo(ip, port));
        System.out.println("Participante " + username + " agregado a llamada grupal '" + groupName + "' en " + ip + ":" + port);
    }

    public void removeParticipant(String username) {
        participants.remove(username);
        System.out.println("Participante " + username + " removido de llamada grupal '" + groupName + "'");
    }

    public Map<String, ParticipantInfo> getParticipants() {
        return participants;
    }

    public String getGroupName() {
        return groupName;
    }
}