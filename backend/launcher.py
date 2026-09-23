import subprocess
import webbrowser
import tkinter as tk
from tkinter import messagebox
import os
import sys
import time

NODE_PROCESS = None


def get_base_dir():
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)

    return os.path.dirname(os.path.abspath(__file__))


BASE_DIR = get_base_dir()


def run_hidden(command, shell=False):
    return subprocess.run(
        command,
        shell=shell,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NO_WINDOW
    )


def matar_proceso(process):
    if process and process.poll() is None:
        run_hidden(
            ["taskkill", "/F", "/T", "/PID", str(process.pid)]
        )


def liberar_puerto_3000():
    comando = 'for /f "tokens=5" %a in (\'netstat -ano ^| findstr :3000\') do taskkill /F /PID %a'
    run_hidden(comando, shell=True)


def iniciar():
    global NODE_PROCESS

    if NODE_PROCESS and NODE_PROCESS.poll() is None:
        messagebox.showinfo("Sistema", "El sistema ya esta iniciado.")
        return

    package_json = os.path.join(BASE_DIR, "package.json")

    if not os.path.exists(package_json):
        messagebox.showerror(
            "Error",
            f"No se encontro package.json en:\n{BASE_DIR}\n\nColoca el launcher.exe en la raiz del backend."
        )
        return

    try:
        liberar_puerto_3000()

        NODE_PROCESS = subprocess.Popen(
            ["npm.cmd", "start"],
            cwd=BASE_DIR,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW
        )

        time.sleep(4)
        webbrowser.open("http://localhost:3000")

    except Exception as e:
        messagebox.showerror("Error", f"No se pudo iniciar el sistema:\n{e}")


def apagar():
    global NODE_PROCESS

    if NODE_PROCESS and NODE_PROCESS.poll() is None:
        matar_proceso(NODE_PROCESS)
        NODE_PROCESS = None
        liberar_puerto_3000()
        messagebox.showinfo("Sistema", "Sistema apagado correctamente.")
    else:
        liberar_puerto_3000()
        messagebox.showinfo("Sistema", "Proceso liberado correctamente.")


def cerrar():
    apagar()
    root.destroy()


root = tk.Tk()
root.title("Sistema de Equivalencias")
root.geometry("360x180")
root.resizable(False, False)

titulo = tk.Label(
    root,
    text="Sistema de Equivalencias",
    font=("Arial", 16, "bold")
)
titulo.pack(pady=20)

btn_iniciar = tk.Button(
    root,
    text="Iniciar programa",
    width=25,
    height=2,
    command=iniciar
)
btn_iniciar.pack(pady=5)

btn_apagar = tk.Button(
    root,
    text="Apagar programa",
    width=25,
    height=2,
    command=apagar
)
btn_apagar.pack(pady=5)

root.protocol("WM_DELETE_WINDOW", cerrar)
root.mainloop()