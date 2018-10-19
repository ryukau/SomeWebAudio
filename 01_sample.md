# サンプルデータの再生
[`AudioBuffer`](https://webaudio.github.io/web-audio-api/#AudioBuffer) と [`AudioBufferSourceNode`](https://webaudio.github.io/web-audio-api/#AudioBufferSourceNode) を使ってサンプルデータを再生します。

このページのデモが完成したソースコードになっているので、ブラウザの開発者ツールから読むことができます。

## Array から AudioBuffer を作成
次のコードではJavaScriptの [`Array`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) に書き込んだサンプルデータを `AudioBuffer` に渡しています。

```javascript
function toAudioBuffer(ctx, wave) {
  var buffer = ctx.createBuffer(channel, frame, ctx.sampleRate)
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

var ctx = new AudioContext()

var channel = 2
var duration = 0.5 // 秒
var frame = Math.floor(duration * ctx.sampleRate)
var bufSin = render(ctx, channel, frame)
```

[`buffer.copyToChannel()`](https://webaudio.github.io/web-audio-api/#dom-audiobuffer-copytochannel) に渡すために `Array` を [`Float32Array`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Float32Array) に変換しています。

サンプルレートは `AudioContext` から取得できます。コンピュータで音を扱うとき、 `sampleRate / 2` より高い周波数は正しく再生されないので注意してください。

```javascript
var ctx = new AudioContext()
ctx.sampleRate  // サンプルレート
```

## 事前に用意したサンプルデータの読み込み
別のアプリケーションで作った `.wav` や `.mp3` などを [`XMLHttpRequest`](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest) で読み込んで [`ctx.decodeAudioData()`](https://webaudio.github.io/web-audio-api/#dom-baseaudiocontext-decodeaudiodata) でデコードします。

```javascript
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

var bufCymbal
loadSample(ctx, "./wavecymbal.wav", (buffer) => { bufCymbal = buffer })
```

## 再生
`AudioBuffer` を `AudioBufferSourceNode` に渡すことでサンプルデータを再生するためのノードを作ることができます。 `AudioBufferSourceNode` は一回だけしか `start()` できないので、再生を終えたら新しく作り直す必要があります。

```javascript
function play(ctx, buffer) {
  var source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  source.start()
}

// 使用例
play(ctx, bufSin)
play(ctx, bufCymbal.buffer)
```

## デモ
試しに [Opus](http://www.opus-codec.org/) も `decodeAudioData` に渡しています。

<div id="divScript"></div>
<script type="module" src="01_sample.js"></script>
