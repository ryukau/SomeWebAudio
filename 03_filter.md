# フィルタ
WebAudioではフィルタに関する3つのノードが用意されています。

- [`BiquadFilterNode`](https://webaudio.github.io/web-audio-api/#biquadfilternode)
- [`IIRFilterNode`](https://webaudio.github.io/web-audio-api/#iirfilternode)
- [`ConvolverNode`](https://webaudio.github.io/web-audio-api/#ConvolverNode)

フィルタをかけるソースを用意します。

```javascript
function play(ctx, buffer, filterNode) {
  filterNode.connect(ctx.destination)

  var source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(filterNode)
  source.start()
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
function renderNoise(ctx, channel, frame) {
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
var duration = 1 // 秒
var frame = Math.floor(duration * ctx.sampleRate)
var bufferNoise = renderNoise(ctx, channel, frame)
```

## BiquadFilterNode
音に関しては、ほとんどBiquadフィルタでなんとかなります。直列につなぐことで、いろいろな周波数特性を作ることができます。

```javascript
function createBiquadFilter(ctx, type, frequency, Q, gain = 0) {
  var filter = ctx.createBiquadFilter()
  filter.type = type
  filter.frequency.value = frequency
  filter.Q.value = Q
  filter.gain.value = gain
  return filter
}

var biquad = createBiquadFilter(ctx, "lowpass", 400, 1, 1)

play(ctx, bufferNoise, biquad)
```

以下のデモで `BiquadFilterNode` を試すことができます。Playボタンを押すと音が出ます。

図は `BiquadFilterNode.getFrequencyResponse` から取得したゲインと位相の周波数特性です。黒い線がゲイン特性、青い線が位相特性を示しています。下にある20から20000の値は周波数\[Hz\]、左の-24から18の値はゲイン\[dB\]、右の-135から180の値は位相\[deg\]です。

`BiquadFilterNode.getFrequencyResponse` の `magResponce` はユーザ側でdBに変換する必要があります。 `phaseResponce` は単位 \[rad\] の位相が返ってきます。デモでは [-π, π] の範囲を超えるときは余り演算で折り返すようにしています。

Firefox 62.0.3 では `lowpass` または `highpass` のとき `Q` に負の値を設定できません。

<div id="divTestBiquad"></div>

## IIRFilterNode
`IIRFilterNode` を使えば自分で設計したIIRフィルタをWebAudioで使うことができます。ただし、どうしても必要でなければ `BiquadFilterNode` の利用が[推奨](https://webaudio.github.io/web-audio-api/#iirfilternode)されています。

例でつかう適当なフィルタを [`scipy.signal`](https://docs.scipy.org/doc/scipy/reference/signal.html) で設計します。

```python
# python
import json
from scipy import signal

b, a = signal.ellip(5, 5, 60, 440 / 22050, "lowpass")

print(json.dumps({"b": b.tolist(), "a": a.tolist()}, indent=2))
```

出力です。

```json
{
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
```

`IIRFilterNode` に渡します。

```javascript
// javascript
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

play(ctx, bufferNoise, iir)
```

設計したフィルタのデモです。Playボタンを押すと音が出ます。

<div id="divTestIir"></div>

- [scipy.signal.ellip — SciPy v1.1.0 Reference Guide](https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.ellip.html#scipy.signal.ellip)
- [19.2. json — JSON encoder and decoder — Python 3.5.6 documentation](https://docs.python.org/3.5/library/json.html)

## ConvolverNode
`ConvolverNode` は[インパルス応答](https://en.wikipedia.org/wiki/Impulse_response)の[畳み込み](https://en.wikipedia.org/wiki/Convolution)を行うノードです。リバーブ、ギターアンプのキャビネット、糸電話などのシミュレーションに応用できます。

次のコードでは事前に用意した `freeverb.wav` というインパルス応答を読み込んでサイン波にかけています。

```javascript
function loadSample(ctx, path) {
  return new Promise((resolve, reject) => {
    var request = new XMLHttpRequest()
    request.open("GET", path, true)
    request.responseType = "arraybuffer"
    request.onreadystatechange = () => {
      if (request.readyState !== 4) return
      ctx.decodeAudioData(request.response, (buffer) => resolve(buffer))
    }
    request.send()
  })
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
loadSample(ctx, "./freeverb.wav").then((buffer) => {
  convolver.buffer = buffer
}).catch((error) => console.log(error))

play(ctx, bufferPing, convolver)
```

<div id="divTestConvolver"></div>

<script type="module" src="03_filter.js"></script>
