const fbpGraph = require('fbp-graph');
const { trace } = require('noflo-runtime-base');
const { Runtime: FlowhubRuntime } = require('flowhub-registry');
const debug = require('./debug');
const server = require('./server');

exports.writeTrace = (options, tracer) => new Promise((resolve, reject) => {
  if (!options.trace) {
    resolve(null);
    return;
  }
  tracer.dumpFile(null, (err, filename) => {
    if (err) {
      reject(err);
      return;
    }
    console.log(`Wrote flowtrace to: ${filename}`);
    resolve(null);
  });
});

exports.loadGraph = options => new Promise((resolve, reject) => {
  if (typeof options.graph === 'object') {
    // Graph instance provided, return as-is
    resolve(options.graph);
    return;
  }
  fbpGraph.graph.loadFile(options.graph, (err, graph) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(graph);
  });
});

function handleBatchEnd(rt, options, tracer) {
  exports.writeTrace(options, tracer)
    .then(() => server.stop(rt))
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

exports.subscribe = (rt, options) => new Promise((resolve) => {
  const tracer = new trace.Tracer();

  process.on('SIGUSR2', () => {
    exports.writeTrace(options, tracer)
      .catch((err) => {
        console.error(err);
      });
  });

  rt.network.on('addnetwork', (network) => {
    if (options.trace) {
      tracer.attach(network);
    }
    if (options.debug) {
      debug.add(network, options);
    }
    if (options.batch && options.graph) {
      network.on('end', () => handleBatchEnd(rt, options, tracer));
    }
  });
  resolve(rt);
});

function doPing(flowhubRt) {
  flowhubRt.ping(() => {});
}

exports.ping = (rt, options) => new Promise((resolve) => {
  if (!options.id) {
    resolve(rt);
    return;
  }
  const flowhubRt = new FlowhubRuntime({
    id: options.id,
    label: options.label,
    protocol: 'websocket',
    address: server.getUrl(options),
    type: 'noflo-nodejs',
  });
  doPing(flowhubRt);
  setInterval(() => doPing(flowhubRt), options.pingInterval);
  resolve(rt);
});
