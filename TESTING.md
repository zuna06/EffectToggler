# After Effects acceptance check

Not yet run in After Effects. Use a disposable project when AE is available. Allow about 10 minutes.

## Setup and UI

- Install the JSX, restart AE, and open it from Window. Dock beside the timeline. Resize narrower and taller; verify readable controls, a scrollable feedback area, and clear Empty/disabled states. Test your usual display scaling.
- Create a composition with an adjustment layer and a second layer. Add a visible effect such as Gaussian Blur to the adjustment layer plus Color Control, Checkbox Control, and Dropdown Menu Control. Add a keyframed Slider Control and an expression-driven Slider Control to exercise skip rules.
- Click Use Selected Layer with zero and then two layers selected. Expect an inline request for exactly one layer and no session replacement.

## Capture, switching, and original

1. Select the adjustment layer, set obvious initial values, then attach it. Record these as Original.
2. Change the blur amount, color, checkbox, and dropdown. Capture A. Verify capture itself changes nothing and reports two animated controls skipped.
3. Change those values again and disable a visible effect. Capture B. Again, nothing should be applied by capturing.
4. Click A then B. Verify all eligible values and effect enabled switches return immediately, with the composition rendering the corresponding look. The active card should highlight. Keyframed/expression-driven controls must remain unchanged.
5. Adjust a supported value manually. Wait for idle refresh or click Refresh. Expect Modified and no active card. Click Capture B to overwrite B; expect the current settings saved without applying A or Original.
6. Click Restore Original. Verify the attachment-time values and enabled switches return while both slots remain available. Click A or B to continue.

## Undo and fixed targeting

1. Apply A, then B. Use Edit > Undo once. Expect every supported value and enabled switch from A to return together. Undo once more to reverse the preceding application. Test Redo too. The panel should reflect the result after refresh.
2. Select the second layer and, separately, open another composition. Click A/B. Only the originally attached layer should change.
3. Lock the target layer. Applying and restoring should disable; captures may remain available. Unlock it and refresh.
4. Add keyframes or an enabled expression to a previously captured control. Apply A. Expect that control's animation preserved and an additional skipped count. No expression should be disabled.

## Scope and session reset

1. Click Use Selected Layer with a saved comparison. Expect inline Replace Session/Cancel. Cancel and verify A/B still work. Repeat and replace; expect A/B empty and the currently selected target attached. Replacement must not apply any settings.
2. Select a single effect, or one of its child properties, on the attached layer in Effect Controls. Choose Selected Effects. Expect the scope selector to lock. Capture A/B, changing both scoped and unscoped effects between captures. Switching and Restore Original must affect only the scoped effect, using Original values from attachment time.
3. Reattach, choose Selected Effects with no effects selected, and expect a readable error with All Effects retained. Reattach again and capture under All Effects; expect scope to lock after capture.

## Invalid targets and shutdown

- In separate fresh sessions, add, remove, replace, and reorder effects, including two copies of the same effect. Refresh. Expect disabled apply/capture/restore controls and a message requiring reattachment; no settings should be written.
- Delete the attached layer, then try refreshing and clicking available actions. Expect a readable deleted-target message. Repeat by deleting its composition from the Project panel or opening a different project. No uncaught script dialog should appear.
- Close only the composition viewer tab while keeping its composition in the project. The fixed target should remain valid.
- Close and reopen the panel. Expect no recovered A/B snapshots. Check that no timer errors appear after closure. AE may retain docked panels while hidden; a panel instance that remains loaded retains its session.

Record the AE version, OS, display scaling, effect names, and any failing step before reporting an issue.
