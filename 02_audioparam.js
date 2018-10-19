function createOscillator(audioContext, parentNode, type, frequency, detune) {
  var osc = audioContext.createOscillator()
  osc.type = type
  osc.frequency.value = frequency
  osc.detune.value = detune
  osc.connect(parentNode)
  return osc
}

function createGain(audioContext, parentNode, gain) {
  var gainNode = audioContext.createGain()
  gainNode.gain.value = gain
  gainNode.connect(parentNode)
  return gainNode
}

class Synth {
  constructor(
    ctx,
    parent,
    gainPeak = 0.1,
    gainAttack = 0.02,
    gainDecay = 0.4,
    gainSustain = 0.01,
    gainRelease = 0.8,
    numOsc = 4,
    detuneDelta = 200,
    type = "sine",
    frequency = 440,
    detune = 0,
  ) {
    this.ctx = ctx

    this.gainNode = createGain(ctx, parent, 0)

    this.osc = new Array(numOsc)
    for (var i = 0; i < this.osc.length; ++i) {
      this.osc[i] = createOscillator(
        ctx, this.gainNode, type, frequency, detune + detuneDelta * i)
      this.osc[i].start()
    }

    this.gainPeak = gainPeak / numOsc
    this.gainAttack = gainAttack
    this.gainDecay = gainDecay
    this.gainSustain = gainSustain
    this.gainRelease = gainRelease
  }

  scheduleLinADEnv(audioParam, peak, attack, decay) {
    var currentTime = this.ctx.currentTime
    audioParam.cancelScheduledValues(currentTime)
    audioParam.linearRampToValueAtTime(0, 0.002 + currentTime)
    audioParam.linearRampToValueAtTime(peak, attack + currentTime)
    audioParam.linearRampToValueAtTime(0, attack + decay + currentTime)
  }

  scheduleExpADEnv(audioParam, peak, attack, decay) {
    var currentTime = this.ctx.currentTime
    var durationAD = attack + decay
    audioParam.cancelScheduledValues(currentTime)
    audioParam.linearRampToValueAtTime(1e-4, 0.002 + currentTime)
    audioParam.exponentialRampToValueAtTime(peak, attack + currentTime)
    audioParam.exponentialRampToValueAtTime(1e-4, durationAD + currentTime)
    audioParam.linearRampToValueAtTime(0, durationAD + 0.01 + currentTime)
  }

  scheduleLinADS(audioParam, peak, attack, decay, sustain) {
    var currentTime = this.ctx.currentTime
    audioParam.cancelScheduledValues(currentTime)
    audioParam.linearRampToValueAtTime(0, 0.002 + currentTime)
    audioParam.linearRampToValueAtTime(peak, attack + currentTime)
    audioParam.linearRampToValueAtTime(sustain, attack + decay + currentTime)
  }

  scheduleLinRelease(audioParam, release) {
    var currentTime = this.ctx.currentTime
    audioParam.linearRampToValueAtTime(0, release + currentTime)
  }

  scheduleExpADS(audioParam, peak, attack, decay, sustain) {
    var currentTime = this.ctx.currentTime
    audioParam.cancelScheduledValues(currentTime)
    audioParam.linearRampToValueAtTime(1e-4, 0.002 + currentTime)
    audioParam.exponentialRampToValueAtTime(peak, attack + currentTime)
    audioParam.exponentialRampToValueAtTime(sustain, attack + decay + currentTime)
  }

  scheduleExpRelease(audioParam, release) {
    var currentTime = this.ctx.currentTime
    audioParam.exponentialRampToValueAtTime(1e-4, release + currentTime)
    audioParam.linearRampToValueAtTime(0, release + 0.001 + currentTime)
  }

  triggerLin() {
    this.scheduleLinADEnv(this.gainNode.gain, this.gainPeak,
      this.gainAttack, this.gainDecay)
  }

  triggerExp() {
    this.scheduleExpADEnv(this.gainNode.gain, this.gainPeak,
      this.gainAttack, this.gainDecay)
  }

