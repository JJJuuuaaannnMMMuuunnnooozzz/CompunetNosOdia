import javax.sound.sampled.AudioFormat;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.DataLine;
import javax.sound.sampled.SourceDataLine;
import javax.sound.sampled.TargetDataLine;

public class Capturer {

    public static void main(String[] args)throws Exception {
        AudioFormat format =  new AudioFormat(44100, 16, 1, true, true);

        DataLine.Info infoSpeaker = new DataLine.Info(SourceDataLine.class, format);
        SourceDataLine speaker = (SourceDataLine)AudioSystem.getLine(infoSpeaker);

        DataLine.Info infoMic = new DataLine.Info(TargetDataLine.class, format);
        TargetDataLine mic = (TargetDataLine)AudioSystem.getLine(infoMic);


        mic.open();
        speaker.open();

        mic.start();
        speaker.start();

        byte[] buffer = new byte[1024];

        while (true) {
            int resp = mic.read(buffer, 0, buffer.length);
            if(resp > 0){
                speaker.write(buffer, 0, resp);
            }
        }


        
    }
    
}
