# ウェイブシェイパとコンプレッサ
[WaveShaperNode](https://webaudio.github.io/web-audio-api/#waveshapernode) と [DynamicsCompressorNode](https://webaudio.github.io/web-audio-api/#dynamicscompressornode) を試します。

## 準備
このページのコードを上から順に開発者ツールのコンソールにコピペしていけば実行できるようになっています。

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

var ctx = new AudioContext()
```

## ウェイブシェイパ
`WaveShaperNode` は音を歪ませるときに使えます。

### 半波整流と全波整流
[半波整流](https://ja.wikipedia.org/wiki/%E6%95%B4%E6%B5%81%E5%99%A8#%E5%8D%98%E7%9B%B8%E5%8D%8A%E6%B3%A2%E6%95%B4%E6%B5%81)の入出力特性です。横軸が入力の大きさ、縦軸が対応する出力の大きさです。

<figure>
<img src="05_half_wave_rect.png" alt="Image of input-output curve of half-wave rectification." style="width: 480px; padding-bottom: 12px;"/>
</figure>

[全波整流](https://ja.wikipedia.org/wiki/%E6%95%B4%E6%B5%81%E5%99%A8#%E5%8D%98%E7%9B%B8%E5%85%A8%E6%B3%A2%E6%95%B4%E6%B5%81)の入出力特性です。

<figure>
<img src="05_full_wave_rect.png" alt="Image of input-output curve of full-wave rectification." style="width: 480px; padding-bottom: 12px;"/>
</figure>

`WaveShaperNode` の `curve` は線形補間されるので、半端整流は `[0, 0, 1]` 、全波整流は `[1, 0, 1]` と指定できます。

実装の例です。

```javascript
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

function createWaveShaper(ctx, curve) {
  var shaper = ctx.createWaveShaper()
  shaper.oversample = "4x"
  shaper.curve = new Float32Array(curve)
  return shaper
}

function playWaveShaper(ctx, buffer, shaper) {
  var source = ctx.createBufferSource()
  source.buffer = bufferPing
  source.connect(shaper)
  source.start()
}

var bufferPing = renderPing(ctx, 2, 2 * ctx.sampleRate)

var shaperHalfRect = createWaveShaper(ctx, [0, 0, 1])
shaperHalfRect.connect(ctx.destination)

var shaperFullRect = createWaveShaper(ctx, [1, 0, 1])
shaperFullRect.connect(ctx.destination)

async function playHalfAndFullRectification() {
  playWaveShaper(ctx, bufferPing, shaperHalfRect)
  await new Promise(resolve => setTimeout(resolve, 2000));
  playWaveShaper(ctx, bufferPing, shaperFullRect)
}

playHalfAndFullRectification()
```

半波整流と全波整流を行う `WaveShaperNode` のデモです。

<div id="divRectification"></div>

### 適当な関数
もう少し複雑な関数を `curve` に指定します。

<figure>
<img src="05_some_curve.png" alt="Image of curve (1 - cos(x)) / x." style="width: 480px; padding-bottom: 12px;"/>
</figure>

```javascript
// [-1, 1] の範囲の (1 - cos(x)) / x.
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

playWaveShaper(ctx, bufferPing, shaperSomeCurve)
```

適当な関数を使った `WaveShaperNode` のデモです。

<div id="divSomeShaper"></div>

## コンプレッサ
`DynamicsCompressorNode` の[仕様](https://webaudio.github.io/web-audio-api/#DynamicsCompressorOptions-processing)で気になった部分をリストします。

1. Fixed look-aheadなのでコンプレッサを通すと一定の遅れが加わる。
2. メイクアップゲインは ratio, knee, threshold の値で変わる。
3. knee のカーブはブラウザ依存。knee = 0 のときハードニー。

1と2から音楽向けでないという印象を持ちました。ビデオチャットなどでマイクから入ってきた音声にかけるような用途を想定しているように思います。

コードの例です。

```javascript
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

function playCompressor(buffer, filter) {
  var source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ksFilter.input)
  source.start()

  setTimeout(playCompressor, 1000, buffer, filter)
}

var bufferNoiseBurst = renderNoiseBurst(ctx, 2, ctx.sampleRate / 100)

var compressor = createDynamicsCompressor(ctx, 0.001, 0.06, -24, 8, 40)
var ksFilter = createKarplusStrongFilter(ctx, 220, 8000)

ksFilter.output.connect(compressor)
compressor.connect(ctx.destination)

playCompressor(bufferNoiseBurst, ksFilter.input)
```

コンプレッサのデモです。Firefox 62.0.3 では発散するのでPlayしないでください。

<div id="divCompressor"></div>

<script type="module" src="05_dynamics.js"></script>
