#target aftereffects

/* Effect A/B 1.0.0 | Install in Scripts/ScriptUI Panels. No disk/network access. */
(function (host) {
    var TITLE = "Effect A/B", session = null, message = "Select one layer, then attach it.", pending = null;
    var busy = false, stopped = false, timer = null, last = "Original", actionError = "";
    var root = (host instanceof Panel) ? host : new Window("palette", TITLE, undefined, {resizeable: true});
    var accent = [0.36, 0.73, 1, 1], fg = [0.90, 0.91, 0.94, 1], muted = [0.57, 0.60, 0.65, 1];
    root.orientation = "column"; root.alignChildren = ["fill", "top"];
    root.spacing = 6; root.margins = 10;
    root.minimumSize = [260, 290]; root.preferredSize = [290, 310];
    try { root.graphics.backgroundColor = root.graphics.newBrush(root.graphics.BrushType.SOLID_COLOR, [0.12, 0.13, 0.15, 1]); } catch (ignore) {}

    function text(parent, value) {
        var t = parent.add("statictext", undefined, value);
        try { t.graphics.foregroundColor = t.graphics.newPen(t.graphics.PenType.SOLID_COLOR, fg, 1); } catch (ignore) {}
        return t;
    }
    var heading = text(root, "EFFECT A/B");
    try { heading.graphics.font = ScriptUI.newFont(heading.graphics.font.name, "BOLD", 15); } catch (ignoreFont) {}
    var rule = root.add("panel"); rule.maximumSize.height = 1;
    var target = text(root, "No layer attached"); target.characters = 24;
    var attach = root.add("button", undefined, "Use Selected Layer");
    var confirmation = root.add("group"); confirmation.orientation = "row"; confirmation.alignChildren = ["fill", "center"];
    var replace = confirmation.add("button", undefined, "Replace Session");
    var cancel = confirmation.add("button", undefined, "Cancel");
    confirmation.visible = false;
    var scopeRow = root.add("group"); scopeRow.alignChildren = ["left", "center"];
    text(scopeRow, "Compare:");
    var scope = scopeRow.add("dropdownlist", undefined, ["All Effects", "Selected Effects"]);
    scope.alignment = ["fill", "center"]; scope.selection = 0;
    scope.helpTip = "Selected Effects freezes the effects currently selected on the attached layer. Reattach to reset scope.";
    var slots = root.add("group"); slots.orientation = "row"; slots.alignChildren = ["fill", "fill"]; slots.spacing = 10;

    function roundedPath(g, x, y, w, h, radius) {
        var r = Math.min(radius, w / 2, h / 2), i, j, angle;
        var centers = [[x + w - r, y + r], [x + w - r, y + h - r], [x + r, y + h - r], [x + r, y + r]];
        g.newPath();
        for (i = 0; i < 4; i++) {
            for (j = 0; j <= 8; j++) {
                angle = (-90 + i * 90 + j * 90 / 8) * Math.PI / 180;
                var px = centers[i][0] + r * Math.cos(angle), py = centers[i][1] + r * Math.sin(angle);
                if (i === 0 && j === 0) { g.moveTo(px, py); } else { g.lineTo(px, py); }
            }
        }
        g.closePath();
    }
    function face(control, selected) {
        var g = control.graphics, w = control.size.width, h = control.size.height;
        // Clear corners to the panel background before painting the rounded face.
        g.newPath(); g.rectPath(0, 0, w, h);
        g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, [0.12, 0.13, 0.15, 1]));
        roundedPath(g, 1, 1, w - 2, h - 2, 6);
        g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, selected ? [0.16, 0.27, 0.35, 1] : [0.17, 0.18, 0.21, 1]));
        roundedPath(g, 1, 1, w - 2, h - 2, 6);
        g.strokePath(g.newPen(g.PenType.SOLID_COLOR, selected ? accent : [0.32, 0.34, 0.38, 1], selected ? 2 : 1));
        if (control.active) {
            roundedPath(g, 4, 4, w - 8, h - 8, 4);
            g.strokePath(g.newPen(g.PenType.SOLID_COLOR, muted, 1));
        }
    }
    function slot(label) {
        var b = slots.add("button", undefined, label + "\nEmpty");
        b.alignment = ["fill", "top"]; b.minimumSize = [90, 42]; b.preferredSize.height = 44; b.maximumSize.height = 44;
        b.slotLabel = label; b.stateLabel = "Empty"; b.isActive = false;
        // Keep real buttons for native keyboard/focus behavior; draw the two-line face ourselves.
        b.onDraw = function () {
            var g = this.graphics, w = this.size.width, h = this.size.height;
            face(this, this.isActive);
            var ink = this.enabled ? (this.isActive ? accent : fg) : muted;
            var originalFont = g.font;
            var big = ScriptUI.newFont(originalFont.family || originalFont.name, "BOLD", 16), small = ScriptUI.newFont(originalFont.family || originalFont.name, "REGULAR", 9);
            var pen = g.newPen(g.PenType.SOLID_COLOR, ink, 1);
            // AE can measure with the current graphics font even when a font argument
            // is supplied. Make measurement and drawing use the same current font.
            g.font = big;
            var a = g.measureString(this.slotLabel);
            g.font = small;
            var b = g.measureString(this.stateLabel);
            var gap = 1, top = (h - a[1] - b[1] - gap) / 2;
            g.font = big;
            g.drawString(this.slotLabel, pen, (w - a[0]) / 2, top);
            g.font = small;
            g.drawString(this.stateLabel, pen, (w - b[0]) / 2, top + a[1] + gap);
            g.font = originalFont;
        };
        return b;
    }
    var aButton = slot("A"), bButton = slot("B");
    var captures = root.add("group"); captures.alignChildren = ["fill", "center"]; captures.spacing = 10;
    var captureA = captures.add("button", undefined, "Capture A"), captureB = captures.add("button", undefined, "Capture B");
    captureA.alignment = captureB.alignment = ["fill", "center"];
    var restore = root.add("button", undefined, "Restore Original");
    var summary = text(root, "No comparison yet"); summary.characters = 28;
    summary.maximumSize.height = 20;
    var refreshButton = root.add("button", undefined, "Refresh"); refreshButton.helpTip = "Recheck the target and detect manual edits. Automatic checks run about once per second.";
    function roundedControl(control, dropdown) {
        control.onDraw = function () {
            face(this, false);
            var g = this.graphics, w = this.size.width, h = this.size.height;
            var label = dropdown ? (this.selection ? this.selection.text : "") : this.text;
            var font = g.font, max = w - (dropdown ? 34 : 20), shown = label;
            while (shown.length && g.measureString(shown, font)[0] > max) { shown = shown.substring(0, shown.length - 1); }
            if (shown !== label && shown.length > 3) { shown = shown.substring(0, shown.length - 3) + "..."; }
            var size = g.measureString(shown, font), ink = this.enabled ? fg : muted;
            g.drawString(shown, g.newPen(g.PenType.SOLID_COLOR, ink, 1), dropdown ? 10 : (w - size[0]) / 2, (h - size[1]) / 2, font);
            if (dropdown) {
                g.newPath(); g.moveTo(w - 20, h / 2 - 2); g.lineTo(w - 15, h / 2 + 3); g.lineTo(w - 10, h / 2 - 2);
                g.strokePath(g.newPen(g.PenType.SOLID_COLOR, ink, 1.5));
            }
        };
    }
    var roundedButtons = [attach, replace, cancel, captureA, captureB, restore, refreshButton];
    for (var buttonIndex = 0; buttonIndex < roundedButtons.length; buttonIndex++) { roundedControl(roundedButtons[buttonIndex], false); }
    roundedControl(scope, true);

    function clone(v) {
        if (typeof v === "number") { return v; }
        var result = [], i; for (i = 0; i < v.length; i++) { result.push(v[i]); } return result;
    }
    function numeric(v) {
        if (typeof v === "number") { return isFinite(v); }
        if (!(v instanceof Array) || !v.length) { return false; }
        for (var i = 0; i < v.length; i++) { if (typeof v[i] !== "number" || !isFinite(v[i])) { return false; } }
        return true;
    }
    function equal(a, b) {
        if (typeof a === "number" && typeof b === "number") { return Math.abs(a - b) <= 0.000001 * Math.max(1, Math.abs(a), Math.abs(b)); }
        if (!(a instanceof Array) || !(b instanceof Array) || a.length !== b.length) { return false; }
        for (var i = 0; i < a.length; i++) { if (!equal(a[i], b[i])) { return false; } } return true;
    }
    function supported(p) {
        var t = p.propertyValueType, v = PropertyValueType;
        return t === v.OneD || t === v.TwoD || t === v.ThreeD || t === v.TwoD_SPATIAL || t === v.ThreeD_SPATIAL || t === v.COLOR;
    }
    function animated(p) { return p.numKeys > 0 || p.expressionEnabled === true; }
    function live(object) { try { return object && isValid(object); } catch (e) { return false; } }
    function stack(layer) { return layer.property("ADBE Effect Parade"); }
    function fail(reason) { throw new Error(reason); }
    function errorText(e) { return e.message ? e.message : String(e); }
    function targetError(s) {
        if (!s || !live(s.comp)) { return "Target composition is unavailable. Open a composition and attach a layer."; }
        if (!live(s.layer)) { return "Target layer was deleted. Attach a layer to reset."; }
        if (s.structureIssue) { return s.structureIssue; }
        try {
            if (s.layer.containingComp !== s.comp) { return "Target is unavailable. Attach a layer to reset."; }
            var fx = stack(s.layer), count = fx ? fx.numProperties : 0, i, old, current;
            if (count !== s.effects.length) { s.structureIssue = "Effects were added or removed. Reattach the layer to reset the comparison."; return s.structureIssue; }
            for (i = 0; i < count; i++) {
                old = s.effects[i]; current = fx.property(i + 1);
                // AE can return different JavaScript wrappers for the same native effect.
                // Check retained-handle validity and index, not wrapper identity.
                if (!live(old.ref) || old.ref.propertyIndex !== i + 1 || old.ref.matchName !== old.matchName || current.matchName !== old.matchName) {
                    s.structureIssue = "Effects changed or were reordered. Reattach the layer to reset the comparison."; return s.structureIssue;
                }
            }
        } catch (e) { s.structureIssue = "Effect references changed. Reattach the layer to reset the comparison."; return s.structureIssue; }
        return "";
    }
    function visit(group, path, names, output, stats) {
        for (var i = 1; i <= group.numProperties; i++) {
            var p = group.property(i), next = path.concat([i]), nextNames = names.concat([p.matchName]);
            if (p.propertyType !== PropertyType.PROPERTY) { visit(p, next, nextNames, output, stats); continue; }
            try {
                if (animated(p)) { stats.animated++; continue; }
                if (!supported(p)) { stats.unsupported++; continue; }
                var value = p.value;
                if (!numeric(value)) { stats.unsupported++; continue; }
                output.push({path: next, names: nextNames, type: p.propertyValueType, value: clone(value)});
            } catch (e) { stats.unsupported++; }
        }
    }
    function snapshot(s, indices) {
        var result = {effects: [], animated: 0, unsupported: 0}, i, effect, entry;
        for (i = 0; i < indices.length; i++) {
            effect = stack(s.layer).property(indices[i]);
            entry = {index: indices[i], enabled: effect.enabled, canEnable: effect.canSetEnabled, values: []};
            visit(effect, [], [], entry.values, result); result.effects.push(entry);
        }
        return result;
    }
    function propertyAt(effect, saved) {
        var p = effect;
        for (var i = 0; i < saved.path.length; i++) {
            p = p.property(saved.path[i]);
            if (!p || p.matchName !== saved.names[i]) { fail("Effect controls changed. Reattach the layer to reset."); }
        }
        if (p.propertyType !== PropertyType.PROPERTY || p.propertyValueType !== saved.type) { fail("Effect controls changed. Reattach the layer to reset."); }
        return p;
    }
    function indicesAll(s) { var a = []; for (var i = 1; i <= s.effects.length; i++) { a.push(i); } return a; }
    function originalForScope(s) {
        var result = {effects: [], animated: 0, unsupported: 0};
        for (var i = 0; i < s.original.effects.length; i++) {
            for (var j = 0; j < s.indices.length; j++) {
                if (s.original.effects[i].index === s.indices[j]) { result.effects.push(s.original.effects[i]); }
            }
        }
        // Per-effect counts are kept separately so selected scope reports only its own skips.
        for (i = 0; i < s.indices.length; i++) {
            result.animated += s.originalCounts[s.indices[i] - 1].animated;
            result.unsupported += s.originalCounts[s.indices[i] - 1].unsupported;
        }
        return result;
    }
    function sameSnapshot(a, b) {
        if (!a || !b || a.effects.length !== b.effects.length) { return false; }
        for (var i = 0; i < a.effects.length; i++) {
            var x = a.effects[i], y = b.effects[i];
            if (x.index !== y.index || x.enabled !== y.enabled || x.values.length !== y.values.length) { return false; }
            for (var j = 0; j < x.values.length; j++) {
                if (x.values[j].path.join(".") !== y.values[j].path.join(".") || x.values[j].type !== y.values[j].type || !equal(x.values[j].value, y.values[j].value)) { return false; }
            }
        }
        return true;
    }
    function counts(snap) { return snap.animated + " animated skipped; " + snap.unsupported + " unsupported skipped."; }
    function setMessage(value) { message = value; }
    function hideConfirmation() {
        pending = null; confirmation.visible = false; confirmation.maximumSize.height = 0;
        root.minimumSize.height = 290;
        root.layout.layout(true); root.layout.resize();
    }
    function makeSession(comp, layer) {
        var s = {comp: comp, layer: layer, effects: [], indices: [], original: null, originalCounts: [], A: null, B: null, locked: false};
        var fx = stack(layer), i, part;
        for (i = 1; fx && i <= fx.numProperties; i++) { s.effects.push({ref: fx.property(i), matchName: fx.property(i).matchName}); }
        s.indices = indicesAll(s); s.original = {effects: [], animated: 0, unsupported: 0};
        for (i = 1; i <= s.effects.length; i++) {
            part = snapshot(s, [i]); s.original.effects.push(part.effects[0]);
            s.originalCounts.push({animated: part.animated, unsupported: part.unsupported});
            s.original.animated += part.animated; s.original.unsupported += part.unsupported;
        }
        return s;
    }
    function installSession(comp, layer) {
        if (!live(comp) || !live(layer)) { fail("The selected target is no longer available. Select one layer and try again."); }
        var next = makeSession(comp, layer); // Build completely before discarding the old comparison.
        session = next; last = "Original"; scope.selection = 0; hideConfirmation();
        setMessage("Original saved. Choose scope, then capture A. " + counts(originalForScope(session)));
    }
    function guard(action) {
        return function () {
            if (busy) { return; } busy = true;
            actionError = "";
            try { action(); } catch (e) { actionError = errorText(e); setMessage(actionError); }
            finally { busy = false; refresh(); }
        };
    }
    function requireTarget() {
        var issue = targetError(session); if (issue) { fail(issue); }
        if (pending) { fail("Replace or cancel the pending session first."); }
    }
    attach.onClick = guard(function () {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem) || comp.selectedLayers.length !== 1) { fail("Select exactly one layer in an active composition."); }
        var layer = comp.selectedLayers[0];
        if (session && (session.A || session.B)) {
            pending = {comp: comp, layer: layer};
            confirmation.maximumSize.height = 36; confirmation.visible = true;
            root.minimumSize.height = 326;
            if (root.size.height < 326) { root.size.height = 326; }
            setMessage("Replace this session? A, B and Original will be cleared. No settings will be applied.");
            root.layout.layout(true); root.layout.resize();
        } else { installSession(comp, layer); }
    });
    replace.onClick = guard(function () { if (pending) { installSession(pending.comp, pending.layer); } });
    cancel.onClick = guard(function () { hideConfirmation(); setMessage("Session kept."); });
    scope.onChange = guard(function () {
        if (!session || session.locked) { return; }
        requireTarget();
        if (scope.selection.index === 0) { session.indices = indicesAll(session); return; }
        var selected = session.layer.selectedProperties, picked = {}, indices = [], i, p;
        for (i = 0; i < selected.length; i++) {
            p = selected[i];
            while (p && !p.isEffect && p.parentProperty) { p = p.parentProperty; }
            if (p && p.isEffect) { picked[p.propertyIndex] = true; }
        }
        for (i = 1; i <= session.effects.length; i++) { if (picked[i]) { indices.push(i); } }
        if (!indices.length) { scope.selection = 0; fail("Select effects or their controls on the attached layer, then choose Selected Effects."); }
        session.indices = indices; session.locked = true;
        setMessage(indices.length + " selected effects locked. Reattach to reset scope. " + counts(originalForScope(session)));
    });
    function capture(name) {
        requireTarget(); if (!session.indices.length) { fail("No effects in scope. Add effects, then reattach the layer."); }
        var saved = snapshot(session, session.indices);
        session[name] = saved; session.locked = true; last = name;
        setMessage("Captured " + name + ". " + counts(saved));
    }
    function apply(name) {
        requireTarget();
        if (session.layer.locked) { fail("Unlock the attached layer before applying a version."); }
        var saved = name === "Original" ? originalForScope(session) : session[name];
        if (!saved) { fail("Capture " + name + " first."); }
        var writes = [], switches = [], skipped = 0, i, j, effect, entry, p;
        // Resolve and read every control before writing anything. Never overwrite new animation.
        for (i = 0; i < saved.effects.length; i++) {
            entry = saved.effects[i]; effect = stack(session.layer).property(entry.index);
            if (entry.canEnable && effect.canSetEnabled) { switches.push({effect: effect, before: effect.enabled, after: entry.enabled}); }
            for (j = 0; j < entry.values.length; j++) {
                p = propertyAt(effect, entry.values[j]);
                if (animated(p)) { skipped++; continue; }
                writes.push({property: p, before: clone(p.value), after: entry.values[j].value});
            }
        }
        var writeCount = 0, switchCount = 0, rollbackFailed = false;
        app.beginUndoGroup(TITLE + " - " + name);
        try {
            for (i = 0; i < writes.length; i++) { writeCount = i + 1; writes[i].property.setValue(clone(writes[i].after)); }
            for (i = 0; i < switches.length; i++) { switchCount = i + 1; switches[i].effect.enabled = switches[i].after; }
        } catch (e) {
            for (i = switchCount - 1; i >= 0; i--) { try { switches[i].effect.enabled = switches[i].before; } catch (r1) { rollbackFailed = true; } }
            for (i = writeCount - 1; i >= 0; i--) { try { writes[i].property.setValue(clone(writes[i].before)); } catch (r2) { rollbackFailed = true; } }
            fail("Could not apply " + name + ": " + errorText(e) + (rollbackFailed ? " Use Edit > Undo to recover the previous settings." : " Previous values restored."));
        } finally { app.endUndoGroup(); }
        last = name;
        setMessage("Applied " + name + ". " + counts(saved) + (skipped ? " " + skipped + " newly animated controls also skipped." : ""));
    }
    captureA.onClick = guard(function () { capture("A"); }); captureB.onClick = guard(function () { capture("B"); });
    aButton.onClick = guard(function () { apply("A"); }); bButton.onClick = guard(function () { apply("B"); });
    restore.onClick = guard(function () { apply("Original"); });
    refreshButton.onClick = function () { refresh(); };

    function updateSlot(button, snap, active, available) {
        var state = snap ? (active ? "ACTIVE" : "Saved") : "Empty";
        var changed = button.stateLabel !== state || button.isActive !== active || button.enabled !== (available && !!snap);
        button.stateLabel = state; button.isActive = active; button.enabled = available && !!snap;
        button.text = button.slotLabel + "\n" + state;
        button.helpTip = snap ? "Apply version " + button.slotLabel : "Capture version " + button.slotLabel + " first";
        if (changed) { try { button.notify("onDraw"); } catch (ignore) {} }
    }
    function refresh() {
        if (stopped || busy) { return; }
        var issue = session ? targetError(session) : "", available = !!session && !issue && !pending;
        var active = "", current, original, state = "No comparison yet";
        if (session && !issue) {
            try {
                current = snapshot(session, session.indices); original = originalForScope(session);
                if (last === "A" && sameSnapshot(current, session.A)) { active = "A"; }
                else if (last === "B" && sameSnapshot(current, session.B)) { active = "B"; }
                else if (last === "Original" && sameSnapshot(current, original)) { active = "Original"; }
                else if (sameSnapshot(current, session.A)) { active = "A"; }
                else if (sameSnapshot(current, session.B)) { active = "B"; }
                else if (sameSnapshot(current, original)) { active = "Original"; }
                else { active = "Modified"; }
                state = session.indices.length + " effects \u00b7 " + (session.A && session.B ? "Both versions saved" : session.A ? "A saved" : session.B ? "B saved" : "No versions saved");
                state += " \u00b7 " + active;
                target.text = session.comp.name;
                target.helpTip = target.text;
            } catch (e) { issue = "Cannot read effect controls. Reattach the layer to reset."; available = false; }
        }
        if (!session) { target.text = "No layer attached"; }
        else if (issue) { target.text = "Target unavailable"; state = "Comparison paused"; }
        updateSlot(aButton, session && session.A, active === "A", available && !session.layer.locked);
        updateSlot(bButton, session && session.B, active === "B", available && !session.layer.locked);
        captureA.enabled = captureB.enabled = available && session.indices.length > 0;
        restore.enabled = available && session.indices.length > 0 && !session.layer.locked;
        scope.enabled = available && !session.locked;
        attach.text = session && live(session.layer) ? session.layer.name : "Use Selected Layer";
        attach.helpTip = "Attach the selected layer. Current target: " + attach.text;
        var notice = issue || actionError || (pending ? "Replace session or cancel" : "");
        if (available && session.layer.locked) { notice = "Unlock layer to apply"; }
        summary.text = notice;
        var showNotice = !!notice;
        if (summary.visible !== showNotice) {
            summary.visible = showNotice;
            summary.maximumSize.height = showNotice ? 20 : 0;
            root.layout.layout(true); root.layout.resize();
        }
        summary.helpTip = (notice ? notice + "\n" : "") + state + "\n" + message;
        refreshButton.helpTip = "Refresh target and settings.\n" + summary.helpTip;
    }
    root.onResizing = root.onResize = function () { this.layout.resize(); };
    root.addEventListener("mouseover", function () { refresh(); });
    // A single owned timer survives AE's idle periods; it never applies a snapshot.
    if (!$.global.__effectABPanels) { $.global.__effectABPanels = {}; }
    var key = "p" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000000);
    $.global.__effectABPanels[key] = function () { try { refresh(); } catch (ignore) {} };
    root.onClose = function () {
        stopped = true; if (timer !== null) { try { app.cancelTask(timer); } catch (ignore) {} }
        delete $.global.__effectABPanels[key]; return true;
    };
    hideConfirmation(); refresh(); root.layout.layout(true); root.layout.resize();
    try { timer = app.scheduleTask("if ($.global.__effectABPanels && $.global.__effectABPanels['" + key + "']) { $.global.__effectABPanels['" + key + "'](); }", 1200, true); }
    catch (timerError) { setMessage("Automatic refresh unavailable. Use Refresh to detect manual changes."); refresh(); }
    if (root instanceof Window) { root.center(); root.show(); }
})(this);
