import chatDelegate from "../services/ChatDelegate.js";


let audioCtx = null;
let bufferQueue = [];
let isPlaying = false;
let mediaStream = null;
let scriptProcessor = null;

const initAudioContext = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
    }
};

const convertPCM16ToFloat32 = (arrayBuffer, littleEndian = false) => {
    const buffer = arrayBuffer instanceof ArrayBuffer ? arrayBuffer : arrayBuffer.buffer;
    const view = new DataView(buffer);
    const float32Array = new Float32Array(arrayBuffer.byteLength / 2);

    for (let i = 0; i < float32Array.length; i++) {
        const sample = view.getInt16(i * 2, littleEndian);
        float32Array[i] = sample / 32768;
    }
    return float32Array;
};

const processQueue = () => {
    if (bufferQueue.length === 0) {
        isPlaying = false;
        return;
    }

    isPlaying = true;
    const floatArray = bufferQueue.shift();
    const audioBuffer = audioCtx.createBuffer(1, floatArray.length, 44100);
    audioBuffer.getChannelData(0).set(floatArray);

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.start();
    source.onended = processQueue;
};

export const playAudioChunk = (bytes) => {
    if (!bytes || bytes.length === 0) return;
    initAudioContext();
    const floatArray = convertPCM16ToFloat32(new Uint8Array(bytes).buffer, true);
    bufferQueue.push(floatArray);
    if (!isPlaying) processQueue();
};

export const startMicrophone = async (target, isGroup = false) => {
    initAudioContext();
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioCtx.createMediaStreamSource(mediaStream);
        scriptProcessor = audioCtx.createScriptProcessor(2048, 1, 1);

        scriptProcessor.onaudioprocess = (e) => {
            const input = e.inputBuffer.getChannelData(0);

            const buffer = new ArrayBuffer(input.length * 2);
            const view = new DataView(buffer);
            for (let i = 0; i < input.length; i++) {
                let s = Math.max(-1, Math.min(1, input[i]));
                view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            }

            const bytes = new Uint8Array(buffer);
            // Enviar según si es grupo o usuario individual
            if (isGroup) {
                chatDelegate.sendGroupAudio(target, bytes);
            } else {
                chatDelegate.sendAudioChunck(target, bytes);
            }
        };

        source.connect(scriptProcessor);
        scriptProcessor.connect(audioCtx.destination);

    } catch (err) {
        console.error("Error al acceder al micrófono:", err);
        alert("No se pudo acceder al micrófono.");
    }
};

export const stopMicrophone = () => {
    console.log("Deteniendo micrófono...");

    if (mediaStream) {
        mediaStream.getTracks().forEach(track => {
            track.stop();
            console.log("Track detenido:", track.kind);
        });
        mediaStream = null;
    }

    if (scriptProcessor) {
        scriptProcessor.onaudioprocess = null;

        scriptProcessor.disconnect();
        scriptProcessor = null;
    }
};

