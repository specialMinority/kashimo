#!/usr/bin/env python3
"""Capture native tab regressions on a NEW, isolated Android CI emulator.

Usage: python scripts/check-android-tabs.py before.apk after.apk outputdir
Requires adb and Pillow. Refuses physical devices and a preinstalled Kashimo.
Installs the baseline, navigates four tabs without editing records, updates with
`adb install -r` (no data clear), and repeats at font scales 1.0 and 1.3.
Screenshots/XML/crops are evidence for visual review, not a real-device claim.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import traceback
import xml.etree.ElementTree as ET

from PIL import Image, ImageDraw

PACKAGE = "com.kashimo.app"
TABS = (("home", "ホーム"), ("list", "記録"), ("add", "追加"), ("settings", "設定"))
BOUND_PATTERN = re.compile(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]")


def bounds(node):
    match = BOUND_PATTERN.fullmatch(node.get("bounds", ""))
    if not match:
        return None
    box = tuple(map(int, match.groups()))
    return box if box[2] > box[0] and box[3] > box[1] else None


def sha256(path):
    result = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


class NativeTabs:
    def __init__(self, before, after, output, serial=None):
        self.before, self.after, self.output = before, after, output
        self.serial = serial
        self.output.mkdir(parents=True, exist_ok=True)
        self.transcript = self.output / "adb-transcript.log"
        self.original_font_scale = None
        self.safe_emulator = False
        self.report = {
            "environment": "fresh isolated Android CI emulator; NOT a physical device",
            "data_policy": "No transaction creation, deletion, clear, uninstall, or restore; update uses install -r.",
            "before_apk": {"file": before.name, "sha256": sha256(before)},
            "after_apk": {"file": after.name, "sha256": sha256(after)},
            "captures": [], "passed": False,
            "visual_review": "Review tab-bars-comparison.png, annotated screenshots and per-tab icon crops. Geometry and pixel indicators do not alone prove visual correctness.",
        }

    def adb(self, *arguments, timeout=35, check=True, binary=False):
        command = ["adb"] + (["-s", self.serial] if self.serial else []) + list(arguments)
        result = subprocess.run(command, capture_output=True, timeout=timeout)
        with self.transcript.open("a", encoding="utf-8") as log:
            log.write("$ " + " ".join(command) + "\n")
            log.write("exit=" + str(result.returncode) + "\n")
            if not binary:
                log.write(result.stdout.decode("utf-8", errors="replace"))
            log.write(result.stderr.decode("utf-8", errors="replace") + "\n")
        if check and result.returncode:
            raise RuntimeError("adb " + " ".join(arguments) + ": " + result.stderr.decode("utf-8", errors="replace") + result.stdout.decode("utf-8", errors="replace"))
        return result.stdout if binary else result.stdout.decode("utf-8", errors="replace").strip()

    def choose_emulator(self):
        if not self.serial:
            devices = self.adb("devices")
            connected = [line.split()[0] for line in devices.splitlines()[1:] if line.endswith("\tdevice")]
            if len(connected) != 1:
                raise RuntimeError("Expected exactly one isolated emulator; choose one with --serial. Found: " + str(connected))
            self.serial = connected[0]
        self.adb("wait-for-device", timeout=120)
        if self.adb("shell", "getprop", "ro.kernel.qemu") != "1":
            raise RuntimeError("Refusing to modify a non-emulator Android device.")
        self.safe_emulator = True
        installed = self.adb("shell", "pm", "list", "packages", PACKAGE)
        if "package:" + PACKAGE in installed.splitlines():
            raise RuntimeError("Kashimo already exists. Use a NEW isolated emulator; this script never clears or uninstalls app data.")
        deadline = time.monotonic() + 120
        while self.adb("shell", "getprop", "sys.boot_completed") != "1":
            if time.monotonic() > deadline:
                raise RuntimeError("Emulator did not finish booting.")
            time.sleep(2)
        self.original_font_scale = self.adb("shell", "settings", "get", "system", "font_scale")
        self.report["device"] = {
            "serial": self.serial,
            "model": self.adb("shell", "getprop", "ro.product.model"),
            "sdk": self.adb("shell", "getprop", "ro.build.version.sdk"),
            "size": self.adb("shell", "wm", "size"),
            "density": self.adb("shell", "wm", "density"),
            "original_font_scale": self.original_font_scale,
        }
        self.adb("shell", "input", "keyevent", "KEYCODE_WAKEUP")
        self.adb("shell", "wm", "dismiss-keyguard", check=False)
        self.adb("logcat", "-c")

    def hierarchy(self):
        self.adb("shell", "uiautomator", "dump", "/sdcard/kashimo-tab-check.xml", timeout=20)
        text = self.adb("shell", "cat", "/sdcard/kashimo-tab-check.xml")
        xml_start = text.find("<?xml")
        if xml_start < 0:
            xml_start = text.find("<hierarchy")
        if xml_start < 0:
            raise RuntimeError("uiautomator did not produce XML.")
        text = text[xml_start:]
        return text, ET.fromstring(text)

    def locate_tabs(self, tree):
        all_nodes = list(tree.iter("node"))
        height = max((bounds(node)[3] for node in all_nodes if bounds(node)), default=0)
        parents = {child: parent for parent in tree.iter() for child in parent}
        found = {}
        for slug, label in TABS:
            candidates = []
            for node in all_nodes:
                desc, text = node.get("content-desc", ""), node.get("text", "")
                if not (desc == label or text == label or desc.startswith(label + ",")):
                    continue
                target = node
                while target.get("clickable") != "true" and target in parents:
                    parent = parents[target]
                    if parent.tag != "node":
                        break
                    target = parent
                box = bounds(target)
                if not box or box[1] < height * 0.5 or box[2] - box[0] > height * 0.5:
                    continue
                score = (target.get("clickable") == "true", desc == label, box[1], -(box[2] - box[0]) * (box[3] - box[1]))
                candidates.append((score, target))
            if candidates:
                found[slug] = max(candidates, key=lambda item: item[0])[1]
        if len(found) != len(TABS):
            raise RuntimeError("Could not find all four bottom tabs by Japanese accessibility labels: " + str(list(found)))
        boxes = [bounds(found[slug]) for slug, _ in TABS]
        if any(boxes[index][2] > boxes[index + 1][0] for index in range(len(boxes) - 1)):
            raise RuntimeError("Tab accessibility bounds overlap or are in an unexpected order: " + str(boxes))
        return found

    def wait_tabs(self, timeout=65):
        deadline, last_error = time.monotonic() + timeout, None
        while time.monotonic() < deadline:
            try:
                text, tree = self.hierarchy()
                return text, tree, self.locate_tabs(tree)
            except (RuntimeError, ET.ParseError, subprocess.TimeoutExpired) as error:
                last_error = error
                time.sleep(1)
        raise RuntimeError("Tabs did not become accessible: " + str(last_error))

    def launch(self, scale):
        self.adb("shell", "am", "force-stop", PACKAGE)
        self.adb("shell", "settings", "put", "system", "font_scale", str(scale))
        if self.adb("shell", "settings", "get", "system", "font_scale") != str(scale):
            raise RuntimeError("Failed to apply requested font scale.")
        self.adb("shell", "monkey", "-p", PACKAGE, "-c", "android.intent.category.LAUNCHER", "1", timeout=30)
        self.wait_tabs()
        # Ionicons loads its bundled font asynchronously after native navigation mounts.
        time.sleep(2)

    def screenshot(self, path):
        png = self.adb("exec-out", "screencap", "-p", binary=True)
        path.write_bytes(png)
        with Image.open(path) as image:
            image.verify()

    def capture(self, phase, slug, scale):
        _, _, tabs = self.wait_tabs()
        box = bounds(tabs[slug])
        self.adb("shell", "input", "tap", str((box[0] + box[2]) // 2), str((box[1] + box[3]) // 2))
        time.sleep(0.7)
        xml_text, tree, tabs = self.wait_tabs()
        selected = [name for name, node in tabs.items() if node.get("selected") == "true" or node.get("checked") == "true"]
        if selected and slug not in selected:
            raise RuntimeError("Navigation selected " + str(selected) + " instead of " + slug)
        prefix = self.output / (phase + "-" + slug)
        prefix.with_suffix(".xml").write_text(xml_text, encoding="utf-8")
        self.screenshot(prefix.with_suffix(".png"))
        image = Image.open(prefix.with_suffix(".png")).convert("RGB")
        annotation = image.copy()
        draw = ImageDraw.Draw(annotation)
        metadata = {"phase": phase, "screen": slug, "font_scale": scale, "selected_tabs": selected, "tabs": {}}
        all_boxes = []
        for tab_name, label in TABS:
            node, tab_box = tabs[tab_name], bounds(tabs[tab_name])
            all_boxes.append(tab_box)
            label_boxes = [bounds(child) for child in node.iter("node") if child.get("text") == label and bounds(child)]
            # Some RN accessibility nodes merge the label into the tab, exposing no
            # Text child. In that case the top 62% is an explicitly estimated crop.
            separate_labels = [b for b in label_boxes if b != tab_box and b[1] > tab_box[1]]
            label_top = min((b[1] for b in separate_labels), default=round(tab_box[1] + (tab_box[3] - tab_box[1]) * 0.62))
            icon_box = (tab_box[0], tab_box[1], tab_box[2], max(tab_box[1] + 1, label_top))
            image.crop(tab_box).save(self.output / (phase + "-" + slug + "-tab-" + tab_name + ".png"))
            image.crop(icon_box).save(self.output / (phase + "-" + slug + "-icon-" + tab_name + ".png"))
            draw.rectangle(tab_box, outline="#dc2626", width=2)
            draw.line((tab_box[0], label_top, tab_box[2], label_top), fill="#2563eb", width=2)
            draw.text((tab_box[0] + 3, tab_box[1] + 2), tab_name, fill="#dc2626")
            metadata["tabs"][tab_name] = {"bounds": tab_box, "icon_crop": icon_box, "label_bounds": separate_labels, "icon_crop_is_estimate": not bool(separate_labels)}
        bar_box = (min(b[0] for b in all_boxes), min(b[1] for b in all_boxes), max(b[2] for b in all_boxes), max(b[3] for b in all_boxes))
        image.crop(bar_box).save(self.output / (phase + "-" + slug + "-tabbar.png"))
        annotation.save(self.output / (phase + "-" + slug + "-annotated.png"))
        metadata["tabbar_bounds"] = bar_box
        self.report["captures"].append(metadata)
        self.write_report()
        print("Captured " + phase + " / " + slug, flush=True)

    def phase(self, name, scale):
        self.launch(scale)
        for slug, _ in TABS:
            self.capture(name, slug, scale)
        (self.output / (name + "-logcat.txt")).write_text(self.adb("logcat", "-d", "-t", "3000"), encoding="utf-8")

    def montage(self):
        panels = []
        for entry in self.report["captures"]:
            name = entry["phase"] + "-" + entry["screen"]
            with Image.open(self.output / (name + "-tabbar.png")) as original:
                crop = original.convert("RGB")
                width = min(1000, crop.width)
                height = max(1, round(crop.height * width / crop.width))
                panel = Image.new("RGB", (1000, height + 28), "#f0f0f0")
                ImageDraw.Draw(panel).text((10, 8), name + " | font scale " + str(entry["font_scale"]), fill="#111111")
                panel.paste(crop.resize((width, height), Image.Resampling.LANCZOS), (0, 28))
                panels.append(panel)
        if panels:
            montage = Image.new("RGB", (1000, sum(panel.height for panel in panels)), "white")
            y = 0
            for panel in panels:
                montage.paste(panel, (0, y))
                y += panel.height
            montage.save(self.output / "tab-bars-comparison.png")

    def write_report(self):
        (self.output / "report.json").write_text(json.dumps(self.report, ensure_ascii=False, indent=2), encoding="utf-8")

    def preserve_failure(self):
        if self.safe_emulator:
            for name, callback in (
                ("screenshot", lambda: self.screenshot(self.output / "failure.png")),
                ("logcat", lambda: (self.output / "failure-logcat.txt").write_text(self.adb("logcat", "-d", "-t", "4000"), encoding="utf-8")),
                ("hierarchy", lambda: (self.output / "failure.xml").write_text(self.hierarchy()[0], encoding="utf-8")),
            ):
                try:
                    callback()
                except Exception as error:
                    self.report.setdefault("diagnostic_errors", {})[name] = str(error)

    def run(self):
        try:
            self.choose_emulator()
            self.adb("install", str(self.before), timeout=180)
            self.phase("before", 1.0)
            self.adb("install", "-r", str(self.after), timeout=180)
            self.report["in_place_update"] = "adb install -r succeeded; no data clear or uninstall"
            self.phase("after", 1.0)
            self.phase("after-large-font", 1.3)
            self.report["passed"] = True
            self.report["scope_of_pass"] = "Baseline and update installed; four tabs navigated and captured at each scale. Visual correctness requires reviewing the evidence."
        except Exception as error:
            self.report["error"] = str(error)
            (self.output / "failure-traceback.txt").write_text(traceback.format_exc(), encoding="utf-8")
            self.preserve_failure()
        finally:
            if self.safe_emulator and self.original_font_scale is not None:
                try:
                    if self.original_font_scale == "null":
                        self.adb("shell", "settings", "delete", "system", "font_scale")
                    else:
                        self.adb("shell", "settings", "put", "system", "font_scale", self.original_font_scale)
                except Exception as error:
                    self.report["font_scale_restore_error"] = str(error)
                    self.report["passed"] = False
            try:
                self.montage()
            except Exception as error:
                self.report["montage_error"] = str(error)
                self.report["passed"] = False
            self.write_report()
        print(json.dumps({"passed": self.report["passed"], "captures": len(self.report["captures"]), "output": str(self.output), "error": self.report.get("error")}, ensure_ascii=False), flush=True)
        return 0 if self.report["passed"] else 1


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("before_apk", type=Path)
    parser.add_argument("after_apk", type=Path)
    parser.add_argument("outputdir", type=Path)
    parser.add_argument("--serial", default=os.environ.get("ANDROID_SERIAL"))
    args = parser.parse_args()
    for path in (args.before_apk, args.after_apk):
        if not path.is_file():
            parser.error("APK does not exist: " + str(path))
    return NativeTabs(args.before_apk.resolve(), args.after_apk.resolve(), args.outputdir.resolve(), args.serial).run()


if __name__ == "__main__":
    sys.exit(main())