  trigger() {
    this.scheduleLinADS(this.gainNode.gain, this.gainPeak,
      this.gainAttack, this.gainDecay, this.gainSustain)
  }

  release() {
    this.scheduleLinRelease(this.gainNode.gain, this.gainRelease)
  }

  triggerExpADS() {
    this.scheduleExpADS(this.gainNode.gain, this.gainPeak,
      this.gainAttack, this.gainDecay, this.gainSustain)
  }

  releaseExp() {
    this.scheduleExpRelease(this.gainNode.gain, this.gainRelease)
  }

  scheduleNoteEnv(
    startTime,
    duration,
    audioParam,
    peak,
    attack,
    decay,
    sustain,
    release
  ) {
    audioParam.setValueAtTime(1e-4, startTime)
    audioParam.linearRampToValueAtTime(1e-4, 0.002 + startTime)

    var attackTime = attack + startTime
    audioParam.exponentialRampToValueAtTime(peak, attackTime)
    audioParam.exponentialRampToValueAtTime(sustain, decay + attackTime)

    var releaseTime = duration + release + startTime
    audioParam.exponentialRampToValueAtTime(1e-4, releaseTime)
    audioParam.linearRampToValueAtTime(0, 0.001 + releaseTime)
  }

  scheduleNote(startTime, duration, frequency) {
    for (var i = 0; i < this.osc.length; ++i) {
      this.osc[i].frequency.setValueAtTime(frequency, startTime)
    }

    this.scheduleNoteEnv(
      startTime,
      duration,
      this.gainNode.gain,
      this.gainPeak,
      this.gainAttack,
      this.gainDecay,
      this.gainSustain,
      this.gainRelease
    )
  }
}

// Envelope Demo
var ctx = new AudioContext()
var synth = new Synth(ctx, ctx.destination,
  0.1, 0.3, 0.6, 0.01, 1.2, 8, 500.01, "square", 440, 0)

// Sequence Demo1
var synths = []
for (var i = 0; i < 8; ++i) {
  synths.push(new Synth(ctx, ctx.destination,
    0.1, 0.03, 0.2, 0.01, 1.2, 3, 200 + 200 * Math.random(), "square", 440, 0))
}

var seq1 = []
var startTime = 0
for (var i = 0; i < 64; ++i) {
  seq1.push({
    frequency: (Math.floor(Math.random() * 23 + 1) * 60)
      * (1 + 0.01 * Math.random()),
    duration: Math.random() + 0.01,
    startTime: startTime,
  })
  startTime += 0.1 + Math.random() * 0.3
}

// Sequence Demo2
class Synth2 {
  constructor(
    ctx,
    parent,
    gainPeak = 0.1,
    gainAttack = 0.02,
    gainDecay = 0.4,
    gainSustain = 0.01,
    gainRelease = 0.8,
    type = "sine",
    detune = 0,
  ) {
    this.ctx = ctx

    this.parent = parent

    this.type = type
    this.detune = detune

    this.gainPeak = gainPeak
    this.gainAttack = gainAttack
    this.gainDecay = gainDecay
    this.gainSustain = gainSustain
    this.gainRelease = gainRelease

    this.usedNode = []
  }

  createNode(frequency) {
    var gain = createGain(this.ctx, this.parent, 0)
    var osc = createOscillator(
      this.ctx, gain, this.type, frequency, this.detune)
    return { gain: gain, osc: osc }
  }

  scheduleNoteEnv(
    startTime,
    duration,
    audioParam,
    peak,
    attack,
    decay,
    sustain,
    release
  ) {
    audioParam.setValueAtTime(0, startTime)
    audioParam.linearRampToValueAtTime(1e-4, 0.002 + startTime)

    var attackTime = attack + startTime
    audioParam.exponentialRampToValueAtTime(peak, attackTime)
    audioParam.exponentialRampToValueAtTime(sustain, decay + attackTime)

    var releaseTime = duration + release + startTime
    audioParam.exponentialRampToValueAtTime(1e-4, releaseTime)
    audioParam.linearRampToValueAtTime(0, 0.001 + releaseTime)
  }

