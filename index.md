# WebAudio
HTML5のCanvasで遊ぶときにナイスな音をつけたいと思ったので[Web Audio API](https://webaudio.github.io/web-audio-api/)について調べました。

## インデックス
0. <a href="00_basics.html">Hello WebAudio</a>
1. <a href="01_sample.html">サンプルデータの再生</a>
2. <a href="02_audioparam.html">AudioParamでオートメーション</a>
3. <a href="03_filter.html">フィルタ</a>
4. <a href="04_delay.html">ディレイ</a>
5. <a href="05_dynamics.html">ウェイブシェイパとコンプレッサ</a>
6. <a href="06_worklet.html">AudioWorklet</a> (2018-10-19) 動作せず。

## 問題点
2018-10-19の時点ではWebAudioの利用は `AudioBuffer` を使ったサンプルデータのポン出しに限定したほうがよさそうです。

次のような想定外の動作がありました。

- `AudioWorklet` が正しく動作しない。
- フィードバックループで想定外のディレイが追加される。
- Firefox で `BiquadFilterNode` の `type` を `"lowpass"` または `"highpass"` にしたとき `Q` に負の値を設定できない。
