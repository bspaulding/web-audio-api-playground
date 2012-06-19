var AnalyzerView;
AnalyzerView = (function () {
  function AnalyzerView(root_element, an_analyzer_node, some_options) {
    if ( root_element.tagName !== 'CANVAS' ) {
      throw '[AnalyzerView] root_element must be an canvas.';
    }
    this.root = root_element;
    this.root.setAttribute('class', 'analyzer_view');

    this.canvas = this.root;
    this.context = this.canvas.getContext('2d');

    this.analyzer_node = an_analyzer_node;
    if ( 'undefined' === typeof this.analyzer_node ) {
      throw '[AnalyzerView] Must provide a valid RealtimeAnalyserNode to AnalyzerView';
    }

    this.options = some_options;
    if ( 'undefined' === typeof this.options ) {
      this.options = {};
    }
    if ( 'undefined' === typeof this.options.num_bars ) {
      this.options.num_bars = 30;
    }
  };
  
  AnalyzerView.prototype.width = function() {
    return this.canvas.width;
  };

  AnalyzerView.prototype.height = function() {
    return this.canvas.height;
  };

  AnalyzerView.prototype.update = function() {
    var frequency_data = new Uint8Array(this.analyzer_node.frequencyBinCount);
    this.analyzer_node.getByteFrequencyData(frequency_data);

    this.context.clearRect(0, 0, this.width(), this.height());
    this.context.fillStyle = '#CCCCCC';

    var bin_size = Math.floor(this.width() / this.options.num_bars);
    for ( var i = 0; i < this.options.num_bars; i += 1 ) {
      var sum = 0;
      for ( var j = 0; j < bin_size; j += 1 ) {
        sum += frequency_data[(i * bin_size) + j];
      }

      var mean = sum / bin_size;
      var bar_width = this.width() / this.options.num_bars;
      var scaled_average = (mean / 256) * this.height();

      this.context.fillRect(i * bar_width, this.height(), bar_width - 2, - scaled_average);
    }
  };

  return AnalyzerView;
}());