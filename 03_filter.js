import { Button, Canvas, Div, NumberInput, PullDownMenu } from "./canvas.js"

function play(ctx, buffer, filterNode) {
  filterNode.connect(ctx.destination)

  var source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true
  source.loopEnd = Number.MAX_VALUE
  source.connect(filterNode)
  source.start()

  return source
}

// wave[channel][frame]
function toAudioBuffer(ctx, wave) {
  var buffer = ctx.createBuffer(channel, frame, ctx.sampleRate)
  for (var ch = 0; ch < channel; ++ch) {
    buffer.copyToChannel(new Float32Array(wave[ch]), ch, 0)
  }
  return buffer
}

// ピーク 0.1 のノイズ。
function render(ctx, channel, frame) {
  var wave = new Array(channel)
  for (var ch = 0; ch < channel; ++ch) {
    wave[ch] = new Array(frame)
    for (var i = 0; i < wave[ch].length; ++i) {
      wave[ch][i] = 0.2 * (Math.random() - 0.5)
    }
  }
  return toAudioBuffer(ctx, wave)
}

var ctx = new AudioContext()

var channel = 2
var duration = 0.5 // 秒
var frame = Math.floor(duration * ctx.sampleRate)
var bufferNoise = render(ctx, channel, frame)

class MagResponseView extends Canvas {
  constructor(parent, width, height) {
    super(parent, width, height)

    this.path = new Array(width - 64)
    for (var i = 0; i < this.path.length; ++i) {
      this.path[i] = { x: i + 32, y: height * i / width }
    }

    this.freq = new Float32Array(this.path.length)
    var denom = this.freq.length - 1
    var min = Math.log(20)
    var diff = Math.log(20000) - min
    for (var i = 0; i < this.freq.length; ++i) {
      var ratio = i / denom
      this.freq[i] = Math.exp(diff * ratio + min)
    }

    this.mag = new Float32Array(this.path.length).fill(0)
    this.phase = new Float32Array(this.path.length).fill(0)
  }

  draw() {
    this.clearWhite()

    // magnitude. dB に変換して [-24, 24] の範囲が表示されるように正規化。
    for (var i = 0; i < this.path.length; ++i) {
      var decibel = 20 * Math.log10(this.mag[i])
      this.path[i].y = (-decibel / 48 + 0.5) * this.height
    }
    this.context.lineWidth = 1
    this.context.strokeStyle = "#000000"
    this.drawPath(this.path)

    // phase. 入力は [-π, π] 。
    for (var i = 0; i < this.path.length; ++i) {
      this.path[i].y = ((this.phase[i] / Math.PI + 1) % 1) * this.height
    }
    this.context.lineWidth = 0.3
    this.context.strokeStyle = "#0066bb"
    this.drawPath(this.path)

    // vertical grid
    this.context.strokeStyle = "#00000044"
    this.context.fillStyle = "#00000088"
    var len = 10
    for (var i = 0; i < len; ++i) {
      var index = Math.floor((this.mag.length - 1) * i / (len - 1))
      var x = index + 32
      var bottom = { x: x, y: this.height }
      this.drawLine({ x: x, y: 0 }, bottom)
      this.drawText(bottom, Math.floor(this.freq[index]))
    }

    // horizontal grid
    var xLeft = 32
    var xRight = this.width - 32
    for (var i = 0; i < 9; ++i) {
      var y = Math.floor(this.height * i / 8)
      this.drawLine({ x: xLeft, y: y }, { x: xRight, y: y })
      this.drawText({ x: 0, y: y }, 24 - 6 * i)
      this.drawText({ x: xRight, y: y + 12 }, 180 - 45 * i)
    }
  }
}

// Biquad
function createBiquadFilter(ctx, type, frequency, Q, gain = 0) {
  var filter = ctx.createBiquadFilter()
  filter.type = type
  filter.frequency.value = frequency
  filter.Q.value = Q
  filter.gain.value = gain
  return filter
}

var biquad = createBiquadFilter(ctx, "lowpass", 400, 1, 1)

function refreshBiquadView() {
  biquad.getFrequencyResponse(
    magResponseViewBiquad.freq,
    magResponseViewBiquad.mag,
    magResponseViewBiquad.phase
  )
  magResponseViewBiquad.draw()
}

var biquadSource = null
var isPlayingBiquad = false
var divTestBiquad = document.getElementById("divTestBiquad")

var divTestBiquadLeft = new Div(divTestBiquad,
  "divTestBiquadLeft", "divControl")

var magResponseViewBiquad = new MagResponseView(
  divTestBiquadLeft.element, 384, 256)

var divTestBiquadRight = new Div(divTestBiquad,
  "divTestBiquadRight", "divControl")

