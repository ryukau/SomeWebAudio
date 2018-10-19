function createKarplusStrongFilter(ctx, pitch, cutoff) {
  var delay = ctx.createDelay(4)
  delay.delayTime.value = 1 / pitch

  var filter = ctx.createBiquadFilter()
  filter.type = "lowpass"
  filter.frequency.value = cutoff
  filter.Q.value = -3 // This isn't working.
  filter.gain.value = 0

  var gain = ctx.createGain()
  gain.gain.value = 0.99

  var input = gain
  var output = gain

  delay.connect(filter)
  filter.connect(gain)
  gain.connect(delay)

  return { input, output, delay, filter, gain }
}

var ctx = new AudioContext()

var ksFilter = createKarplusStrongFilter(ctx, 220, 2000)

// Create impulse.
var buffer = ctx.createBuffer(2, 1, ctx.sampleRate)
buffer.copyToChannel(new Float32Array([1]), 0, 0)
buffer.copyToChannel(new Float32Array([1]), 1, 0)

var source = ctx.createBufferSource()
source.buffer = buffer

// Routing.
source.connect(ksFilter.input)
ksFilter.output.connect(ctx.destination)

source.start()

