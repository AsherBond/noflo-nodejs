# noflo-nodejs — moved

This package has been ingested into the NoFlo monorepo, re-architected for
NoFlo 2.x, and will be published as **[@noflo/nodejs](https://github.com/noflo/noflo/tree/master/packages/nodejs#readme)**.

- Source: [noflo/noflo](https://github.com/noflo/noflo) at `packages/nodejs`
- The 2.x host runs NoFlo programs as observable FBP Protocol 2.0 runtimes
  over [Reticulum](https://reticulum.network), authorized with
  [Dacar](https://github.com/noflo/dacar) capability grants instead of
  secrets
- The 1.x runtime stack (WebSocket/WebRTC servers speaking fbp-protocol
  1.x, flowhub-registry pings, mDNS advertisement, the `--secret` and
  `--permissions` options) is not carried forward
- The unscoped `noflo-nodejs` npm name will receive a deprecation notice
  pointing here when the NoFlo 2.x line reaches stable
