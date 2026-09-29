"""Lanzador de Windows para el Sistema de Equiparacion (puerto 3001)."""

import json
import os
import queue
import re
import shutil
import socket
import subprocess
import sys
import threading
import time
import tkinter as tk
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path
from tkinter import messagebox


PORT = 3001
URL = f"http://127.0.0.1:{PORT}"
FLAGS = getattr(subprocess, "CREATE_NO_WINDOW", 0)


def base_dir():
    return Path(sys.executable if getattr(sys, "frozen", False) else __file__).resolve().parent


BASE = base_dir()
ENTRY = BASE / "src" / "app.js"
STATE = BASE / ".equiparacion_launcher.json"
LOG = BASE / "logs" / "launcher.log"
ICON = BASE / "launcher.ico"


def listening_pid():
    """Devuelve el PID que escucha exactamente en el puerto TCP 3001."""
    try:
        result = subprocess.run(
            ["netstat", "-ano", "-p", "TCP"], capture_output=True,
            text=True, errors="replace", timeout=8, creationflags=FLAGS,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    expression = re.compile(
        rf"^\s*TCP\s+\S+:{PORT}\s+\S+\s+(?:LISTENING|ESCUCHANDO)\s+(\d+)\s*$",
        re.IGNORECASE,
    )
    for line in result.stdout.splitlines():
        match = expression.match(line)
        if match:
            return int(match.group(1))
    return None


def port_is_open():
    try:
        with socket.create_connection(("127.0.0.1", PORT), timeout=0.4):
            return True
    except OSError:
        return False


def health_ok():
    try:
        with urllib.request.urlopen(f"{URL}/api/health", timeout=1) as response:
            data = json.load(response)
        return data.get("status") == "ok" and data.get("sistema") == "equiparacion"
    except (OSError, ValueError, urllib.error.URLError):
        return False


def process_command(pid):
    command = f'(Get-CimInstance Win32_Process -Filter "ProcessId = {pid}").CommandLine'
    try:
        result = subprocess.run(
            ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", command],
            capture_output=True, text=True, errors="replace", timeout=10,
            creationflags=FLAGS,
        )
        return result.stdout.strip() if result.returncode == 0 else ""
    except (OSError, subprocess.TimeoutExpired):
        return ""


def saved_pid():
    try:
        data = json.loads(STATE.read_text(encoding="utf-8"))
        pid = int(data["pid"])
        if data.get("entry") != str(ENTRY) or pid < 1 or listening_pid() != pid:
            return None
        command = process_command(pid).casefold().replace("\\", "/")
        entry = str(ENTRY).casefold().replace("\\", "/")
        return pid if entry in command and health_ok() else None
    except (OSError, ValueError, KeyError, TypeError):
        return None


def forget_state():
    STATE.unlink(missing_ok=True)


def check_files():
    if os.name != "nt":
        raise RuntimeError("Este lanzador esta preparado para Windows.")
    if not (BASE / "package.json").is_file() or not ENTRY.is_file():
        raise RuntimeError(f"Coloca el launcher.exe dentro de la carpeta backend:\n{BASE}")
    if not (BASE / ".env").is_file():
        raise RuntimeError("Falta backend/.env. Configura la conexion a MySQL antes de iniciar.")
    if not (BASE / "node_modules").is_dir():
        raise RuntimeError("Faltan las dependencias de Node. Ejecuta npm run instalar desde la raiz del proyecto.")
    if not (BASE / "public" / "index.html").is_file():
        raise RuntimeError("Falta el frontend compilado. Ejecuta npm run build desde la raiz del proyecto.")
    node = shutil.which("node.exe") or shutil.which("node")
    if not node:
        raise RuntimeError("No se encontro Node.js en PATH. Instalalo y abre una consola nueva.")
    return node


def log_tail():
    try:
        return LOG.read_bytes()[-1600:].decode("utf-8", errors="replace").strip()
    except OSError:
        return ""


class Launcher:
    def __init__(self):
        self.process = None
        self.events = queue.Queue()
        self.busy = False
        self.closing = False

        self.root = tk.Tk()
        self.root.title("Sistema de Equiparacion")
        self.root.geometry("400x235")
        self.root.resizable(False, False)
        if ICON.is_file():
            try:
                self.root.iconbitmap(str(ICON))
            except tk.TclError:
                pass

        tk.Label(self.root, text="Sistema de Equiparacion", font=("Segoe UI", 16, "bold")).pack(pady=(23, 5))
        self.status = tk.StringVar(value="Puerto 3001 · Sistema detenido")
        tk.Label(self.root, textvariable=self.status, font=("Segoe UI", 10), fg="#37645c").pack(pady=(0, 13))
        self.start_button = tk.Button(self.root, text="Encender programa", width=27, height=2, command=self.start)
        self.start_button.pack(pady=4)
        self.stop_button = tk.Button(self.root, text="Apagar sistema", width=27, height=2, command=self.stop)
        self.stop_button.pack(pady=4)
        self.root.protocol("WM_DELETE_WINDOW", self.close)
        self.root.after(100, self.drain_events)

    def set_busy(self, value, label):
        self.busy = value
        self.status.set(label)
        state = tk.DISABLED if value else tk.NORMAL
        self.start_button.configure(state=state)
        self.stop_button.configure(state=state)

    def background(self, action):
        threading.Thread(target=action, daemon=True).start()

    def start(self):
        if self.busy:
            return
        self.set_busy(True, "Iniciando servidor...")
        self.background(self.start_worker)

    def start_worker(self):
        launched_here = False
        try:
            node = check_files()
            if self.process and self.process.poll() is None:
                if health_ok():
                    self.events.put(("ready", "El sistema ya estaba encendido."))
                    return
                raise RuntimeError("El proceso se esta iniciando; espera unos segundos.")
            if saved_pid():
                self.events.put(("ready", "El sistema ya estaba encendido."))
                return
            if port_is_open() or listening_pid():
                raise RuntimeError("El puerto 3001 esta ocupado por otro proceso. Cierralo antes de iniciar el sistema.")
            forget_state()
            LOG.parent.mkdir(exist_ok=True)
            with LOG.open("ab", buffering=0) as stream:
                stream.write(b"\n--- Encendiendo Sistema de Equiparacion ---\n")
                env = {**os.environ, "PORT": str(PORT)}
                self.process = subprocess.Popen(
                    [node, str(ENTRY)], cwd=BASE, env=env,
                    stdout=stream, stderr=subprocess.STDOUT, creationflags=FLAGS,
                )
                launched_here = True
            STATE.write_text(json.dumps({"pid": self.process.pid, "entry": str(ENTRY)}), encoding="utf-8")
            deadline = time.monotonic() + 30
            while time.monotonic() < deadline:
                if self.process.poll() is not None:
                    forget_state()
                    raise RuntimeError("El servidor termino al arrancar. Revisa MySQL y backend/.env.\n\n" + log_tail())
                if health_ok() and listening_pid() == self.process.pid:
                    self.events.put(("ready", "Sistema encendido en el puerto 3001."))
                    return
                time.sleep(0.35)
            self.kill_owned(self.process.pid)
            forget_state()
            raise RuntimeError("El servidor no respondio en 30 segundos.\n\n" + log_tail())
        except Exception as error:
            if launched_here and self.process and self.process.poll() is None:
                try:
                    self.kill_owned(self.process.pid)
                except Exception:
                    pass
                self.process = None
                forget_state()
            self.events.put(("error", str(error)))

    @staticmethod
    def kill_owned(pid):
        result = subprocess.run(
            ["taskkill", "/F", "/T", "/PID", str(pid)],
            capture_output=True, creationflags=FLAGS, timeout=12,
        )
        if result.returncode != 0 and listening_pid() == pid:
            raise RuntimeError(f"No se pudo detener el proceso {pid}. Revisa los permisos de Windows.")

    def stop(self):
        if self.busy:
            return
        self.set_busy(True, "Apagando servidor...")
        self.background(self.stop_worker)

    def stop_worker(self):
        try:
            pid = self.process.pid if self.process and self.process.poll() is None else saved_pid()
            if pid:
                self.kill_owned(pid)
                deadline = time.monotonic() + 8
                while listening_pid() == pid and time.monotonic() < deadline:
                    time.sleep(0.2)
                if listening_pid() == pid:
                    raise RuntimeError("El proceso aun escucha en el puerto 3001. Revisa los permisos de Windows.")
                self.process = None
                forget_state()
                if port_is_open() or listening_pid():
                    raise RuntimeError("El sistema se apago, pero otro proceso volvio a ocupar el puerto 3001.")
                self.events.put(("stopped", "Sistema apagado correctamente."))
            elif port_is_open() or listening_pid():
                self.events.put(("error", "El puerto 3001 pertenece a otro proceso. Este lanzador no lo cerrara."))
            else:
                forget_state()
                self.events.put(("stopped", "El sistema ya estaba apagado."))
        except Exception as error:
            self.events.put(("error", str(error)))

    def close(self):
        if self.busy:
            return
        self.closing = True
        self.stop()

    def drain_events(self):
        try:
            while True:
                kind, text = self.events.get_nowait()
                if kind == "ready":
                    self.set_busy(False, "Puerto 3001 · Sistema encendido")
                    webbrowser.open(URL)
                    if text.startswith("El sistema ya"):
                        messagebox.showinfo("Sistema de Equiparacion", text)
                else:
                    self.set_busy(False, "Puerto 3001 · Sistema detenido" if kind == "stopped" else "Revisa el inicio del sistema")
                    if not self.closing:
                        (messagebox.showinfo if kind == "stopped" else messagebox.showerror)("Sistema de Equiparacion", text)
                if self.closing:
                    self.root.destroy()
                    return
        except queue.Empty:
            self.root.after(100, self.drain_events)

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    Launcher().run()
