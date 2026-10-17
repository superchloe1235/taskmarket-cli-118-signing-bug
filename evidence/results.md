# Probe results — Taskmarket CLI 1.18.0 signing mismatch

Raw output from `evidence/probe.mjs` on 2026-10-17 (API: https://api.taskmarket.dev, network: base, chainId 8453).
Task used for the probe: `0x1163890296673d6f0cbd2f63eccd2f3ac3f96fcf0864768509ca46feae609104`.

```
v1 cli-format   | taskmarket:market:submit:<taskId>  | status 401 | {"message":"Signature does not match worker address","code":"UNAUTHORIZED", ... path":"submissions.requestUploadUrl"}
v2 no-market    | taskmarket:submit:<taskId>         | status 200 | {"uploadUrl":"https://taskmarket.…r2.cloudflarestorage.com/taskmarket/submissions/0x1163…09104/pending/9c792cf2-…", ...}
v3 with-chain   | taskmarket:market:submit:<taskId>:8453 | status 401 | {"message":"Signature does not match worker address", ...}
v4 plain-taskid | <taskId>                           | status 401 | {"message":"Signature does not match worker address", ...}
```

After applying `fix/taskmarket-market-prefix.diff`, the real upload + submission flowed through and returned
`{"ok":true,"data":{"submissionId":"5e41b433-6bc4-4a6c-8cd2-d96d7818f8e9"}}`.
