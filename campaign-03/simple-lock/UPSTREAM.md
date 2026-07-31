# Upstream Source

Campaign 03 starts from the official Nervos `simple-lock` tutorial example.

- Repository: https://github.com/nervosnetwork/docs.nervos.org
- Source path: `examples/dApp/simple-lock`
- Imported revision: `7a5ceedb62004c2aacbbdad094f3f0d32714d567`
- Import date: 2026-07-30

Historical deployment artifacts from the upstream example were deliberately not
imported. All deployment files and transaction evidence in this project are
generated against this workspace's OffCKB local devnet.

Submission-specific changes add explicit error handling and rejection tests,
consistent UTF-8 preimage handling, committed-transaction polling, local-devnet
configuration, and a proof-oriented frontend.
