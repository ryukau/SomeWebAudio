function play(ctx, buffer) {
  var source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  source.start()
}

// wave[channel][frame]
function toAudioBuffer(ctx, wave) {
  var buffer = ctx.createBuffer(wave.length, wave[0].length, ctx.sampleRate)
  for (var ch = 0; ch < channel; ++ch) {
    buffer.copyToChannel(new Float32Array(wave[ch]), ch, 0)
  }
  return buffer
}

// channel_0: 1000Hz, channel_1: 2000Hz のサイン波。
function render(ctx, channel, frame) {
  var wave = new Array(channel)
  for (var ch = 0; ch < channel; ++ch) {
    wave[ch] = new Array(frame)
    var freq = 1000 * (ch + 1)
    var two_pi_f_per_fs = 2 * Math.PI * freq / ctx.sampleRate
    for (var i = 0; i < wave[ch].length; ++i) {
      wave[ch][i] = 0.1 * Math.sin(i * two_pi_f_per_fs)
    }
  }
  return toAudioBuffer(ctx, wave)
}

function loadSample(ctx, path, callback) {
  var request = new XMLHttpRequest()
  request.open("GET", path, true)
  request.responseType = "arraybuffer"
  request.onreadystatechange = () => {
    if (request.readyState !== 4) return
    ctx.decodeAudioData(request.response, (buffer) => callback(buffer))
  }
  request.send()
}

var ctx = new AudioContext()

var channel = 2
var duration = 0.5 // 秒
var frame = Math.floor(duration * ctx.sampleRate)

var bufSin = render(ctx, channel, frame)

var bufCymbal
loadSample(ctx, "./wavecymbal.wav", (buffer) => { bufCymbal = buffer })

var bufPluck
loadSample(ctx, "./pluck.mp3", (buffer) => { bufPluck = buffer })

var bufSingen
loadSample(ctx, "./singen.opus", (buffer) => { bufSingen = buffer })

// UI
import { Button } from "./canvas.js"

var div = document.getElementById("divScript")

var buttonSin = new Button(div, "Play SineWave",
  () => { play(ctx, bufSin) })
var buttonCymbal = new Button(div, "Play wav",
  () => { play(ctx, bufCymbal) })
var buttonPluck = new Button(div, "Play mp3",
  () => { play(ctx, bufPluck) })
var buttonSingen = new Button(div, "Play opus",
  () => { play(ctx, bufSingen) })
