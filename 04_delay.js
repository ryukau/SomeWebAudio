import { Button, NumberInput } from "./canvas.js"

function play(ctx, buffer, filter) {
  var source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(filter)
  filter.connect(ctx.destination)
  source.start()
}

// wave[channel][frame]
function toAudioBuffer(ctx, wave) {
  var channel = wave.length
  var frame = wave[0].length
  var buffer = ctx.createBuffer(channel, frame, ctx.sampleRate)
  for (var ch = 0; ch < channel; ++ch) {
    buffer.copyToChannel(new Float32Array(wave[ch]), ch, 0)
  }
  return buffer
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

function renderPing(ctx, channel, frame) {
  var wave = new Array(channel)
  for (var ch = 0; ch < channel; ++ch) {
    wave[ch] = new Array(frame)
    var two_pi_per_fs = 2 * Math.PI / ctx.sampleRate

    wave[ch][0] = 0
    for (var i = 1; i < wave[ch].length; ++i) {
      var decay = (frame - i - 1) / frame
      wave[ch][i] = 0.2 * decay * decay
        * Math.sin(i * two_pi_per_fs
          * (1000 + 8 * wave[ch][i - 1])
          + 0.1 * Math.random())
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

var ctx = new AudioContext()

// ----------------------------------------------------------------------------
// Comb
// ----------------------------------------------------------------------------

function craeteCombFilter(ctx, time, feedback) {
  var delay = createDelay(ctx, time, 4)
  var gain = createGain(ctx, feedback)

  var input = createGain(ctx, 1)
  var output = input

  input.connect(delay)
  delay.connect(gain)
  gain.connect(output)

  return { input, output, delay, gain }
}

var bufferPing = renderPing(ctx, 2, Math.floor(ctx.sampleRate / 5))
var comb = craeteCombFilter(ctx, 0.15, 0.9)

var divComb = document.getElementById("divComb")

var buttonPlayComb = new Button(divComb, "Play",
  () => {
    var source = ctx.createBufferSource()
    source.buffer = bufferPing
    source.connect(comb.input)
    comb.output.connect(ctx.destination)
    source.start()
  }
)

var buttonPanicComb = new Button(divComb, "Panic",
  () => {
    comb.output.disconnect()
    comb = craeteCombFilter(
      ctx,
      numberInputCombTime.value,
      numberInputCombFeedback.value
    )
  }
)

var numberInputCombTime = new NumberInput(divComb, "Time",
  0.15, 0, 4, 0.01, (value) => {
    comb.delay.delayTime.linearRampToValueAtTime(value, ctx.currentTime + 0.01)
  }, true
)

var numberInputCombFeedback = new NumberInput(divComb, "Feedback",
  0.9, 0, 0.999, 0.001, (value) => {
    comb.gain.gain.linearRampToValueAtTime(value, ctx.currentTime + 0.01)
  }
)

// ----------------------------------------------------------------------------
// PingPongDelay
// ----------------------------------------------------------------------------

function createPingPongDelay(ctx, time, feedback, pan) {
  var delayL = createDelay(ctx, time, 4)
  var gainL = createGain(ctx, feedback)
  var pannerL = createStereoPanner(ctx, pan)

  var delayR = createDelay(ctx, time, 4)
  var gainR = createGain(ctx, feedback)
  var pannerR = createStereoPanner(ctx, -pan)

  var input = createGain(ctx, 1)
  var output = createGain(ctx, 1)

  input.connect(delayL)
  input.connect(output)

  delayL.connect(gainL)
  gainL.connect(pannerL)
  pannerL.connect(delayR)
  delayR.connect(gainR)
  gainR.connect(pannerR)
  pannerR.connect(delayL)

  pannerL.connect(output)
  pannerR.connect(output)

  return { input, output, delayL, gainL, pannerL, delayR, gainR, pannerR }
}

var pingpong = createPingPongDelay(ctx, 0.43, 0.5, 1)

var divPingPong = document.getElementById("divPingPong")

var buttonPlayComb = new Button(divPingPong, "Play",
  () => {
    var source = ctx.createBufferSource()
    source.buffer = bufferPing
    source.connect(pingpong.input)
    pingpong.output.connect(ctx.destination)
    source.start()
  }
)

var buttonPanicComb = new Button(divPingPong, "Panic",
  () => {
    pingpong.output.disconnect()
    pingpong = createPingPongDelay(
      ctx,
      numberInputCombTime.value,
      numberInputPingPongFeedback.value,
      numberInputPingPongPan.value
    )
  }
)

var numberInputCombTime = new NumberInput(divPingPong, "Time",
  0.43, 0, 4, 0.01, (value) => {
    pingpong.delayL.delayTime.linearRampToValueAtTime(
      value, ctx.currentTime + 0.01 + 0.01 * Math.random())
    pingpong.delayR.delayTime.linearRampToValueAtTime(
      value, ctx.currentTime + 0.01 + 0.01 * Math.random())
  }, true
)

var numberInputPingPongFeedback = new NumberInput(divPingPong, "Feedback",
  0.5, 0, 0.999, 0.001, (value) => {
    pingpong.gainL.gain.linearRampToValueAtTime(
      value, ctx.currentTime + 0.01 + 0.01 * Math.random())
    pingpong.gainR.gain.linearRampToValueAtTime(
      value, ctx.currentTime + 0.01 + 0.01 * Math.random())
  }
)

var numberInputPingPongPan = new NumberInput(divPingPong, "Pan",
  1, -1, 1, 0.001, (value) => {
    pingpong.pannerL.pan.linearRampToValueAtTime(
      value, ctx.currentTime + 0.01 + 0.01 * Math.random())
    pingpong.pannerR.pan.linearRampToValueAtTime(
      -value, ctx.currentTime + 0.01 + 0.01 * Math.random())
  }
)

// ----------------------------------------------------------------------------
// Karplus-Strong
// ----------------------------------------------------------------------------

function createKarplusStrongFilter(ctx, pitch, cutoff) {
  // 1 / freq のとき Karplus-Strong のピッチがずれる。
  // 適当な定数 60 / ctx.sampleRate を足してピッチを合わせた。
  var delay = createDelay(ctx, 1 / pitch + 60 / ctx.sampleRate, 4)
  var filter = createBiquadFilter(ctx, "lowpass", cutoff, -3, 0)
  var gain = createGain(ctx, 0.99)

  var input = gain
  var output = gain

  delay.connect(filter)
  filter.connect(gain)
  gain.connect(delay)

  return { input, output, delay, filter, gain }
}

var bufferNoiseBurst = renderNoiseBurst(ctx, 2, ctx.sampleRate / 100)
var ksFilter = createKarplusStrongFilter(ctx, 220, 2000)

var divKarplusStrong = document.getElementById("divKarplusStrong")

var buttonPlayKS = new Button(divKarplusStrong, "Play",
  () => { play(ctx, bufferNoiseBurst, ksFilter.output) }
)

var buttonPanicKS = new Button(divKarplusStrong, "Panic",
  () => {
    ksFilter.gain.disconnect()
    ksFilter = createKarplusStrongFilter(
      ctx,
      numberInputPitch.value,
      numberInputCutoff.value
    )
  }
)

var numberInputPitch = new NumberInput(divKarplusStrong, "Pitch[Hz]",
  220, 20, 10000, 0.01,
  (value) => {
    ksFilter.delay.delayTime.linearRampToValueAtTime(
      1 / value + 60 / ctx.sampleRate,
      ctx.currentTime + 0.01
    )
  },
  true
)

var numberInputCutoff = new NumberInput(divKarplusStrong, "Cutoff[Hz]",
  2000, 20, 10000, 0.01,
  (value) => {
    ksFilter.filter.frequency.linearRampToValueAtTime(
      value,
      ctx.currentTime + 0.01
    )
  },
  true
)

// ----------------------------------------------------------------------------
// Freeverb
// ----------------------------------------------------------------------------

// Lowpass-feedBack-Comb-Filter
function createLBCF(ctx, time, feedback, frequency, Q) {
  // 念のために1サンプル余分にバッファを確保する。
  var delay = ctx.createDelay(time + 1.5 / ctx.sampleRate)
  delay.delayTime.value = time
  var filter = createBiquadFilter(ctx, "lowpass", frequency, Q, 0)
  var gain = createGain(ctx, feedback)

  delay.connect(filter)
  filter.connect(gain)
  gain.connect(delay)

  return { delay, filter, gain }
}

function createAllpass(ctx, time, gain) {
  var delay = ctx.createDelay(time + 1.5 / ctx.sampleRate)
  delay.delayTime.value = time
  var gainForward = createGain(ctx, gain)
  var gainBack = createGain(ctx, gain)
  var highpass = createBiquadFilter(ctx, "highpass", 20, -6, 0)

  delay.connect(highpass)
  gainForward.connect(highpass)
  highpass.connect(gainBack)
  gainBack.connect(delay)
  gainBack.connect(gainForward)

  return { delay, gainForward, gainBack, highpass }
}

function createFreeverb(ctx, channel) {
  const numLbcf = 8
  const numAllpass = 4

  var apGain = 0.5
  var randTimeAP = () => 0.012 * Math.random() + 0.004
  var randTimeLBCF = () => 0.08 * Math.random() + 0.02
  var randFreqLBCF = () => 400 * Math.pow(2, 5 * Math.random())

  var reverb = new Array(channel)
  for (var ch = 0; ch < reverb.length; ++ch) {
    var inputGain = createGain(ctx, 1 / 16)
    var outputGain = createGain(ctx, 1)

    var allpass = new Array(numAllpass)
    allpass[0] = createAllpass(ctx, randTimeAP(), apGain)
    for (var i = 1; i < allpass.length; ++i) {
      allpass[i] = createAllpass(ctx, randTimeAP(), apGain)
      allpass[i - 1].highpass.connect(allpass[i].delay)
      allpass[i - 1].highpass.connect(allpass[i].gainForward)
    }
    allpass[allpass.length - 1].delay.connect(outputGain)
    allpass[allpass.length - 1].gainForward.connect(outputGain)

    var lbcf = new Array(numLbcf)
    for (var i = 0; i < lbcf.length; ++i) {
      lbcf[i] = createLBCF(ctx, randTimeLBCF(), 0.85, randFreqLBCF(), -6)
      inputGain.connect(lbcf[i].delay)
      inputGain.connect(allpass[0].delay)
      inputGain.connect(allpass[0].gainForward)
      lbcf[i].delay.connect(allpass[0].delay)
      lbcf[i].delay.connect(allpass[0].gainForward)
    }

    reverb[ch] = { inputGain, outputGain, allpass, lbcf }
  }

  var input = ctx.createChannelSplitter(2)
  input.connect(reverb[0].inputGain, 0)
  input.connect(reverb[1].inputGain, 1)

  var merger = ctx.createChannelMerger(2)
  reverb[0].outputGain.connect(merger, 0, 0)
  reverb[1].outputGain.connect(merger, 0, 1)

  var output = createGain(ctx, 0.5)
  merger.connect(output)

  return { input, output, reverb }
}

var gain = createGain(ctx, 1)
var freeverb = createFreeverb(ctx, 2)

var divFreeverb = document.getElementById("divFreeverb")

var buttonPlayFreeverbPingWet = new Button(divFreeverb, "Play Wet",
  () => {
    var source = ctx.createBufferSource()
    source.buffer = bufferPing
    source.connect(freeverb.input)
    source.connect(freeverb.output)
    freeverb.output.connect(ctx.destination)
    source.start()
  }
)

var buttonPlayFreeverbPingRaw = new Button(divFreeverb, "Play Dry",
  () => { play(ctx, bufferPing, gain) }
)

var buttonPanicFreeverb = new Button(divFreeverb, "Panic",
  () => {
    freeverb.output.disconnect()
    freeverb = createFreeverb(ctx, 2)
  }
)
