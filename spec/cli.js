const { exec, spawn } = require('child_process');
const { expect } = require('chai');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const fbpHealthCheck = require('fbp-protocol-healthcheck');
const fbpClient = require('fbp-client');

function healthCheck(address, callback) {
  fbpHealthCheck(address)
    .then(() => callback(), () => healthCheck(address, callback));
}

describe('noflo-nodejs CLI', () => {
  const prog = path.resolve(__dirname, '../bin/noflo-nodejs');
  const runtimeSecret = process.env.FBP_PROTOCOL_SECRET || 'noflo-nodejs';
  describe('--graph=helloworld.fbp --batch --trace', () => {
    let stdout = '';
    let stderr = '';
    const graph = path.resolve(__dirname, './fixtures/helloworld.fbp');
    it('should execute graph and exit', (done) => {
      const cmd = `${prog} --graph=${graph} --batch --trace --open=false`;
      exec(cmd, (err, o, e) => {
        if (err) {
          done(err);
          return;
        }
        stdout = o;
        stderr = e;
        done();
      });
    }).timeout(10 * 1000);
    it('should have written the expected output', () => {
      expect(stdout).to.contain('hello world');
    });
    it('should not have written any errors', () => {
      expect(stderr).to.eql('');
    });
    it('should have produced a flowtrace', () => {
      expect(stdout.toLowerCase()).to.include('wrote flowtrace to:');
    });
  });
  describe('--graph=missingcomponent.fbp', () => {
    const graph = path.resolve(__dirname, './fixtures/missingcomponent.fbp');
    it('should fail with an error telling about the missing component', (done) => {
      const cmd = `${prog} --graph=${graph} --open=false`;
      exec(cmd, (err) => {
        expect(err.message).to.contain('Component foo/Bar not available');
        done();
      });
    }).timeout(10 * 1000);
  });
  describe('--auto-save', () => {
    const baseDir = path.resolve(__dirname, './fixtures/auto-save');
    let runtimeProcess;
    let runtimeClient;
    before('start runtime', (done) => {
      runtimeProcess = spawn(prog, [
        '--host=localhost',
        '--port=3470',
        '--open=false',
        `--base-dir=${baseDir}`,
        `--secret=${runtimeSecret}`,
        '--auto-save=true',
      ]);
      runtimeProcess.stdout.pipe(process.stdout);
      runtimeProcess.stderr.pipe(process.stderr);
      healthCheck('ws://localhost:3470', done);
    });
    after('stop runtime', (done) => {
      if (!runtimeProcess) {
        done();
        return;
      }
      process.kill(runtimeProcess.pid);
      done();
    });
    it('should be possible to connect', () => fbpClient({
      address: 'ws://localhost:3470',
      protocol: 'websocket',
      secret: runtimeSecret,
    })
      .then((c) => {
        runtimeClient = c;
        return c.connect();
      }));
    describe('setting component sources', () => {
      const source = `const noflo = require('noflo');
exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in');
  c.outPorts.add('out');
  c.process((input, output) => {
    output.sendDone(input.getData() + 2);
  });
  return c;
};`;
      const componentPath = path.resolve(__dirname, './fixtures/auto-save/components/Plusser.js');
      const readFile = promisify(fs.readFile);
      const unlink = promisify(fs.unlink);
      after('clean up file', () => unlink(componentPath));
      it('should be possible to send the source code to the runtime', () => runtimeClient
        .protocol.component.source({
          name: 'Plusser',
          library: 'auto-save',
          language: 'javascript',
          code: source,
        }));
      it('should have saved the source code to the fixture folder', () => readFile(
        componentPath,
        'utf-8',
      )
        .then((contents) => {
          expect(contents).to.eql(source);
        }));
    });
  });
});
