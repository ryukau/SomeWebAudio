# AudioWorklet
- [AudioWorklet](https://webaudio.github.io/web-audio-api/#audioworklet)
- [AudioWorkletNode](https://webaudio.github.io/web-audio-api/#audioworkletnode)
- [AudioWorkletGlobalScope](https://webaudio.github.io/web-audio-api/#audioworkletglobalscope)

## BypassNode
[Web Audio API Editor’s Draft, 19 October 2018](https://webaudio.github.io/web-audio-api/) に掲載されていた [Example 12 と 13](https://webaudio.github.io/web-audio-api/#AudioWorklet-concepts) です。

2018-10-19 の時点で Firefox と Chromium でスクリプトを実行したところ、正しく動作しませんでした。

```javascript
// processor.js
class BypassProcessor extends AudioWorkletProcessor {
  process(inputs, outputs) {
    let input = inputs[0]
    let output = outputs[0]
    output[0].set(input[0])

    return false;
  }
}

registerProcessor("bypass-processor", BypassProcessor)
```

```javascript
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

var ctx = new AudioContext()

var bufferPing = renderPing(ctx, 2, Math.floor(ctx.sampleRate / 5))

var bypassNode
ctx.audioWorklet.addModule("processor.js").then(() => {
  bypassNode = new AudioWorkletNode(ctx, "bypass-processor")
})

var source = ctx.createBufferSource()
source.buffer = bufferPing
source.connect(bypassNode)
bypassNode.connect(ctx.destination)
source.start()
```

<div id="divBypass"></div>

<script type="module" src="06_worklet.js"></script>
