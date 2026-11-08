# Effect A/B

A single-file, dockable After Effects ScriptUI panel for comparing static effect settings on one fixed layer. No dependencies, network access, or preference changes are required.

## Install

Copy **Effect AB.jsx** into your After Effects installation's **Scripts/ScriptUI Panels** folder:

- Windows: `C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\ScriptUI Panels\`
- macOS: `/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/`

Restart After Effects, then open **Window > Effect AB.jsx** and drag the panel tab to dock it. The compact panel has a minimum size of approximately 260 × 290 pixels. You can also use **File > Scripts > Run Script File** for a floating preview; installation in ScriptUI Panels enables docking. See [Adobe's script installation instructions](https://helpx.adobe.com/after-effects/desktop/automate-in-after-effects/automate-animation/scripts.html).

## Use

1. Select exactly one layer in an active composition and click **Use Selected Layer**. This saves its original effect settings; the button then displays the attached layer's name. Click that same button to attach another selected layer. Changing layer selection afterward does not change the target.
2. Leave **All Effects** selected, or select effects (or their child controls) on the attached layer in Effect Controls and choose **Selected Effects**. Selected Effects immediately freezes those effect identities. All Effects locks when you first capture a slot. Reattach the layer to reset either scope.
3. Click **Capture A**, adjust the effects in After Effects, then click **Capture B**. Capturing replaces a slot without changing the layer.
4. Click the large **A** or **B** button to apply it. The matching slot is highlighted. Manual changes show **Modified** on the next refresh, normally within 1.2 seconds while AE is idle. **Refresh** also checks immediately.
5. Click **Restore Original** to return the scoped effects to their values at attachment time. A and B remain saved. Each application is one **Edit > Undo** action. Captures and session changes are in-memory UI operations and are not undoable.

Reattaching with either slot saved shows **Replace Session** and **Cancel** inside the panel. Replacement discards A, B, and Original without applying any settings. The replacement target is the layer selected when you clicked Use Selected Layer, even if selection changes before confirmation.

## Scope and limits

- Captures static numeric controls, numeric vectors, colors, checkbox values, dropdown indices, and effect enabled states. Nested effect groups are included. Dropdown item definitions are not saved.
- Controls with keyframes or enabled expressions are skipped. Unsupported values such as custom data, shapes, text, and layer/mask references are left untouched. Hover over Refresh to see capture/application details and skip counts. The status line appears only for errors or actions needing attention, with full text available on hover.
- If a saved control gains keyframes or an enabled expression, applying a version skips it and reports the additional skip. The panel never removes animation or disables expressions. Original can restore only the controls eligible when the layer was attached.
- Selected Effects captures whole effects, including when only a child control is selected. Other effects remain untouched by A, B, and Original.
- Keep the same effect instances in the same order. Added, removed, replaced, or reordered effects pause the comparison and require reattachment. Changing a dropdown's item definitions or a third-party effect's internal structure during a session is outside this version's scope.
- Locked layers can be captured; unlock them to apply settings. Deleted layers and compositions removed from the project disable actions. Closing a composition's viewer tab does not delete the composition; the attached layer remains the target while its composition is in the project.
- Snapshots live only in this running panel instance; they are not stored in the project or written to disk. Saving the project does not save the comparison session.
- The panel checks for host write failures and attempts to restore the prior values within the same undo group. If recovery fails, its message directs you to Edit > Undo.

## Validation status

The JavaScript logic passes the simulated-host checks in `tests/mock-host.cjs` (run with Node.js: `node tests/mock-host.cjs`). These exercise capture, switching, original restore, scope, skip rules, undo-group boundaries, write-failure recovery, fixed targeting, and invalid targets.

**After Effects is not installed on the build computer. Docking, actual ScriptUI appearance, composition rendering, third-party effect behavior, and native undo have not been tested in After Effects.** Use [TESTING.md](TESTING.md) for the focused in-app acceptance check.
