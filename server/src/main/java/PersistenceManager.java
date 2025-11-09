import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;

import java.lang.reflect.Type;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

import javax.sound.sampled.AudioFileFormat;
import javax.sound.sampled.AudioFormat;
import javax.sound.sampled.AudioInputStream;
import javax.sound.sampled.AudioSystem;

public class PersistenceManager {
    private static final String BASE_DIR = "server_history";
    private static final String MSG_FILE = BASE_DIR + "/messages.json";
    private static final String GROUP_FILE = BASE_DIR + "/groups.json";
    private static final String AUDIO_DIR = BASE_DIR + "/audio";

    private static final Gson gson = new GsonBuilder().setPrettyPrinting().disableHtmlEscaping().create();

    public static void init() throws IOException {
        Files.createDirectories(Paths.get(BASE_DIR));
        Files.createDirectories(Paths.get(AUDIO_DIR));
        Path msg = Paths.get(MSG_FILE);
        if (!Files.exists(msg)) {
            Files.write(msg, "[]".getBytes(StandardCharsets.UTF_8), StandardOpenOption.CREATE);
        }
        Path groups = Paths.get(GROUP_FILE);
        if (!Files.exists(groups)) {
            Files.write(groups, "{}".getBytes(StandardCharsets.UTF_8), StandardOpenOption.CREATE);
        }
    }

    // -------- mensajes ----------
    public static synchronized void saveMessage(String sender, String receiver, String type, String content) {
        try {
            List<Map<String, String>> messages = loadMessages();
            Map<String, String> entry = new LinkedHashMap<>();
            entry.put("timestamp", Long.toString(System.currentTimeMillis()));
            entry.put("from", sender);
            entry.put("to", receiver);
            entry.put("type", type);
            entry.put("content", content);
            messages.add(entry);
            String json = gson.toJson(messages);
            Files.write(Paths.get(MSG_FILE), json.getBytes(StandardCharsets.UTF_8),
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static List<Map<String, String>> loadMessages() {
        try {
            String json = Files.readString(Paths.get(MSG_FILE), StandardCharsets.UTF_8);
            Type listType = new TypeToken<List<Map<String, String>>>() {
            }.getType();
            List<Map<String, String>> msgs = gson.fromJson(json, listType);
            return msgs != null ? msgs : new ArrayList<>();
        } catch (IOException e) {
            return new ArrayList<>();
        }
    }

    // -------- grupos: usamos Set<String> internamente ----------
    public static synchronized void saveGroups(Map<String, Set<String>> groups) {
        try {
            // Convertir a Map<String, List<String>> para serializar JSON de forma estable
            Map<String, List<String>> out = new LinkedHashMap<>();
            for (Map.Entry<String, Set<String>> e : groups.entrySet()) {
                out.put(e.getKey().trim(), new ArrayList<>(e.getValue()));
            }
            String json = gson.toJson(out);
            Files.write(Paths.get(GROUP_FILE), json.getBytes(StandardCharsets.UTF_8),
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static Map<String, Set<String>> loadGroups() {
        try {
            String json = Files.readString(Paths.get(GROUP_FILE), StandardCharsets.UTF_8);
            Type tmpType = new TypeToken<Map<String, List<String>>>() {
            }.getType();
            Map<String, List<String>> tmp = gson.fromJson(json, tmpType);
            Map<String, Set<String>> result = new LinkedHashMap<>();
            if (tmp != null) {
                for (Map.Entry<String, List<String>> e : tmp.entrySet()) {
                    Set<String> members = new LinkedHashSet<>();
                    for (String member : e.getValue()) {
                        members.add(member.trim());
                    }
                    result.put(e.getKey().trim(), members);
                }
            }

            return result;
        } catch (IOException e) {
            return new LinkedHashMap<>();
        }
    }

    // -------- audio ----------
    public static synchronized String saveAudio(byte[] data, String prefix) throws IOException {
        
        String filename = prefix + "_" + System.currentTimeMillis() + ".wav";
        Path path = Paths.get(AUDIO_DIR, filename);

        // Define el mismo formato que usaste al grabar
        AudioFormat format = new AudioFormat(44100, 16, 1, true, true);

        // Crea un AudioInputStream a partir de los bytes PCM
         try (ByteArrayInputStream bais = new ByteArrayInputStream(data);
         AudioInputStream ais = new AudioInputStream(bais, format, data.length / format.getFrameSize())) {
            AudioSystem.write(ais, AudioFileFormat.Type.WAVE, path.toFile());
        }
        
        return path.toString();

    }
}