  scheduleNote(startTime, duration, frequency) {
    var node = this.createNode(frequency)

    node.osc.start(startTime)

    this.scheduleNoteEnv(
      startTime,
      duration,
      node.gain.gain,
      this.gainPeak,
      this.gainAttack,
      this.gainDecay,
      this.gainSustain,
      this.gainRelease
    )

    this.usedNode.push(node)
  }

  midiNoteNumberToFrequency(number) {
    return 440 * Math.pow(2, (number - 69) / 12)
  }

  cleanup() {
    for (var node of this.usedNode) {
      node.gain.disconnect()
      node.osc.stop()
    }
    this.usedNode = []
  }

  // sequence = [{startTime, duration, number}, ...]
  scheduleSequence(sequence) {
    this.cleanup()

    var currentTime = this.ctx.currentTime
    for (var note of sequence) {
      this.scheduleNote(
        currentTime + note.startTime,
        note.duration,
        this.midiNoteNumberToFrequency(note.number)
      )
    }
  }
}

var scale = [0, 3, 5, 7, 9, 14, 17]
var seq2 = []
var startTime = 0
for (var i = 0; i < 64; ++i) {
  seq2.push({
    startTime: startTime,
    duration: Math.random() + 0.01,
    number: 42 + scale[Math.floor(Math.random() * scale.length)],
  })
  startTime += 0.14 * (1 + Math.floor(Math.random() + 0.5))
}
var synth2 = new Synth2(ctx, ctx.destination,
  0.1, 0.15, 0.4, 0.01, 1.8, "sine", 0)

// UI
import { Button } from "./canvas.js"

var divSynthTrigger = document.getElementById("divSynthTrigger")
var buttonTrigger = new Button(divSynthTrigger, "Trigger", () => { })
buttonTrigger.element.addEventListener("mousedown",
  () => synth.trigger(), false)
buttonTrigger.element.addEventListener("mouseup",
  () => synth.release(), false)
buttonTrigger.element.addEventListener("mouseleave",
  () => synth.release(), false)
buttonTrigger.element.addEventListener("touchstart",
  () => synth.trigger(), false)
buttonTrigger.element.addEventListener("touchcancel",
  () => synth.release(), false)
buttonTrigger.element.addEventListener("touchend",
  () => synth.release(), false)

var divSynthTriggerExpADSR = document.getElementById("divSynthTriggerExpADSR")
var buttonTriggerExpADSR = new Button(divSynthTriggerExpADSR, "Trigger", () => { })
buttonTriggerExpADSR.element.addEventListener("mousedown",
  () => synth.triggerExpADS(), false)
buttonTriggerExpADSR.element.addEventListener("mouseup",
  () => synth.releaseExp(), false)
buttonTriggerExpADSR.element.addEventListener("mouseleave",
  () => synth.releaseExp(), false)
buttonTriggerExpADSR.element.addEventListener("touchstart",
  () => synth.triggerExpADS(), false)
buttonTriggerExpADSR.element.addEventListener("touchcancel",
  () => synth.releaseExp(), false)
buttonTriggerExpADSR.element.addEventListener("touchend",
  () => synth.releaseExp(), false)


var divSequence1 = document.getElementById("divSequence1")
var buttonSeq = new Button(divSequence1, "Start Sequence", () => {
  for (var i = 0; i < seq1.length; ++i) {
    var index = i % synths.length
    synths[index].scheduleNote(
      ctx.currentTime + seq1[i].startTime, seq1[i].duration, seq1[i].frequency)
  }
})

var divSequence2 = document.getElementById("divSequence2")
var buttonSeq = new Button(divSequence2, "Start Sequence", () => {
  synth2.scheduleSequence(seq2)
})