# AGENTS.md — 旧Colorpicker監査ガイド

このrepoは旧Electron版colorpickerプロジェクト。

実装文脈を確認する場合は、まず `CLAUDE.md` を読むこと。

## 監査観点

- この旧Electron版と、現行の `../colorpicker-tauri` を混同しない
- 旧Electron版の前提を、PRISM.blue / colorpicker-tauri へ無断で持ち込まない
- 指摘は P0 / P1 / P2 に分類して報告する
- 明示的に編集指示がない限り、read-only監査を優先する
