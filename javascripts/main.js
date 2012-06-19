var context, sampleSource, gainNode, customNode, varianceNode, analyserNode, frequencyData, analyserView;

monoSummer = function(event) {
  var inputL = event.inputBuffer.getChannelData(0);
  var inputR = event.inputBuffer.getChannelData(1);
  var outputL = event.outputBuffer.getChannelData(0);
  var outputR = event.outputBuffer.getChannelData(1);

  var mono;
  for( var i = 0; i < inputL.length; i++ ) {
    mono = (inputL[i] + inputR[i])/2;
    outputL[i] = mono;
    outputR[i] = mono;
  }
};

monoSider = function(event) {
  var inputL = event.inputBuffer.getChannelData(0);
  var inputR = event.inputBuffer.getChannelData(1);
  var outputL = event.outputBuffer.getChannelData(0);
  var outputR = event.outputBuffer.getChannelData(1);

  var mono;
  for( var i = 0; i < inputL.length; i++ ) {
    mono = (inputL[i] - inputR[i])/2;
    outputL[i] = mono;
    outputR[i] = mono;
  }
};

passThrough = function(event) {
  var inputL = event.inputBuffer.getChannelData(0);
  var inputR = event.inputBuffer.getChannelData(1);
  var outputL = event.outputBuffer.getChannelData(0);
  var outputR = event.outputBuffer.getChannelData(1);

  for( var i = 0; i < inputL.length; i++ ) {
    outputL[i] = inputL[i];
    outputR[i] = inputR[i];
  }
};

lowPass = function(cutoff) {
  if ( 'undefined' == typeof cutoff ) cutoff = 200;

  var processor = function(event) {
    var filter = arguments.callee.filter;
    var inputL = event.inputBuffer.getChannelData(0);
    var inputR = event.inputBuffer.getChannelData(1);
    var outputL = event.outputBuffer.getChannelData(0);
    var outputR = event.outputBuffer.getChannelData(1);

    for( var i = 0; i < inputL.length; i++ ) {
      outputL[i] = filter.process(inputL[i]);
      outputR[i] = filter.process(inputR[i]);
    }
  }

  processor.filter = IIRFilter(DSP.LOWPASS, cutoff, 44100);

  return processor;
}

function makeVarianceCalculator(output_element) {
  var processor = function(event) {
    var output_element = arguments.callee.output_element;
    var inputL = event.inputBuffer.getChannelData(0);
    var inputR = event.inputBuffer.getChannelData(1);
    var outputL = event.outputBuffer.getChannelData(0);
    var outputR = event.outputBuffer.getChannelData(1);

    // Bypass signal to output buffer while calculating mean
    var meanL = 0, meanR = 0;
    for( var i = 0; i < inputL.length; i++ ) {
      outputL[i] = inputL[i];
      outputR[i] = inputR[i];
      meanL += inputL[i];
      meanR += inputR[i];
    }
    meanL = meanL/inputL.length;
    meanR = meanR/inputR.length;

    var varianceL = 0;
    var varianceR = 0;
    for( var i = 0; i < inputL.length; i++ ) {
      varianceL += Math.pow( (inputL[i] - meanL), 2 )
      varianceR += Math.pow( (inputR[i] - meanR), 2 )
    }
    varianceL = varianceL / (inputL.length - 1);
    varianceR = varianceR / (inputL.length - 1);

    sdL = Math.sqrt(varianceL);
    sdR = Math.sqrt(varianceR);

    // Build table view
    var table = document.createElement('table');
    
    var thead = document.createElement('thead');
    var tr = document.createElement('tr');
    var headers = ['Channel', 'Mean', 'Variance', 'Standard Deviation', 'Signal to Noise Ratio'];
    var th;
    for( var i = 0; i < headers.length; i++ ) {
      th = document.createElement('th');
      th.textContent = headers[i];
      tr.appendChild(th);
    }
    thead.appendChild(tr);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    var channels = [
      ['Left',  meanL.toFixed(5), varianceL.toFixed(5), sdL.toFixed(5), (meanL/sdL).toFixed(5)],
      ['Right', meanR.toFixed(5), varianceR.toFixed(5), sdR.toFixed(5), (meanR/sdR).toFixed(5)]
    ];
    for( var i = 0; i < channels.length; i++ ) {
      tr = document.createElement('tr');
      for( var k = 0; k < channels[i].length; k++ ) {
        var td = document.createElement('td');
        if( k != 0 )
          td.setAttribute('style', 'text-align: right');
        td.textContent = channels[i][k];
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    output_element.innerHTML = '';
    output_element.appendChild(table);
  };

  processor.output_element = output_element;

  return makeCustomNode(processor);
}

function makeCustomNode(processor) {
  var node = context.createJavaScriptNode(1024, 1, 1);
  node.onaudioprocess = processor

  return node;
}

function update_volume(event) {
  gainNode.gain.value = event.target.value;
}

function loadSample(url) {
    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";
    request.onload = function() { 
      sampleSource.buffer = context.createBuffer(request.response, false);
      sampleSource.looping = true;
      sampleSource.noteOn(0);
      document.getElementById('status').innerHTML = "Loaded Audio Buffer.";
      currentSource = sampleSource;
    }

    document.getElementById('status').innerHTML = "Loading Audio Buffer...";
    request.send();
}

function attachButtonToProcessor(button_id, processor) {
  var button = document.getElementById(button_id);
  button.addEventListener('click', function() {
    customNode.onaudioprocess = processor;
  }, false);
}

function main() {
  // Initialize the audio nodes
  context = new webkitAudioContext();
  gainNode = context.createGainNode();
  customNode = makeCustomNode(passThrough);
  varianceNode = makeVarianceCalculator(document.getElementById('variance'));
  
  analyserNode = context.createAnalyser();
  analyserNode.fftSize = 2048;
  analyserView = new AnalyzerView(document.getElementById('analyser'), analyserNode);

  sampleSource = context.createBufferSource();

  // Connect audio nodes
  sampleSource.connect(analyserNode);
  analyserNode.connect(varianceNode)
  varianceNode.connect(gainNode);
  gainNode.connect(customNode);
  customNode.connect(context.destination);

  // Initialize UI event handlers
  var volume_slider = document.getElementById('volume');
  volume.addEventListener('change', update_volume, false);
  volume_slider.value = gainNode.gain.value;

  attachButtonToProcessor('pass_through', passThrough);
  attachButtonToProcessor('mono_sum', monoSummer);
  attachButtonToProcessor('mono_side', monoSider);
  // attachButtonToProcessor('lowPass', lowPass());

  var play_guthrie = document.getElementById('play_guthrie');
  play_guthrie.addEventListener('click', function() {
    loadSample('01 Waves.wav');
  }, false);

  var stop = document.getElementById('stop');
  stop.addEventListener('click', function() {
    if ('undefined' != typeof currentSource)
      currentSource.noteOff(0);
  }, false);

  setInterval(function() { analyserView.update(); }, 50);
}

window.addEventListener('DOMContentLoaded', main);