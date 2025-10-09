import java.io.*;
import java.net.*;
import java.util.*;
import java.util.concurrent.*;

public class Server {
    private static final int PORT = 9090; 
    // username -> session
    protected static Map<String, ClientSession> clients = new ConcurrentHashMap<>();
    // groupName -> set of usernames
    protected static Map<String, Set<String>> groups = new ConcurrentHashMap<>();
    // historial en memoria
    protected static List<String> history = new CopyOnWriteArrayList<>();

    protected static Map<String, GroupCallServer> activeGroupCalls = new ConcurrentHashMap<>();


    public static void main(String[] args) throws IOException {

        int port = (args.length > 0) ? Integer.parseInt(args[0]) : PORT;

        ServerSocket serverSocket = new ServerSocket(port);
        System.out.println("Servidor escuchando en puerto " + port);
        InetAddress localAddress = InetAddress.getLocalHost();
        System.out.println("Servidor escuchando en IP " + localAddress.getHostAddress() + " y puerto " + port);

        // Dentro del método main o constructor de Server.java

        try {
            PersistenceManager.init();
            groups = PersistenceManager.loadGroups();
            System.out.println("Grupos cargados desde persistencia: " + groups.keySet());
        } catch (IOException e) {
            e.printStackTrace();
        }


        ExecutorService pool = Executors.newCachedThreadPool();

        while (true) {
            Socket clientSocket = serverSocket.accept();
            pool.execute(new ClientSession(clientSocket));
        }
    }
}
