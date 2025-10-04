import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.Socket;

public class Client {
    public static void main(String[] args)throws Exception {

        for (int i = 0; i < 10; i++) {
            new Thread(() ->{
                try {
                    
                    sendMessage();

                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
            ).start();
        }

    }

    static void sendMessage()throws Exception{
        Socket sc = new Socket("192.168.131.42", 9090);

        BufferedReader reader = 
            new BufferedReader(new InputStreamReader(sc.getInputStream()));

        BufferedWriter writer = 
            new BufferedWriter(new OutputStreamWriter(sc.getOutputStream()));

        writer.write("Hello Wordl");
        writer.newLine();
        writer.flush();

        String response = reader.readLine();
        System.out.println("Response  from server: "+response);
        reader.close();
        writer.close();
        sc.close();
    }
}
