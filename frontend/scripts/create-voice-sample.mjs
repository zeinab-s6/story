import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "assets", "voice-sample.wav");

const sampleRate = 22050;
const segments = [
  { start: 0.0, dur: 0.55, freq: 165, amp: 0.35 },
  { start: 0.65, dur: 0.45, freq: 195, amp: 0.32 },
  { start: 1.2, dur: 0.7, freq: 175, amp: 0.38 },
  { start: 2.05, dur: 0.5, freq: 210, amp: 0.3 },
  { start: 2.7, dur: 0.85, freq: 180, amp: 0.36 },
  { start: 3.7, dur: 0.6, freq: 200, amp: 0.33 },
  { start: 4.45, dur: 0.75, freq: 170, amp: 0.34 },
  { start: 5.35, dur: 0.9, freq: 155, amp: 0.28 },
  { start: 6.4, dur: 1.1, freq: 145, amp: 0.22 },
];

const durationSec = 8;
const numSamples = Math.floor(sampleRate * durationSec);
const pcm = new Float32Array(numSamples);

for (const seg of segments) {
  const startIdx = Math.floor(seg.start * sampleRate);
  const endIdx = Math.min(numSamples, Math.floor((seg.start + seg.dur) * sampleRate));
  for (let i = startIdx; i < endIdx; i += 1) {
    const t = (i - startIdx) / sampleRate;
    const env = Math.sin((Math.PI * t) / seg.dur);
    const vibrato = 1 + 0.015 * Math.sin(2 * Math.PI * 5.5 * t);
    pcm[i] += seg.amp * env * Math.sin(2 * Math.PI * seg.freq * vibrato * t);
  }
}

for (let i = 0; i < numSamples; i += 1) {
  pcm[i] = Math.max(-1, Math.min(1, pcm[i] * 0.85));
}

const bitsPerSample = 16;
const numChannels = 1;
const dataSize = numSamples * numChannels * (bitsPerSample / 8);
const buffer = Buffer.alloc(44 + dataSize);

buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(numChannels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
buffer.writeUInt16LE(bitsPerSample, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(dataSize, 40);

for (let i = 0; i < numSamples; i += 1) {
  buffer.writeInt16LE(Math.round(pcm[i] * 32767), 44 + i * 2);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, buffer);
console.log("Created", outPath);
