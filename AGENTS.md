# UI implementation rules

For any user-facing UI change, read and follow `design/lookandfeel.md` before editing.

For mobile workspace/list changes, the "Approved create-workspace reference" in that document is mandatory. Do not introduce a competing navigation, action, color, or container pattern without first updating that reference with the reason.

In particular, multi-step workflows must be built as real pages using the established page canvas and navigation patterns. Do not reuse modal shells on routes, and do not use ambiguous route actions such as “Close”; use destination-aware navigation instead.
