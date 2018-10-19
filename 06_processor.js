class BypassProcessor extends AudioWorkletProcessor {
  process(inputs, outputs) {
    let input = inputs[0]
    let output = outputs[0]
    output[0].set(input[0])

    return false;
  }
}

registerProcessor("bypass-processor", BypassProcessor)
