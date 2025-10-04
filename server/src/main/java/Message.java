import java.io.Serializable;
import java.util.HashSet;
import java.util.Set;

public class Message implements Serializable{

    private String sender;
    private Set<String> recipients;
    private String content;
    private String type; // "TEXT", "GROUP_CREATE"
    private boolean isGroupMessage;

    public Message(String sender, Set<String> recipients, String content, String type, boolean isGroupMessage) {
        this.sender = sender;
        this.recipients = recipients;
        this.content = content;
        this.type = type;
        this.isGroupMessage = isGroupMessage;
    }

    // Getters
    public String getSender() { return sender; }
    public Set<String> getRecipients() { return recipients; }
    public String getContent() { return content; }
    public String getType() { return type; }
    public boolean isGroupMessage() { return isGroupMessage; }

    @Override
    public String toString() {
        return String.format("Message{sender='%s', recipients=%s, content='%s', type='%s', group=%s}",
                sender, recipients, content, type, isGroupMessage);
    }
    
}
