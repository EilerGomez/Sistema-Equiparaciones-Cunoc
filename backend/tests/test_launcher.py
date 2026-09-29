import importlib.util
import json
import queue
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


script = Path(__file__).resolve().parents[1] / "launcher.py"
spec = importlib.util.spec_from_file_location("equiparacion_launcher", script)
launcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launcher)


class LauncherTests(unittest.TestCase):
    def test_identifies_only_listener_on_port_3001(self):
        output = """TCP    127.0.0.1:13001    0.0.0.0:0    LISTENING    222
TCP    [::]:3001    [::]:0    LISTENING    333
TCP    127.0.0.1:3001    127.0.0.1:6000    ESTABLISHED    444"""
        with patch.object(launcher.subprocess, "run", return_value=SimpleNamespace(stdout=output)):
            self.assertEqual(launcher.listening_pid(), 333)

    def test_saved_pid_requires_same_entry_and_listener(self):
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory) / "state.json"
            state.write_text(json.dumps({"pid": 333, "entry": str(launcher.ENTRY)}), encoding="utf-8")
            with patch.object(launcher, "STATE", state), patch.object(launcher, "listening_pid", return_value=333), patch.object(launcher, "process_command", return_value=f'node.exe "{launcher.ENTRY}"'), patch.object(launcher, "health_ok", return_value=True):
                self.assertEqual(launcher.saved_pid(), 333)
            with patch.object(launcher, "STATE", state), patch.object(launcher, "listening_pid", return_value=999), patch.object(launcher, "process_command") as command:
                self.assertIsNone(launcher.saved_pid())
                command.assert_not_called()

    def test_stop_does_not_kill_foreign_listener(self):
        app = launcher.Launcher.__new__(launcher.Launcher)
        app.process = None
        app.events = queue.Queue()
        with patch.object(launcher, "saved_pid", return_value=None), patch.object(launcher, "port_is_open", return_value=True), patch.object(app, "kill_owned") as kill:
            app.stop_worker()
            kill.assert_not_called()
            kind, text = app.events.get_nowait()
            self.assertEqual(kind, "error")
            self.assertIn("otro proceso", text)


if __name__ == "__main__":
    unittest.main()
