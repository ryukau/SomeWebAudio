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
    var freq = 60
    var two_pi_f_per_fs = 2 * Math.PI * freq / ctx.sampleRate
    for (var i = 0; i < wave[ch].length; ++i) {
      var decay = (frame - i - 1) / frame
      decay *= decay * decay
      wave[ch][i] = 0.1 * decay * (
        + 0.10 * Math.sin(i * 1 * two_pi_f_per_fs)
        + 0.40 * Math.sin(i * 2 * two_pi_f_per_fs)
        + 0.10 * Math.sin(i * 3 * two_pi_f_per_fs)
        + 0.30 * Math.sin(i * 8 * two_pi_f_per_fs)
        + 1.00 * Math.sin(i * 9 * two_pi_f_per_fs)
        + 0.70 * Math.sin(i * 10 * two_pi_f_per_fs)
        + 0.10 * Math.sin(i * 13 * two_pi_f_per_fs)
        + 0.01 * Math.sin(i * 15 * two_pi_f_per_fs)
      )
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

var bufferPing = renderPing(ctx, 2, 2 * ctx.sampleRate)

// ----------------------------------------------------------------------------
// Wave Shaper
// ----------------------------------------------------------------------------

// Rectification
var shaperHalfRect = createWaveShaper(ctx, [0, 0, 1])
var shaperFullRect = createWaveShaper(ctx, [1, 0, 1])

shaperHalfRect.connect(ctx.destination)
shaperFullRect.connect(ctx.destination)

var divRectification = document.getElementById("divRectification")

var buttonPlayPingRect = new Button(divRectification, "Play Dry",
  () => {
    var source = ctx.createBufferSource()
    source.buffer = bufferPing
    source.connect(ctx.destination)
    source.start()
  }
)

var buttonPlayHalfWaveRect = new Button(divRectification, "Play Half Rect",
  () => {
    var source = ctx.createBufferSource()
    source.buffer = bufferPing
    source.connect(shaperHalfRect)
    source.start()
  }
)

var buttonPlayFullWaveRect = new Button(divRectification, "Play Full Rect",
  () => {
    var source = ctx.createBufferSource()
    source.buffer = bufferPing
    source.connect(shaperFullRect)
    source.start()
  }
)

// Some curve
function createCurve(cycle) {
  var curve = new Float32Array(1023)

  var denom = curve.length - 1
  var cycle_4_pi = 4 * cycle * Math.PI
  for (var i = 0; i < curve.length; ++i) {
    var x = (i / denom - 0.5) * cycle_4_pi
    curve[i] = x === 0 ? 0 : (1 - Math.cos(x)) / x
  }

  return curve
}

var shaperSomeCurve = createWaveShaper(ctx, createCurve(16))
shaperSomeCurve.connect(ctx.destination)

var divSomeShaper = document.getElementById("divSomeShaper")

var buttonPlayPingShaper = new Button(divSomeShaper, "Play Dry",
  () => {
    var source = ctx.createBufferSource()
    source.buffer = bufferPing
    source.connect(ctx.destination)
    source.start()
  }
)

var buttonPlayShaper = new Button(divSomeShaper, "Play Wet",
  () => {
    var source = ctx.createBufferSource()
    source.buffer = bufferPing
    source.connect(shaperSomeCurve)
    source.start()
  }
)

var numberInputCompressorAttack = new NumberInput(divSomeShaper, "cycle",
  16, 1, 64, 0.01, (value) => {
    shaperSomeCurve.curve = createCurve(value)
  },
  true
)

// ----------------------------------------------------------------------------
// Compressor
// ----------------------------------------------------------------------------
function createKarplusStrongFilter(ctx, pitch, cutoff) {
  var delay = createDelay(ctx, 1 / pitch, 4)
  var filter = createBiquadFilter(ctx, "lowpass", cutoff, -3, 0)
  var gain = createGain(ctx, 0.99)

  var input = gain
  var output = gain

  delay.connect(filter)
  filter.connect(gain)
  gain.connect(delay)

  return { input, output, delay, filter, gain }
}

function renderNoiseBurst(ctx, channel, frame) {
  var wave = new Array(channel)
  for (var ch = 0; ch < channel; ++ch) {
    wave[ch] = new Array(frame)
    var frame_sub_1 = frame - 1
    for (var i = 0; i < frame; ++i) {
      wave[ch][i] = 0.1 * (frame_sub_1 - i) / frame * Math.random()
    }
  }
  return toAudioBuffer(ctx, wave)
}

function createDynamicsCompressor(
  ctx,
  attack,
  release,
  threshold,
  ratio,
  knee
) {
  var compressor = ctx.createDynamicsCompressor()
  compressor.attack.value = attack
  compressor.release.value = release
  compressor.threshold.value = threshold
  compressor.ratio.value = ratio
  compressor.knee.value = knee
  return compressor
}

class ChordGen {
  constructor(base, scaleDiff, chord) {
    this.base = base
    this.scaleDiff = scaleDiff
    this.chord = chord

    this.scaleCumSum = new Array(this.scaleDiff.length + 1)
    this.fillScaleCumSum()
  }

  fillScaleCumSum() {
    this.scaleCumSum[0] = 0
    for (var i = 0; i < this.scaleDiff.length; ++i) {
      this.scaleCumSum[i + 1] = this.scaleCumSum[i] + this.scaleDiff[i]
    }
  }

  rotateScale() {
    var cnt = Math.floor(Math.random() * this.scaleDiff.length)
    for (var i = 0; i < cnt; ++i) {
      this.scaleDiff.push(this.scaleDiff.shift())
    }
    this.fillScaleCumSum()
  }

  getRandomElement(array) {
    return array[Math.floor(array.length * Math.random())]
  }

  midiToFreq(n) {
    return 440 * Math.pow(2, (n - 69) / 12)
  }

  clampInt(value, min, max) {
    return Math.max(min, Math.min(Math.floor(value), max))
  }

  createChordInFreq() {
    var base = this.getRandomElement(this.base)
    var chord = this.getRandomElement(this.chord)
    var freq = new Array(chord.length)
    for (var i = 0; i < freq.length; ++i) {
      var degree = this.clampInt(chord[i], 0, this.scaleCumSum.length - 1)
      freq[i] = this.midiToFreq(
        base + this.scaleCumSum[degree] + 0.001 * Math.random()
      )
    }
    return freq
  }
}

function playCompressor(buffer, timeoutID) {
  var freq = chordgen.createChordInFreq()
  var startTime = ctx.currentTime + 0.1
  var endTime = startTime + 0.4

  var i
  for (i = 0; i < freq.length; ++i) {
    if (ksFilter.length <= i) break

    // 1 / freq のとき Karplus-Strong のピッチがずれる。
    // 適当な定数 130 / ctx.sampleRate を引いてそれなりにピッチを合わせた。
    ksFilter[i].delay.delayTime.setValueAtTime(
      1.0 / freq[i] - 130 / ctx.sampleRate,
      startTime)
  }
  for (; i < ksFilter.length; ++i) {
    ksFilter[i].gain.gain.setValueAtTime(0, startTime)
  }

  var source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(compDemoInput)
  source.start(startTime)

  timeoutID.id = setTimeout(
    playCompressor,
    seqSpeed * (1 + Math.floor(Math.random() * 2)),
    buffer,
    timeoutID
  )
}

var chordgen = new ChordGen(
  [48, 53, 55],
  [2, 2, 1, 2, 2, 2, 1],
  [
    [0, 2, 4],
    [0, 2, 5],
    [0, 3, 5],
    [0, 4, 5],
    [1, 4, 5]
  ]
)

var bufferNoiseBurst = renderNoiseBurst(ctx, 2, ctx.sampleRate / 100)

var compDemoInput = createGain(ctx, 1)
var compressor = createDynamicsCompressor(ctx, 0.001, 0.06, -24, 8, 40)
var ksFilter = new Array(3)

for (var i = 0; i < ksFilter.length; ++i) {
  ksFilter[i] = createKarplusStrongFilter(ctx, 220, 8000)
  ksFilter[i].output.connect(compressor)
  compDemoInput.connect(ksFilter[i].input)
}
compressor.connect(ctx.destination)

var divCompressor = document.getElementById("divCompressor")

var seqSpeed = 1000
var timeoutID = { id: null }
var isPlaying = false
var buttonCompressor = new Button(
  divCompressor,
  "Start Sequence",
  () => {
    if (isPlaying) {
      clearTimeout(timeoutID.id)
      clearInterval(timeoutID.id)
      buttonCompressor.element.value = "Start Sequence"
      isPlaying = false
    } else {
      playCompressor(bufferNoiseBurst, timeoutID)
      buttonCompressor.element.value = "Stop Sequence"
      isPlaying = true
    }
  }
)

var numberInputCompressorAttack = new NumberInput(divCompressor, "Seq Speed",
  1000, 50, 1000, 1, (value) => seqSpeed = value, true
)

var numberInputCompressorAttack = new NumberInput(divCompressor, "Attack",
  0.001, 0, 1, 0.0001, (value) => {
    compressor.attack.linearRampToValueAtTime(value, ctx.currentTime + 0.01)
  },
  true
)

var numberInputCompressorRelease = new NumberInput(divCompressor, "Release",
  0.06, 0, 1, 0.0001, (value) => {
    compressor.release.linearRampToValueAtTime(value, ctx.currentTime + 0.01)
  },
  true
)

var numberInputCompressorThreshold = new NumberInput(divCompressor, "Threshold",
  -24, -100, 0, 0.001, (value) => {
    compressor.threshold.linearRampToValueAtTime(value, ctx.currentTime + 0.01)
  }
)

var numberInputCompressorRatio = new NumberInput(divCompressor, "Ratio",
  8, 1, 20, 0.01, (value) => {
    compressor.ratio.linearRampToValueAtTime(value, ctx.currentTime + 0.01)
  }
)

var numberInputCompressorKnee = new NumberInput(divCompressor, "Knee",
  40, 0, 40, 0.01, (value) => {
    compressor.knee.linearRampToValueAtTime(value, ctx.currentTime + 0.01)
  }
)
