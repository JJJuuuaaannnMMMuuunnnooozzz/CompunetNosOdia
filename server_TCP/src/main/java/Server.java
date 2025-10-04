import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;

public class Server {

    private static int acc = 0;
    private static Semaphore semaphore = new Semaphore(1);
    public static void main(String[] args)throws Exception {

        Executor ex = Executors.newFixedThreadPool(50);

        InetAddress address = Inet4Address.getByName("192.168.131.42");
        final ServerSocket socket = new ServerSocket(9090, 200, address);


        Runtime.getRuntime().addShutdownHook(new Thread(() ->{
            try {
                socket.close();
            } catch (Exception e) {
                e.printStackTrace();
            }

        }));

        do{
            Socket sc = socket.accept();
            ex.execute(() -> {
                try {
                    responder(sc);
                    
                } catch (Exception e) {
                    e.printStackTrace();
                }

            });
            
        }while(true);
        
    }

    public static void responder(Socket sc)throws Exception{

        BufferedReader reader = 
                    new BufferedReader(new InputStreamReader(sc.getInputStream()));

        BufferedWriter writer = 
            new BufferedWriter(new OutputStreamWriter(sc.getOutputStream()));

        String msg = reader.readLine();
        //System.out.println("Mensaje del Cliente: "+msg);
        
        semaphore.acquire();
        acc++;
        System.out.println("Cliente #: "+acc);
        writer.write("Cliente #: "+acc);
        semaphore.release();
        

        writer.newLine();
        writer.flush();

        reader.close();
        writer.close();
        sc.close();
    }
}
