import java.io.*;
import java.lang.Exception;
import java.net.*;
        import java.util.*;
        import java.util.concurrent.*;
        import com.zeroc.Ice.*;

public class Server {
    private static final int PORT = 9090;
    // username -> session
    protected static Map<String, ClientSession> clients = new ConcurrentHashMap<>();
    // groupName -> set of usernames
    protected static Map<String, Set<String>> groups = new ConcurrentHashMap<>();
    // historial en memoria
    protected static List<String> history = new CopyOnWriteArrayList<>();

    protected static Map<String, GroupCallInfo> activeGroupCalls = new ConcurrentHashMap<>();

    public static Map<String, Demo.ChatClientPrx> onlineClients = new ConcurrentHashMap<>();


    public static void main(String[] args) throws IOException {
        int port = (args.length > 0) ? Integer.parseInt(args[0]) : PORT;

        ServerSocket serverSocket = new ServerSocket(port);
        System.out.println("Servidor escuchando en puerto " + port);
        InetAddress localAddress = InetAddress.getLocalHost();
        System.out.println("Servidor escuchando en IP " + localAddress.getHostAddress() + " y puerto " + port);

        try {
            PersistenceManager.init();
            groups = PersistenceManager.loadGroups();
            System.out.println("Grupos cargados desde persistencia: " + groups.keySet());


            ExecutorService pool = Executors.newCachedThreadPool();

            new Thread(() ->{
                System.out.println("Hilo de aceptación REST iniciado...");
                while (true) {
                    try {
                        Socket clientSocket = serverSocket.accept();
                        pool.execute(new ClientSession(clientSocket));
                    }catch (Exception e){
                        e.printStackTrace();
                    }
                }

            }).start();


            Communicator communicator = Util.initialize(args);
            ObjectAdapter adapter = communicator.createObjectAdapterWithEndpoints("ChatAdapter", "ws -p 9099");

            adapter.add(new ChatServerImpl(), Util.stringToIdentity("ChatServer"));

            // Activar
            adapter.activate();
            System.out.println("Servidor ICE de Chat/Llamadas escuchando en puerto 9099...");

            communicator.waitForShutdown();


        } catch (IOException e) {
            e.printStackTrace();
        }


    }
}