var buttonBiquadPlay = new Button(
  divTestBiquadRight.element,
  "Play",
  () => {
    if (isPlayingBiquad) {
      biquadSource.stop()
      biquadSource.disconnect()
      buttonBiquadPlay.element.value = "Play"
      isPlayingBiquad = false
    } else {
      biquadSource = play(ctx, bufferNoise, biquad)
      buttonBiquadPlay.element.value = "Stop"
      isPlayingBiquad = true
    }
  }
)

var numberInputBiquadFrequency = new NumberInput(divTestBiquadRight.element,
  "Frequency", biquad.frequency.value, 10, 10000, 0.01,
  (value) => {
    biquad.frequency.linearRampToValueAtTime(value, ctx.currentTime + 0.01)
    refreshBiquadView()
  },
  true
)

var numberInputBiquadQ = new NumberInput(divTestBiquadRight.element,
  "Q", biquad.Q.value, -24, 24, 0.01,
  (value) => {
    biquad.Q.linearRampToValueAtTime(value, ctx.currentTime + 0.01)
    refreshBiquadView()
  }
)

var numberInputBiquadGain = new NumberInput(divTestBiquadRight.element,
  "Gain", biquad.gain.value, -24, 24, 0.01,
  (value) => {
    biquad.gain.linearRampToValueAtTime(value, ctx.currentTime + 0.01)
    refreshBiquadView()
  }
)

var pullDownMenuBiquadType = new PullDownMenu(divTestBiquadRight.element,
  "Type",
  (value) => {
    biquad.type = value
    refreshBiquadView()
  }
)
pullDownMenuBiquadType.add("lowpass")
pullDownMenuBiquadType.add("highpass")
pullDownMenuBiquadType.add("bandpass")
pullDownMenuBiquadType.add("lowshelf")
pullDownMenuBiquadType.add("highshelf")
pullDownMenuBiquadType.add("peaking")
pullDownMenuBiquadType.add("notch")
pullDownMenuBiquadType.add("allpass")

refreshBiquadView()

// IIR
var iirCoefficient = {
  "b": [
    0.00018858189206768543,
    -0.0005606007584467169,
    0.00037204908964646603,
    0.00037204908964646603,
    -0.0005606007584467169,
    0.00018858189206768548
  ],
  "a": [
    1.0,
    -4.968966800082962,
    9.881614537955247,
    -9.83092498871195,
    4.892880615340862,
    -0.9746033040546616
  ]
}

var iir = ctx.createIIRFilter(iirCoefficient.b, iirCoefficient.a)

var divTestIir = document.getElementById("divTestIir")

var magResponseViewIir = new MagResponseView(
  divTestIir, 384, 256)
iir.getFrequencyResponse(
  magResponseViewIir.freq,
  magResponseViewIir.mag,
  magResponseViewIir.phase
)
magResponseViewIir.draw()

var iirSource = null
var isPlayingIir = false
var buttonIirPlay = new Button(
  divTestIir,
  "Play",
  () => {
    if (isPlayingIir) {
      iirSource.stop()
      iirSource.disconnect()
      buttonIirPlay.element.value = "Play"
      isPlayingIir = false
    } else {
      iirSource = play(ctx, bufferNoise, iir)
      buttonIirPlay.element.value = "Stop"
      isPlayingIir = true
    }
  }
)

// Convolver
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

var bufferPing = renderPing(ctx, 2, Math.floor(ctx.sampleRate / 5))
var convolver = ctx.createConvolver()
loadSample(ctx, "./freeverb.wav", (buffer) => { convolver.buffer = buffer })

var convolverSource = null
var isPlayingConvolver = false
var buttonConvolverPlay = new Button(
  document.getElementById("divTestConvolver"),
  "Play (Convolver)",
  () => {
    if (isPlayingConvolver) {
      convolverSource.stop()
      convolverSource.disconnect()
      buttonConvolverPlay.element.value = "Play (Convolver)"
      isPlayingConvolver = false
    } else {
      convolverSource = play(ctx, bufferPing, convolver)
      buttonConvolverPlay.element.value = "Stop (Convolver)"
      isPlayingConvolver = true
    }
  }
)

var gainNode = ctx.createGain()
var rawSource = null
var isPlayingRaw = false
var buttonRawPlay = new Button(
  document.getElementById("divTestConvolver"),
  "Play (Raw))",
  () => {
    if (isPlayingRaw) {
      rawSource.stop()
      rawSource.disconnect()
      buttonRawPlay.element.value = "Play (Raw))"
      isPlayingRaw = false
    } else {
      rawSource = play(ctx, bufferPing, gainNode)
      buttonRawPlay.element.value = "Stop (Raw))"
      isPlayingRaw = true
    }
  }
)

