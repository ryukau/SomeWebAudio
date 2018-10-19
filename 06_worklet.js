import { Button, NumberInput } from "./canvas.js"

function toAudioBuffer(ctx, wave) {
  var channel = wave.length
  var frame = wave[0].length
  var buffer = ctx.createBuffer(channel, frame, ctx.sampleRate)
  for (var ch = 0; ch < channel; ++ch) {
    buffer.copyToChannel(new Float32Array(wave[ch]), ch, 0)
  }
  return buffer
}

function renderPing(ctx, channel, frame) {
  var wave = new Array(channel)
  for (var ch = 0; ch < channel; ++ch) {
    wave[ch] = new Array(frame)
    var freq = 1000 * (ch + 1)
    var two_pi_f_per_fs = 2 * Math.PI * freq / ctx.sampleRate
    for (var i = 0; i < wave[ch].length; ++i) {
      var decay = (frame - i - 1) / frame
      wave[ch][i] = 0.2 * decay * decay * Math.sin(i * two_pi_f_per_fs)
    }
  }
  return toAudioBuffer(ctx, wave)
}

function createBiquadFilter(ctx, type, frequency, Q, gain = 0) {
  var filter = ctx.createBiquadFilter()
  filter.type = type
  filter.frequency.value = frequency
  filter.Q.value = Q
  filter.gain.value = gain
  return filter
}

function createGain(ctx, gain) {
  var gainNode = ctx.createGain()
  gainNode.gain.value = gain
  return gainNode
}

function createDelay(ctx, time, maxTime) {
  var delay = ctx.createDelay(maxTime)
  delay.delayTime.value = time
  return delay
}

function createStereoPanner(ctx, pan) {
  var panner = ctx.createStereoPanner()
  panner.pan.value = pan
  return panner
}

function createWaveShaper(ctx, curve) {
  var shaper = ctx.createWaveShaper()
  shaper.oversample = "4x"
  shaper.curve = new Float32Array(curve)
  return shaper
}

var ctx = new AudioContext()

var bufferPing = renderPing(ctx, 2, Math.floor(ctx.sampleRate / 5))

var bypassNode
ctx.audioWorklet.addModule("06_processor.js").then(() => {
  bypassNode = new AudioWorkletNode(ctx, "bypass-processor")
})

var divBypass = document.getElementById("divBypass")

var buttonPlayPing = new Button(divBypass, "Play Bypass",
  () => {
    var source = ctx.createBufferSource()
    source.buffer = bufferPing
    source.connect(bypassNode)
    bypassNode.connect(ctx.destination)
    source.start()
  }
)
