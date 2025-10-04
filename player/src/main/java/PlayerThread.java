import java.util.LinkedList;
import java.util.Queue;

import javax.sound.sampled.AudioFormat;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.DataLine;
import javax.sound.sampled.SourceDataLine;

public class PlayerThread extends Thread{

    private static Queue<byte[]> audioBytes = new LinkedList<>();
    private boolean isPlay;
    private DataLine.Info infoSpeaker;
    private SourceDataLine speaker;

    public PlayerThread(AudioFormat format)throws Exception{
        infoSpeaker = new DataLine.Info(SourceDataLine.class, format);
        speaker = (SourceDataLine)AudioSystem.getLine(infoSpeaker);
        speaker.open();
        speaker.start();
    }

    public void setPlay(boolean isPlay) {
        this.isPlay = isPlay;
    }


    public void play(byte[] batch){
        audioBytes.add(batch);
        System.out.println("add bytes");
    }

    @Override
    public void run() {
        while (true) {
            try {
                if (isPlay) {
                    if(!audioBytes.isEmpty()){
                        byte[] current = audioBytes.poll();
                        if(current != null){
                            System.out.println("Repoduciendo audio ...");
                            speaker.write(current, 0, current.length);
                        }
                    }else{
                        Thread.yield();
                    }
                }else{
                    Thread.sleep(5000);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    
    }
    
}
